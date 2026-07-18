const HOOK_WORDS = [
  'most', 'nobody', 'secret', 'truth', 'mistake', 'fail', 'stop', 'why', 'how', 'surprising', 'uncomfortable', 'never', 'always', 'first',
  'biggest', 'problem', 'lesson', 'real reason', 'everyone', 'before',
];

const USEFUL_WORDS = [
  'steps', 'ways', 'tips', 'fix', 'learn', 'strategy', 'because', 'here', 'should', 'need', 'do', 'grow', 'build', 'create', 'post',
  'framework', 'checklist', 'mistake', 'lesson', 'how to',
];

const EMOTION_WORDS = [
  'love', 'hate', 'afraid', 'believed', 'changed', 'truth', 'uncomfortable', 'powerful', 'share', 'emotional', 'fail', 'stuck',
  'controversial', 'angry', 'scared', 'proud', 'hurt', 'surprised', 'nobody',
];

const FILLER_WORDS = ['um', 'uh', 'yeah', 'kind of', 'sort of', 'thing', 'stuff', 'anyway'];
const CTA_BY_PLATFORM = {
  TikTok: 'What would you do differently?',
  Reels: 'Save this before your next episode.',
  Shorts: 'Watch the full episode for the full breakdown.',
  Facebook: 'Drop your take in the comments.',
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function countMatches(text, words) {
  const lower = text.toLowerCase();
  return words.reduce((count, word) => count + (lower.includes(word) ? 1 : 0), 0);
}

function sentenceSplit(text) {
  return normalize(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => normalize(item))
    .filter(Boolean);
}

function timestampToSeconds(timestamp) {
  const parts = timestamp.split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseSpeaker(text) {
  const match = normalize(text).match(/^([A-Za-z][A-Za-z0-9 ._-]{1,30}):\s+(.+)$/);
  if (!match) return { speaker: '', text: normalize(text) };
  return { speaker: match[1].trim(), text: normalize(match[2]) };
}

export function parseTranscriptLines(input) {
  const lines = String(input || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const parsed = [];

  for (const line of lines) {
    const cleanedLine = line.replace(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]/, '$1');
    const match = cleanedLine.match(/^(?:(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*(?:-->|-|–|—)\s*\d{1,2}:\d{2}(?::\d{2})?)?\s*)?(.*)$/);
    const seconds = match?.[1] ? timestampToSeconds(match[1]) : null;
    const speakerLine = parseSpeaker(match?.[2] || cleanedLine);
    if (speakerLine.text) parsed.push({ seconds, speaker: speakerLine.speaker, text: speakerLine.text });
  }

  if (parsed.some((item) => item.seconds !== null)) return parsed;
  return sentenceSplit(input).map((text, index) => ({ seconds: index * 12, speaker: '', text }));
}

export function scoreClipCandidate(text) {
  const clean = normalize(text);
  const words = clean ? clean.split(/\s+/) : [];
  const wordCount = words.length;
  const firstWords = words.slice(0, 18).join(' ');
  const fillerPenalty = countMatches(clean, FILLER_WORDS) * 7;

  const hook = clamp(18 + countMatches(firstWords, HOOK_WORDS) * 13 + (/^(most|why|how|stop|nobody|the truth|the biggest|everyone)/i.test(clean) ? 14 : 0));
  const usefulness = clamp(15 + countMatches(clean, USEFUL_WORDS) * 10 + (/\b(\d+|one|two|three|first|second|third)\b/i.test(clean) ? 10 : 0));
  const emotion = clamp(14 + countMatches(clean, EMOTION_WORDS) * 10);
  const clarity = clamp(20 + (wordCount >= 18 && wordCount <= 95 ? 22 : 0) + (/[.!?]$/.test(clean) ? 8 : 0) - fillerPenalty);
  const quoteability = clamp(12 + (clean.length >= 80 && clean.length <= 420 ? 18 : 0) + countMatches(clean, ['because', 'truth', 'people', 'creators', 'podcasters']) * 7);
  const platformFit = clamp(12 + countMatches(clean, ['podcasters', 'clip', 'episode', 'hook', 'recording', 'distributing', 'guest', 'creators']) * 9);
  const pacing = clamp(18 + (wordCount >= 20 && wordCount <= 80 ? 18 : 0) - Math.max(0, wordCount - 110));

  const weighted =
    hook * 0.26 +
    usefulness * 0.21 +
    emotion * 0.14 +
    clarity * 0.15 +
    quoteability * 0.11 +
    platformFit * 0.09 +
    pacing * 0.04;

  const score = Math.round(clamp(weighted + 34));
  const reasons = [];
  if (hook >= 55) reasons.push('Strong opening hook');
  if (usefulness >= 50) reasons.push('Clear practical value');
  if (emotion >= 45) reasons.push('Emotion or tension');
  if (clarity >= 55) reasons.push('Works as a standalone clip');
  if (quoteability >= 45) reasons.push('Caption-friendly quote potential');
  if (platformFit >= 55) reasons.push('Good short-form platform fit');
  if (reasons.length < 3) reasons.push('Needs a sharper first line', 'Add clearer takeaway', 'Cut filler before posting');

  return {
    score,
    grade: score >= 95 ? 'A+' : score >= 90 ? 'A' : score >= 85 ? 'B+' : score >= 75 ? 'B' : score >= 65 ? 'C' : 'Needs work',
    signals: { hook, usefulness, emotion, clarity, quoteability, platformFit, pacing },
    reasons: reasons.slice(0, 4),
  };
}

function makeHeadline(text) {
  const clean = normalize(text).replace(/[.!?]+$/g, '');
  const words = clean.split(/\s+/).slice(0, 11).join(' ');
  return words.length < clean.length ? `${words}…` : words;
}

function makeCaption(text, headline) {
  const firstSentence = sentenceSplit(text)[0] || headline;
  const short = firstSentence.length > 150 ? `${firstSentence.slice(0, 147).trim()}…` : firstSentence;
  return `${short}\n\n${CTA_BY_PLATFORM.Facebook}`;
}

function makeHookLine(text, headline) {
  const firstSentence = sentenceSplit(text)[0] || headline;
  const clean = firstSentence.replace(/^([A-Za-z][A-Za-z0-9 ._-]{1,30}):\s+/, '');
  return clean.length > 92 ? `${clean.slice(0, 89).trim()}...` : clean;
}

function makeOverlayTitle(headline) {
  const clean = normalize(headline).replace(/[.!?…]+$/g, '');
  const words = clean.split(/\s+/).slice(0, 7).join(' ');
  return words || 'Clip Worth Posting';
}

function makeHashtags(candidate) {
  const text = candidate.text.toLowerCase();
  const tags = ['#podcast', '#podclipz'];
  if (text.includes('creator') || text.includes('podcaster')) tags.push('#creator');
  if (text.includes('business') || text.includes('grow')) tags.push('#business');
  if (text.includes('truth') || text.includes('mistake') || text.includes('fail')) tags.push('#contentstrategy');
  if (text.includes('guest') || text.includes('interview')) tags.push('#podcasttips');
  tags.push('#reels', '#shorts');
  return [...new Set(tags)].slice(0, 7);
}

function makePlatformCaptions(candidate) {
  const hook = makeHookLine(candidate.text, candidate.headline);
  return {
    TikTok: `${hook}\n\n${CTA_BY_PLATFORM.TikTok}`,
    'Instagram Reels': `${hook}\n\n${CTA_BY_PLATFORM.Reels}`,
    'YouTube Shorts': `${hook}\n\n${CTA_BY_PLATFORM.Shorts}`,
    Facebook: `${hook}\n\n${CTA_BY_PLATFORM.Facebook}`,
  };
}

function makeExportPlan(candidate) {
  const topPlatforms = candidate.platforms.slice(0, 4);
  return topPlatforms.map((platform) => ({
    platform: platform.name,
    format: '9:16',
    length: candidate.durationSeconds > 60 ? 'trim to 45-60s' : `${candidate.durationSeconds}s`,
    captionStyle: platform.name === 'Facebook' ? 'large readable captions' : 'burned-in captions',
  }));
}

function makeProductionPlan(candidate) {
  return {
    hookLine: makeHookLine(candidate.text, candidate.headline),
    overlayTitle: makeOverlayTitle(candidate.headline),
    hashtags: makeHashtags(candidate),
    platformCaptions: makePlatformCaptions(candidate),
    exports: makeExportPlan(candidate),
    status: candidate.score >= 85 ? 'Ready to cut' : candidate.score >= 75 ? 'Needs light polish' : 'Needs stronger hook',
  };
}

function makeEditNotes(candidate) {
  const notes = [
    `Open cold at ${candidate.start}; do not include long intro before the hook.`,
    'Use burned-in captions with the strongest phrase highlighted in coral/teal.',
    'Crop vertical 9:16 with the speaker face centered and safe space for captions.',
  ];
  if (candidate.signals.clarity < 55) notes.push('Add a one-line context title before posting.');
  if (candidate.signals.pacing < 50) notes.push('Tighten pauses and remove filler before export.');
  return notes.slice(0, 5);
}

function recommendPlatforms(candidate) {
  const { hook, usefulness, emotion, clarity, platformFit, pacing } = candidate.signals;
  const platforms = [
    {
      name: 'TikTok',
      fit: Math.round(clamp(hook * 0.32 + emotion * 0.28 + platformFit * 0.22 + pacing * 0.18)),
      note: 'Best when the first two seconds feel bold, emotional, or debatable.',
    },
    {
      name: 'Instagram Reels',
      fit: Math.round(clamp(hook * 0.24 + clarity * 0.25 + quoteSafe(candidate) * 0.24 + platformFit * 0.27)),
      note: 'Best for clean captions, strong framing, and save-worthy takeaways.',
    },
    {
      name: 'YouTube Shorts',
      fit: Math.round(clamp(usefulness * 0.35 + clarity * 0.25 + hook * 0.2 + pacing * 0.2)),
      note: 'Best when the clip teaches one clear idea from the full episode.',
    },
    {
      name: 'Facebook',
      fit: Math.round(clamp(clarity * 0.3 + emotion * 0.25 + usefulness * 0.25 + hook * 0.2)),
      note: 'Best when the caption invites discussion and the topic is easy to share.',
    },
  ];
  return platforms.sort((a, b) => b.fit - a.fit);
}

function quoteSafe(candidate) {
  return candidate.signals.quoteability ?? 0;
}

function textFingerprint(text) {
  return normalize(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 28)
    .join(' ');
}

function tooSimilar(a, b) {
  const aWords = new Set(textFingerprint(a.text).split(' ').filter(Boolean));
  const bWords = new Set(textFingerprint(b.text).split(' ').filter(Boolean));
  if (!aWords.size || !bWords.size) return false;
  const overlap = [...aWords].filter((word) => bWords.has(word)).length;
  const smaller = Math.min(aWords.size, bWords.size);
  const timeOverlap = Math.max(0, Math.min(a.endSeconds, b.endSeconds) - Math.max(a.startSeconds, b.startSeconds));
  return overlap / smaller >= 0.78 || timeOverlap >= Math.min(a.durationSeconds, b.durationSeconds) * 0.72;
}

function dedupeCandidates(candidates, limit) {
  const accepted = [];
  for (const candidate of candidates) {
    if (!accepted.some((item) => tooSimilar(candidate, item))) {
      accepted.push(candidate);
    }
    if (accepted.length >= limit) break;
  }
  return accepted;
}

export function analyzeTranscript(input, options = {}) {
  const parsed = parseTranscriptLines(input);
  const windowSize = options.windowSize || 3;
  const limit = options.limit || 6;
  const candidates = [];

  for (let index = 0; index < parsed.length; index += 1) {
    const window = parsed.slice(index, index + windowSize);
    if (window.length < 2) continue;
    const text = window.map((item) => item.speaker ? `${item.speaker}: ${item.text}` : item.text).join(' ');
    const scoring = scoreClipCandidate(text);
    const startSeconds = window[0].seconds ?? index * 12;
    const nextStart = parsed[index + windowSize]?.seconds;
    const fallbackEnd = (window[window.length - 1].seconds ?? startSeconds + 42) + 18;
    const endSeconds = nextStart && nextStart > startSeconds ? nextStart : fallbackEnd;
    const durationSeconds = Math.max(15, Math.round(endSeconds - startSeconds));

    candidates.push({
      id: `clip-${index + 1}`,
      headline: makeHeadline(text),
      start: formatTime(startSeconds),
      end: formatTime(endSeconds),
      startSeconds,
      endSeconds,
      durationSeconds,
      text,
      ...scoring,
    });
  }

  const ranked = dedupeCandidates(
    candidates.sort((a, b) => b.score - a.score || b.signals.hook - a.signals.hook),
    limit,
  ).map((candidate, index) => {
    const platforms = recommendPlatforms(candidate);
    const enriched = {
      ...candidate,
      rank: index + 1,
      platforms,
      caption: makeCaption(candidate.text, candidate.headline),
      cta: CTA_BY_PLATFORM[platforms[0]?.name?.replace('Instagram Reels', 'Reels')] || CTA_BY_PLATFORM.Facebook,
    };
    return { ...enriched, editNotes: makeEditNotes(enriched), productionPlan: makeProductionPlan(enriched) };
  });

  const platformTotals = ranked.reduce((totals, candidate) => {
    for (const platform of candidate.platforms) totals[platform.name] = (totals[platform.name] || 0) + platform.fit;
    return totals;
  }, {});
  const recommendedPlatform = Object.entries(platformTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  return {
    candidates: ranked,
    summary: {
      totalCandidates: ranked.length,
      topScore: ranked[0]?.score || 0,
      averageScore: ranked.length ? Math.round(ranked.reduce((sum, item) => sum + item.score, 0) / ranked.length) : 0,
      recommendedPlatform,
    },
  };
}
