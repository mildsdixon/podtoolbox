import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPodReel,
  createReelFromClip,
  getPlatformExportPlan,
  validateReelDuration,
} from './podReels.js';

test('validateReelDuration only accepts 15 to 30 second reels', () => {
  assert.equal(validateReelDuration(15).valid, true);
  assert.equal(validateReelDuration(30).valid, true);
  assert.equal(validateReelDuration(14).valid, false);
  assert.equal(validateReelDuration(31).valid, false);
});

test('createPodReel builds a podcast short with title, hook, caption, and export plan', () => {
  const reel = createPodReel({
    title: 'Why most podcasts miss the clip',
    hook: 'Most podcasters fail because they post the wrong moment.',
    sourceEpisode: 'Episode 12',
    durationSeconds: 24,
    caption: 'Most podcasters post the setup instead of the payoff.',
    platforms: ['TikTok', 'YouTube Shorts'],
  });

  assert.equal(reel.status, 'ready');
  assert.equal(reel.durationSeconds, 24);
  assert.match(reel.caption, /Most podcasters/);
  assert.equal(reel.exports.length, 2);
  assert.ok(reel.exports.every((item) => item.aspectRatio === '9:16'));
  assert.ok(reel.checklist.includes('Burned-in captions'));
});

test('createPodReel rejects reels outside the 15 to 30 second window', () => {
  assert.throws(() => createPodReel({ title: 'Too long', hook: 'Hook', durationSeconds: 42 }), /15 to 30 seconds/i);
});

test('createReelFromClip converts a PodClipz candidate into a 15-30 second reel plan', () => {
  const reel = createReelFromClip({
    headline: 'The surprising truth about podcast clips',
    text: 'The surprising truth is the best short teaches one idea and creates tension fast.',
    start: '00:18',
    end: '00:48',
    durationSeconds: 30,
    caption: 'The best short teaches one idea fast.',
    platforms: [{ name: 'Instagram Reels', fit: 88 }, { name: 'TikTok', fit: 83 }],
  });

  assert.equal(reel.durationSeconds, 30);
  assert.equal(reel.platforms[0], 'Instagram Reels');
  assert.match(reel.hook, /surprising truth/i);
});

test('getPlatformExportPlan returns defaults for Reels, Shorts, TikTok, and Facebook', () => {
  const exports = getPlatformExportPlan(['Instagram Reels', 'YouTube Shorts', 'TikTok', 'Facebook Reels']);
  assert.deepEqual(exports.map((item) => item.platform), ['Instagram Reels', 'YouTube Shorts', 'TikTok', 'Facebook Reels']);
  assert.ok(exports.every((item) => item.format === 'MP4'));
});
