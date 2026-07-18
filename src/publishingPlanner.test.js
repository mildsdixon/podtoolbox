import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOCIAL_PLATFORMS,
  createScheduledPost,
  defaultSocialSchedule,
  formatScheduledPostTime,
} from './publishingPlanner.js';

const clip = {
  id: 'clip-1',
  rank: 1,
  headline: 'A strong podcast moment',
  caption: 'Watch this moment.',
};

test('defaultSocialSchedule chooses tomorrow morning', () => {
  const schedule = defaultSocialSchedule(new Date('2026-07-17T12:00:00'));
  assert.equal(schedule.date, '2026-07-18');
  assert.equal(schedule.time, '10:00');
});

test('createScheduledPost builds a multi-platform branded plan', () => {
  const post = createScheduledPost({
    clip,
    platforms: SOCIAL_PLATFORMS,
    date: '2026-07-18',
    time: '10:00',
    brandName: 'Pod Toolbox',
    brandHandle: '@podtoolbox',
  }, new Date('2026-07-17T12:00:00'));

  assert.equal(post.clipRank, 1);
  assert.equal(post.platforms.length, 4);
  assert.equal(post.brandName, 'Pod Toolbox');
  assert.match(formatScheduledPostTime(post.scheduledAt), /Jul 18, 2026/);
});

test('createScheduledPost rejects missing platforms and past times', () => {
  assert.throws(() => createScheduledPost({ clip, platforms: [], date: '2026-07-18', time: '10:00' }, new Date('2026-07-17T12:00:00')), /platform/);
  assert.throws(() => createScheduledPost({ clip, platforms: ['TikTok'], date: '2026-07-16', time: '10:00' }, new Date('2026-07-17T12:00:00')), /future/);
});
