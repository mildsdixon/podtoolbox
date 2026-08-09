import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import Busboy from 'busboy';
import ffmpegPath from 'ffmpeg-static';
import youtubeDl from 'youtube-dl-exec';
import { PODVERTER_FORMATS, getPodVerterFormat } from '../src/podVerter.js';

const PORT = Number(process.env.PORT || process.env.PODCLIPZ_MEDIA_PORT || 8788);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT_DIR = resolve(process.cwd(), '.podclipz-media');
const UPLOAD_DIR = join(ROOT_DIR, 'uploads');
const EXPORT_DIR = join(ROOT_DIR, 'exports');
const CONVERSION_DIR = join(ROOT_DIR, 'conversions');
const URL_DOWNLOAD_DIR = join(ROOT_DIR, 'url-downloads');
const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;
const MAX_JSON_BYTES = 32 * 1024;
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.webm']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv']);
const YTDLP_PYTHON_BIN_DIR = process.env.PODTOOLBOX_PYTHON_BIN_DIR || join(resolve(process.cwd()), 'scripts/bin');
const SOCIAL_VIDEO_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'fb.watch',
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json',
  });
  response.end(JSON.stringify(payload));
}

function publicUrl(request, path) {
  const proto = request.headers['x-forwarded-proto'] || 'http';
  const host = request.headers['x-forwarded-host'] || request.headers.host || `127.0.0.1:${PORT}`;
  return `${proto}://${host}${path}`;
}

function cleanFileName(value) {
  return String(value || 'podclipz-video')
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'podclipz-video';
}

function validateFacebookVideoUrl(value) {
  const rawUrl = String(value || '').trim();
  const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  try {
    const parsed = new URL(normalizedUrl);
    const host = parsed.hostname.toLowerCase();

    if (!['http:', 'https:'].includes(parsed.protocol) || !SOCIAL_VIDEO_HOSTS.has(host)) {
      throw new Error('Paste a public Facebook video URL, such as facebook.com/.../videos/... or fb.watch/...');
    }

    return parsed.toString();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Paste a valid Facebook video URL.');
  }
}

function parseJsonBody(request) {
  return new Promise((resolvePromise, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk.toString();
      if (Buffer.byteLength(body) > MAX_JSON_BYTES) {
        request.destroy();
        reject(new Error('Request body is too large.'));
      }
    });

    request.on('end', () => {
      try {
        resolvePromise(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Send a valid JSON request.'));
      }
    });

    request.on('error', reject);
  });
}

function parseTimestamp(value) {
  if (typeof value === 'number') return Math.max(0, value);
  const parts = String(value || '').split(':').map(Number);
  if (!parts.length || parts.some(Number.isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return Math.max(0, Number(value) || 0);
}

function uploadMediaKind(upload) {
  const mimeType = String(upload.mimeType || '');
  const extension = extname(upload.filename || '').toLowerCase();

  if (mimeType.startsWith('video/') || VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (mimeType.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension)) return 'audio';
  return '';
}

function parseMultipart(request) {
  return new Promise((resolvePromise, reject) => {
    const fields = {};
    let upload = null;
    let uploadBytes = 0;
    const busboy = Busboy({ headers: request.headers, limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', async (name, file, info) => {
      if (!['video', 'media'].includes(name)) {
        file.resume();
        return;
      }

      const originalName = cleanFileName(info.filename);
      const extension = extname(info.filename || '').slice(0, 10) || '.mp4';
      const uploadPath = join(UPLOAD_DIR, `${Date.now()}-${originalName}${extension}`);
      upload = { path: uploadPath, filename: info.filename, mimeType: info.mimeType };

      file.on('data', (chunk) => {
        uploadBytes += chunk.length;
      });

      try {
        await pipeline(file, createWriteStream(uploadPath));
      } catch (error) {
        reject(error);
      }
    });

    busboy.on('error', reject);
    busboy.on('finish', () => {
      if (!upload) {
        reject(new Error('Upload a source audio or video file.'));
        return;
      }
      resolvePromise({ fields, upload, uploadBytes });
    });

    request.pipe(busboy);
  });
}

async function handleConversion(request, response) {
  let uploadPath = '';

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await mkdir(CONVERSION_DIR, { recursive: true });

    const { fields, upload } = await parseMultipart(request);
    uploadPath = upload.path;
    const format = getPodVerterFormat(fields.format);

    if (!format) {
      throw new Error('Choose MP3, WAV, M4A, MP4, or WebM as the output format.');
    }

    const mediaKind = uploadMediaKind(upload);
    if (!mediaKind) {
      throw new Error('PODVerter accepts audio and video files only.');
    }

    if (format.kind === 'video' && mediaKind !== 'video') {
      throw new Error('Choose a video file when converting to MP4 or WebM.');
    }

    const sourceName = cleanFileName(upload.filename || 'podverter-media');
    const fileName = `${Date.now()}-${sourceName}.${format.value}`;
    const outputPath = join(CONVERSION_DIR, fileName);

    await runFfmpeg([
      '-hide_banner',
      '-y',
      '-i',
      upload.path,
      ...format.ffmpegArgs,
      outputPath,
    ]);

    const converted = await stat(outputPath);
    sendJson(response, 200, {
      status: 'ready',
      sourceName: upload.filename,
      fileName,
      sizeBytes: converted.size,
      format: format.value,
      formatLabel: format.label,
      downloadUrl: publicUrl(request, `/conversions/${encodeURIComponent(fileName)}`),
    });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : 'PODVerter could not convert this file.' });
  } finally {
    if (uploadPath) await rm(uploadPath, { force: true });
  }
}

