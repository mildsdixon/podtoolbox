export const PODVERTER_FORMATS = Object.freeze([
  {
    value: 'mp3',
    label: 'MP3 audio',
    kind: 'audio',
    mimeType: 'audio/mpeg',
    ffmpegArgs: ['-vn', '-c:a', 'libmp3lame', '-b:a', '192k'],
  },
  {
    value: 'wav',
    label: 'WAV audio',
    kind: 'audio',
    mimeType: 'audio/wav',
    ffmpegArgs: ['-vn', '-c:a', 'pcm_s16le'],
  },
  {
    value: 'm4a',
    label: 'M4A audio',
    kind: 'audio',
    mimeType: 'audio/mp4',
    ffmpegArgs: ['-vn', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'],
  },
  {
    value: 'mp4',
    label: 'MP4 video',
    kind: 'video',
    mimeType: 'video/mp4',
    ffmpegArgs: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart'],
  },
  {
    value: 'webm',
    label: 'WebM video',
    kind: 'video',
    mimeType: 'video/webm',
    ffmpegArgs: ['-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '5', '-c:a', 'libopus', '-b:a', '128k'],
  },
]);

export function getPodVerterFormat(value) {
  return PODVERTER_FORMATS.find((format) => format.value === String(value || '').toLowerCase()) || null;
}

export function availablePodVerterFormats(mimeType = '') {
  const isVideo = String(mimeType).startsWith('video/');
  return PODVERTER_FORMATS.filter((format) => isVideo || format.kind === 'audio');
}

export function formatPodVerterBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
