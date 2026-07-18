export const SOCIAL_PLATFORMS = Object.freeze([
  'Instagram Reels',
  'TikTok',
  'YouTube Shorts',
  'Facebook Reels',
]);

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function defaultSocialSchedule(now = new Date()) {
  const scheduled = new Date(now);
  scheduled.setDate(scheduled.getDate() + 1);
  scheduled.setHours(10, 0, 0, 0);
  return { date: dateInputValue(scheduled), time: '10:00' };
}

export function createScheduledPost({ clip, platforms, date, time, brandName, brandHandle }, now = new Date()) {
  if (!clip?.id) throw new Error('Choose one of the top five clips.');

  const selectedPlatforms = SOCIAL_PLATFORMS.filter((platform) => platforms?.includes(platform));
  if (!selectedPlatforms.length) throw new Error('Choose at least one social platform.');

  const scheduledAt = new Date(`${date || ''}T${time || ''}:00`);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error('Choose a valid schedule date and time.');
  if (scheduledAt <= now) throw new Error('Choose a future schedule time.');

  return {
    id: `schedule-${clip.id}-${scheduledAt.getTime()}`,
    clipId: clip.id,
    clipRank: clip.rank,
    headline: clip.headline,
    caption: clip.caption,
    platforms: selectedPlatforms,
    scheduledAt: scheduledAt.toISOString(),
    brandName: String(brandName || 'My Podcast').trim() || 'My Podcast',
    brandHandle: String(brandHandle || '').trim(),
    status: 'planned',
  };
}

export function formatScheduledPostTime(isoValue) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoValue));
}