async function newestMediaFile(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries
    .filter((entry) => entry.isFile() && !entry.name.endsWith('.part') && !entry.name.endsWith('.ytdl'))
    .map(async (entry) => {
      const filePath = join(directory, entry.name);
      const fileInfo = await stat(filePath);
      return { filePath, fileInfo };
    }));

  return files
    .filter((file) => file.fileInfo.size > 0)
    .sort((left, right) => right.fileInfo.mtimeMs - left.fileInfo.mtimeMs)[0]?.filePath || '';
}

async function downloadFacebookVideo(url, workDir) {
  const outputTemplate = join(workDir, '%(title).90s-%(id)s.%(ext)s');
  const pathWithModernPython = [YTDLP_PYTHON_BIN_DIR, process.env.PATH].filter(Boolean).join(':');

  await youtubeDl(url, {
    output: outputTemplate,
    format: [
      'bv*[vcodec!=none][height<=1080][ext=mp4]+ba[acodec!=none][ext=m4a]',
      'bv*[vcodec!=none][height<=1080]+ba[acodec!=none]',
      'b[vcodec!=none][acodec!=none][ext=mp4]',
      'best[vcodec!=none][acodec!=none]',
    ].join('/'),
    formatSort: ['res', 'ext:mp4:m4a'],
    mergeOutputFormat: 'mp4',
    noPlaylist: true,
    noWarnings: true,
    restrictFilenames: true,
    continue: false,
    nopart: true,
    retries: 10,
    fragmentRetries: 10,
    fileAccessRetries: 5,
    extractorRetries: 3,
    socketTimeout: 30,
    concurrentFragmentDownloads: 1,
    ffmpegLocation: dirname(ffmpegPath),
  }, {
    env: { ...process.env, PATH: pathWithModernPython },
    timeout: 1000 * 60 * 8,
  });

  const downloadedPath = await newestMediaFile(workDir);
  if (!downloadedPath) {
    throw new Error('Facebook download finished, but no video file was found.');
  }

  return downloadedPath;
}

