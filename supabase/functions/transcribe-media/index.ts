import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Connection": "keep-alive",
    },
  });
}

function formatStamp(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mmss = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return hours ? `${String(hours).padStart(2, "0")}:${mmss}` : mmss;
}

function normalizeText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function splitTranscriptText(text: string) {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .map((line, index) => `${formatStamp(index * 12)} ${line}`)
    .join("\n");
}

function transcriptFromOpenAI(payload: Record<string, unknown>) {
  const segments = payload.segments as Array<{ start?: number; text?: string }> | undefined;
  if (segments?.length) {
    return segments
      .map((segment) => {
        const text = normalizeText(segment.text || "");
        return text ? `${formatStamp(segment.start || 0)} ${text}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return splitTranscriptText(String(payload.text || ""));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST." }, 405);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "OPENAI_API_KEY is missing in Supabase secrets." }, 500);
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const fileName = String(formData.get("fileName") || "podclipz-upload.mp4");

    if (!(file instanceof File)) {
      return jsonResponse({ error: "Upload an audio or video file." }, 400);
    }

    if (!/^(audio|video)\//.test(file.type)) {
      return jsonResponse({ error: "Only audio and video uploads can be transcribed." }, 400);
    }

    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      return jsonResponse({ error: "File is over the 25 MB upload limit for this PodClipz transcription endpoint." }, 413);
    }

    const openaiForm = new FormData();
    openaiForm.append("file", file, fileName);
    openaiForm.append("model", Deno.env.get("OPENAI_TRANSCRIBE_MODEL") || "gpt-4o-transcribe");
    openaiForm.append("response_format", "json");
    openaiForm.append("prompt", "Transcribe this podcast or creator video clearly. Preserve names, podcast terms, and useful punctuation.");

    const openaiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: openaiForm,
    });

    const payload = await openaiResponse.json();
    if (!openaiResponse.ok) {
      return jsonResponse({ error: payload.error?.message || "OpenAI transcription failed." }, openaiResponse.status);
    }

    const transcript = transcriptFromOpenAI(payload);
    if (!transcript) return jsonResponse({ error: "OpenAI returned an empty transcript." }, 502);

    return jsonResponse({
      source: "Uploaded media transcription",
      fileName,
      model: payload.model || Deno.env.get("OPENAI_TRANSCRIBE_MODEL") || "gpt-4o-transcribe",
      transcript,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Could not transcribe media." }, 500);
  }
});
