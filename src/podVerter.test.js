import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PODVERTER_FORMATS,
  availablePodVerterFormats,
  formatPodVerterBytes,
  getPodVerterFormat,
} from './podVerter.js';

test('PODVerter exposes audio and video conversion definitions', () => {
  assert.deepEqual(PODVERTER_FORMATS.map((format) => format.value), ['mp3', 'wav', 'm4a', 'mp4', 'mov', 'webm']);
  assert.equal(getPodVerterFormat('MP3')?.mimeType, 'audio/mpeg');
  assert.equal(getPodVerterFormat('MOV')?.mimeType, 'video/quicktime');
  assert.equal(getPodVerterFormat('unknown'), null);
});

test('PODVerter limits audio inputs to audio output formats', () => {
  assert.deepEqual(availablePodVerterFormats('audio/wav').map((format) => format.value), ['mp3', 'wav', 'm4a']);
  assert.deepEqual(availablePodVerterFormats('video/mp4').map((format) => format.value), ['mp3', 'wav', 'm4a', 'mp4', 'mov', 'webm']);
});

test('PODVerter formats output sizes for the result card', () => {
  assert.equal(formatPodVerterBytes(512), '512 B');
  assert.equal(formatPodVerterBytes(1536), '1.5 KB');
  assert.equal(formatPodVerterBytes(2 * 1024 * 1024), '2.0 MB');
});
