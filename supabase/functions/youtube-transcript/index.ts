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

function extractVideoId(value = "") {
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  const host = parsed.hostname.replace(/^www\./, "");
  const parts = parsed.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") return parts[0] || "";
  if (!["youtube.com", "m.youtube.com"].includes(host)) return "";
  return parsed.searchParams.get("v") || (["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : "") || "";
}

function findJsonObjectAfter(source: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) return null;

  const start = source.indexOf("{", markerIndex + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  return null;
}

function htmlDecode(value = "") {
  return value
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function formatStamp(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours ? `${String(hours).padStart(2, "0")}:${mmss}` : mmss;
}

function normalizeText(value = "") {
  return htmlDecode(value)
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function parseJson3Caption(body: string) {
  const payload = JSON.parse(body);
  const lines = [];

  for (const event of payload.events || []) {
    const text = (event.segs || []).map((segment: { utf8?: string }) => segment.utf8 || "").join("");
    const clean = normalizeText(text);
    if (!clean || /^\[(music|applause|laughter)\]$/i.test(clean)) continue;
    lines.push(`${formatStamp(event.tStartMs || 0)} ${clean}`);
  }

  return lines;
}

function parseXmlCaption(body: string) {
  const lines = [];
  const pattern = /<text[^>]*start="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body))) {
    const clean = normalizeText(match[2]);
    if (!clean || /^\[(music|applause|laughter)\]$/i.test(clean)) continue;
    lines.push(`${formatStamp(Number(match[1]) * 1000)} ${clean}`);
  }

  return lines;
}

function titleFromPlayerResponse(playerResponse: Record<string, unknown>) {
  const details = playerResponse.videoDetails as { title?: string } | undefined;
  return normalizeText(details?.title || "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST." }, 405);

  try {
    const { url, videoId: suppliedVideoId } = await req.json();
    const videoId = suppliedVideoId || extractVideoId(String(url || ""));
    if (!videoId) return jsonResponse({ error: "Paste a valid YouTube URL." }, 400);

    const watchResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      },
    });

    if (!watchResponse.ok) {
      return jsonResponse({ error: `YouTube blocked the transcript fetch from the server with status ${watchResponse.status}.` }, 502);
    }

    const html = await watchResponse.text();
    const playerJson = findJsonObjectAfter(html, "ytInitialPlayerResponse");
    if (!playerJson) return jsonResponse({ error: "Could not read YouTube player data." }, 502);

    const playerResponse = JSON.parse(playerJson);
    const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    if (!captionTracks.length) {
      return jsonResponse({ error: "No public captions were found for this YouTube video." }, 404);
    }

    const track = captionTracks.find((item: { languageCode?: string; vssId?: string }) =>
      item.languageCode?.startsWith("en") || item.vssId?.includes(".en")
    ) || captionTracks[0];
    const separator = track.baseUrl.includes("?") ? "&" : "?";
    const captionUrl = track.baseUrl.includes("fmt=") ? track.baseUrl : `${track.baseUrl}${separator}fmt=json3`;
    const captionResponse = await fetch(captionUrl, {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      },
    });

    if (!captionResponse.ok) {
      return jsonResponse({ error: "Could not download the YouTube captions." }, 502);
    }

    const captionBody = await captionResponse.text();
    const lines = captionBody.trim().startsWith("{") ? parseJson3Caption(captionBody) : parseXmlCaption(captionBody);
    if (!lines.length) return jsonResponse({ error: "The caption track was empty." }, 404);

    const maxLines = 1200;
    const transcript = lines.slice(0, maxLines).join("\n");

    return jsonResponse({
      videoId,
      title: titleFromPlayerResponse(playerResponse),
      source: "YouTube captions",
      language: track.languageCode || track.vssId || "unknown",
      truncated: lines.length > maxLines,
      transcript,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Could not create transcript." }, 500);
  }
});