async function handleUrlConversion(request, response) {
  let workDir = '';

  try {
    await mkdir(URL_DOWNLOAD_DIR, { recursive: true });
    await mkdir(CONVERSION_DIR, { recursive: true });

    const body = await parseJsonBody(request);
    const url = validateFacebookVideoUrl(body.url);
    const format = getPodVerterFormat(body.format || 'mp4');

    if (!format || !['mp4', 'mov'].includes(format.value)) {
      throw new Error('Choose MP4 or MOV as the Facebook video output format.');
    }

    workDir = join(URL_DOWNLOAD_DIR, `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    await mkdir(workDir, { recursive: true });

    const downloadedPath = await downloadFacebookVideo(url, workDir);
    const sourceName = cleanFileName(basename(downloadedPath) || 'facebook-video');
    const fileName = `${Date.now()}-${sourceName}.${format.value}`;
    const outputPath = join(CONVERSION_DIR, fileName);

    await runFfmpeg([
      '-hide_banner',
      '-y',
      '-i',
      downloadedPath,
      ...format.ffmpegArgs,
      outputPath,
    ]);

    const converted = await stat(outputPath);
    sendJson(response, 200, {
      status: 'ready',
      sourceName: url,
      fileName,
      sizeBytes: converted.size,
      format: format.value,
      formatLabel: format.label,
      downloadUrl: publicUrl(request, `/conversions/${encodeURIComponent(fileName)}`),
    });
  } catch (error) {
    const message = error instanceof Error && error.message.trim()
      ? error.message.trim()
      : 'PODVerter could not download this Facebook video.';
    sendJson(response, 500, {
      error: `${message} Public Facebook videos work best. Private videos or videos that require login may fail.`,
    });
  } finally {
    if (workDir) await rm(workDir, { recursive: true, force: true });
  }
}

function runFfmpeg(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(ffmpegPath, args);
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(stderr.split('\n').slice(-8).join('\n') || `ffmpeg exited with code ${code}`));
    });
  });
}

async function handleExport(request, response) {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await mkdir(EXPORT_DIR, { recursive: true });

    const { fields, upload } = await parseMultipart(request);
    const startSeconds = parseTimestamp(fields.startSeconds || fields.start);
    const requestedDuration = parseTimestamp(fields.durationSeconds || fields.duration);
    const durationSeconds = Math.min(90, Math.max(5, requestedDuration || 30));
    const title = String(fields.title || 'PodClipz Export').slice(0, 120);
    const clipId = cleanFileName(fields.clipId || title);
    const exportName = `${Date.now()}-${clipId}.mp4`;
    const exportPath = join(EXPORT_DIR, exportName);

    const videoFilter = [
      'scale=1080:1920:force_original_aspect_ratio=increase',
      'crop=1080:1920',
      'setsar=1',
    ].join(',');

    await runFfmpeg([
      '-hide_banner',
      '-y',
      '-ss',
      String(startSeconds),
      '-i',
      upload.path,
      '-t',
      String(durationSeconds),
      '-vf',
      videoFilter,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      exportPath,
    ]);

    await rm(upload.path, { force: true });

    const exported = await stat(exportPath);
    sendJson(response, 200, {
      status: 'ready',
      title,
      fileName: exportName,
      sizeBytes: exported.size,
      downloadUrl: publicUrl(request, `/exports/${encodeURIComponent(exportName)}`),
      durationSeconds,
      startSeconds,
      format: 'MP4 9:16 vertical',
    });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : 'Could not export clip.' });
  }
}

async function serveExport(request, response) {
  const fileName = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${PORT}`).pathname.replace('/exports/', ''));
  const filePath = join(EXPORT_DIR, cleanFileName(fileName.replace(/\.mp4$/i, '')) + '.mp4');

  try {
    const fileInfo = await stat(filePath);
    response.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': fileInfo.size,
      'Content-Type': 'video/mp4',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { error: 'Export file not found.' });
  }
}

async function serveConversion(request, response) {
  const requestedName = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${PORT}`).pathname.replace('/conversions/', ''));
  const extension = extname(requestedName).slice(1).toLowerCase();
  const format = getPodVerterFormat(extension);

  if (!format) {
    sendJson(response, 404, { error: 'Converted file not found.' });
    return;
  }

  const fileName = `${cleanFileName(requestedName)}.${format.value}`;
  const filePath = join(CONVERSION_DIR, fileName);

  try {
    const fileInfo = await stat(filePath);
    response.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': fileInfo.size,
      'Content-Type': format.mimeType,
    });
    createReadStream(filePath).pipe(response);
  } catch {
    sendJson(response, 404, { error: 'Converted file not found.' });
  }
}

await mkdir(UPLOAD_DIR, { recursive: true });
await mkdir(EXPORT_DIR, { recursive: true });
await mkdir(CONVERSION_DIR, { recursive: true });
await mkdir(URL_DOWNLOAD_DIR, { recursive: true });

createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url, `http://127.0.0.1:${PORT}`);

  if (request.method === 'GET' && ['/health', '/api/health'].includes(url.pathname)) {
    sendJson(response, 200, {
      ok: true,
      service: 'pod-toolbox-media',
      ffmpeg: Boolean(ffmpegPath),
      podVerterFormats: PODVERTER_FORMATS.map((format) => format.value),
      urlConversion: {
        supportedSites: ['Facebook'],
        supportedFormats: ['mp4', 'mov'],
      },
    });
    return;
  }

  if (request.method === 'POST' && ['/api/podverter/convert', '/podverter/convert'].includes(url.pathname)) {
    await handleConversion(request, response);
    return;
  }

  if (request.method === 'POST' && ['/api/podverter/url', '/podverter/url'].includes(url.pathname)) {
    await handleUrlConversion(request, response);
    return;
  }

  if (request.method === 'POST' && ['/api/podclipz/export', '/podclipz/export'].includes(url.pathname)) {
    await handleExport(request, response);
    return;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/exports/')) {
    await serveExport(request, response);
    return;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/conversions/')) {
    await serveConversion(request, response);
    return;
  }

  sendJson(response, 404, { error: 'Pod Toolbox media endpoint not found.' });
}).listen(PORT, HOST, () => {
  console.log(`Pod Toolbox media server ready at http://${HOST}:${PORT}`);
});
