const MIN_REEL_SECONDS = 15;
const MAX_REEL_SECONDS = 30;

const PLATFORM_DEFAULTS = {
  'Instagram Reels': {
    platform: 'Instagram Reels',
    format: 'MP4',
    aspectRatio: '9:16',
    resolution: '1080x1920',
    note: 'Use strong visual captions and a save/share-friendly caption.',
  },
  'YouTube Shorts': {
    platform: 'YouTube Shorts',
    format: 'MP4',
    aspectRatio: '9:16',
    resolution: '1080x1920',
    note: 'Make the first line searchable and connect it to the full episode.',
  },
  TikTok: {
    platform: 'TikTok',
    format: 'MP4',
    aspectRatio: '9:16',
    resolution: '1080x1920',
    note: 'Open with the hook immediately and ask a comment-driving question.',
  },
  'Facebook Reels': {
    platform: 'Facebook Reels',
    format: 'MP4',
    aspectRatio: '9:16',
    resolution: '1080x1920',
    note: 'Use a clear caption and discussion prompt for shareability.',
  },
};

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function makeId(prefix = 'reel') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clampDuration(seconds) {
  const numeric = Number(seconds || 0);
  return Math.max(MIN_REEL_SECONDS, Math.min(MAX_REEL_SECONDS, Math.round(numeric || MIN_REEL_SECONDS)));
}

export function validateReelDuration(seconds) {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric)) {
    return { valid: false, message: 'Reel duration must be a number.' };
  }
  if (numeric < MIN_REEL_SECONDS || numeric > MAX_REEL_SECONDS) {
    return { valid: false, message: 'RodReelz must be 15 to 30 seconds long.' };
  }
  return { valid: true, message: 'Duration is inside the 15 to 30 second RodReelz window.' };
}

export function getPlatformExportPlan(platforms = ['Instagram Reels', 'YouTube Shorts', 'TikTok', 'Facebook Reels']) {
  return platforms.map((platform) => PLATFORM_DEFAULTS[platform] || {
    platform,
    format: 'MP4',
    aspectRatio: '9:16',
    resolution: '1080x1920',
    note: 'Use vertical short-form export settings.',
  });
}

export function createPodReel(input) {
  const durationSeconds = Number(input.durationSeconds);
  const validation = validateReelDuration(durationSeconds);
  if (!validation.valid) throw new Error(validation.message);

  const title = cleanText(input.title);
  const hook = cleanText(input.hook);
  if (!title) throw new Error('RodReelz title is required.');
  if (!hook) throw new Error('RodReelz hook is required.');

  const platforms = input.platforms?.length ? input.platforms : ['Instagram Reels', 'YouTube Shorts', 'TikTok', 'Facebook Reels'];
  const caption = cleanText(input.caption) || `${hook}\n\nWatch the full podcast for the whole conversation.`;

  return {
    id: input.id || makeId('pod-reel'),
    title,
    hook,
    sourceEpisode: cleanText(input.sourceEpisode) || 'Podcast episode',
    durationSeconds,
    caption,
    platforms,
    exports: getPlatformExportPlan(platforms),
    status: input.status || 'ready',
    checklist: [
      '15-30 second cut',
      'Vertical 9:16 frame',
      'Burned-in captions',
      'Podcast name visible',
      'Clear first-line hook',
      'CTA to watch/listen to full episode',
    ],
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export function createReelFromClip(clip) {
  const platforms = clip.platforms?.length
    ? clip.platforms.map((platform) => platform.name || platform.platform || platform).filter(Boolean)
    : ['Instagram Reels', 'YouTube Shorts', 'TikTok', 'Facebook Reels'];
  const text = cleanText(clip.text);
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0] || cleanText(clip.headline);

  return createPodReel({
    title: cleanText(clip.headline) || 'Podcast short',
    hook: firstSentence,
    sourceEpisode: clip.sourceEpisode || `${clip.start || '00:00'} - ${clip.end || '00:30'}`,
    durationSeconds: clampDuration(clip.durationSeconds),
    caption: cleanText(clip.caption) || firstSentence,
    platforms: platforms.slice(0, 4),
  });
}

export function samplePodReels() {
  return [
    createPodReel({
      id: 'sample-reel-1',
      title: 'The clip most podcasters miss',
      hook: 'Most podcasters post the setup instead of the payoff.',
      sourceEpisode: 'PodToolbox Demo EP 01',
      durationSeconds: 24,
      caption: 'Most podcasters post the setup instead of the payoff. Cut to the moment that makes people stop scrolling.',
      platforms: ['Instagram Reels', 'YouTube Shorts', 'TikTok'],
      createdAt: '2026-07-14T12:00:00.000Z',
    }),
    createPodReel({
      id: 'sample-reel-2',
      title: 'One idea per short',
      hook: 'The best podcast short teaches one idea fast.',
      sourceEpisode: 'PodToolbox Demo EP 02',
      durationSeconds: 18,
      caption: 'One idea. One hook. One reason to share.',
      platforms: ['TikTok', 'Facebook Reels'],
      createdAt: '2026-07-14T12:05:00.000Z',
    }),
  ];
}
