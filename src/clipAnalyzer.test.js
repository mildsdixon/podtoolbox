import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTranscript, scoreClipCandidate, parseTranscriptLines } from './clipAnalyzer.js';

const transcript = `
00:00 Welcome back to the show, today we are warming up and saying hello.
00:20 Most podcasters fail because they spend ninety percent of their time recording and only ten percent distributing.
00:41 The surprising truth is one great clip can sell the whole episode when the hook is clear.
01:03 Here are three steps: lead with the strongest opinion, give context fast, and end with a question people want to answer.
01:31 Anyway, let's move into our sponsor and housekeeping notes for next week.
02:00 I remember when nobody believed the show could grow, but consistency changed everything.
02:21 If you are stuck, cut the moment where your guest says the uncomfortable truth out loud.
02:43 That is the clip people share because it feels useful, emotional, and a little controversial.
`;

test('analyzeTranscript returns ranked clip candidates with scores and posting reasons', () => {
  const result = analyzeTranscript(transcript);

  assert.equal(result.candidates.length >= 3, true);
  assert.equal(result.candidates[0].score >= result.candidates[1].score, true);
  assert.equal(result.candidates[0].score <= 100, true);
  assert.equal(result.candidates[0].score >= 85, true);
  assert.match(result.candidates[0].headline, /podcasters|clip|truth|fail/i);
  assert.equal(result.candidates[0].reasons.length >= 3, true);
  assert.equal(result.summary.totalCandidates, result.candidates.length);
});

test('scoreClipCandidate rewards hook, usefulness, emotion, and standalone clarity', () => {
  const strong = scoreClipCandidate('Most podcasters fail because distribution gets ignored. Here are three ways to fix it today. This is the truth creators need to hear.');
  const weak = scoreClipCandidate('Yeah and um we were talking about that thing from earlier and then it was kind of interesting.');

  assert.equal(strong.score > weak.score, true);
  assert.equal(strong.signals.hook > weak.signals.hook, true);
  assert.equal(strong.signals.usefulness > weak.signals.usefulness, true);
});

test('parseTranscriptLines accepts bracket timestamps, speaker labels, and arrow timestamp ranges', () => {
  const parsed = parseTranscriptLines(`
    [00:05] HOST: Most creators miss the hook before the story starts.
    00:22 --> 00:38 Guest: Here are three ways to make the clip work.
  `);

  assert.deepEqual(parsed.map((line) => line.seconds), [5, 22]);
  assert.equal(parsed[0].speaker, 'HOST');
  assert.equal(parsed[0].text, 'Most creators miss the hook before the story starts.');
  assert.equal(parsed[1].speaker, 'Guest');
  assert.equal(parsed[1].text, 'Here are three ways to make the clip work.');
});

test('analyzeTranscript includes platform recommendations, captions, and edit notes', () => {
  const result = analyzeTranscript(transcript, { limit: 3 });
  const top = result.candidates[0];

  assert.equal(top.platforms.length >= 3, true);
  assert.ok(top.platforms.every((platform) => platform.name && platform.fit && platform.note));
  assert.match(top.caption, /Most podcasters|clip|truth|podcast/i);
  assert.equal(top.editNotes.length >= 3, true);
  assert.equal(top.cta.length > 10, true);
  assert.equal(result.summary.recommendedPlatform.length > 0, true);
});

test('analyzeTranscript creates an Opus-style production package for each clip', () => {
  const result = analyzeTranscript(transcript, { limit: 2 });
  const top = result.candidates[0];

  assert.equal(top.productionPlan.hookLine.length > 10, true);
  assert.equal(top.productionPlan.overlayTitle.length > 3, true);
  assert.equal(top.productionPlan.hashtags.includes('#podcast'), true);
  assert.equal(top.productionPlan.exports.length >= 3, true);
  assert.ok(top.productionPlan.exports.every((item) => item.platform && item.format === '9:16'));
  assert.equal(Boolean(top.productionPlan.platformCaptions[top.platforms[0].name]), true);
  assert.match(top.productionPlan.status, /Ready|Needs/);
});

test('analyzeTranscript reduces near-duplicate overlapping candidates', () => {
  const repeated = `
    00:00 Most podcasters fail because they ignore distribution.
    00:10 Most podcasters fail because they ignore distribution.
    00:20 Most podcasters fail because they ignore distribution.
    00:30 Here are three ways to fix your clip strategy today.
    00:40 Here are three ways to fix your clip strategy today.
    00:50 Here are three ways to fix your clip strategy today.
  `;
  const result = analyzeTranscript(repeated, { limit: 6 });
  const uniqueTexts = new Set(result.candidates.map((candidate) => candidate.text));

  assert.equal(result.candidates.length, uniqueTexts.size);
  assert.equal(result.candidates.length <= 4, true);
});
