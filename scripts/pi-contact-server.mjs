#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createPiContactStore } from '../src/piContactStore.js';
import { createPiContactServer } from '../src/piContactServer.js';
import { createResendProvider } from '../src/resendProvider.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

for (const envFile of [join(rootDir, '.env.local'), join(rootDir, '.env')]) {
  if (!existsSync(envFile)) continue;
  const lines = readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
}

const port = Number(process.env.PI_CONTACT_PORT || process.env.PORT || 5191);
const dataFile = process.env.PI_CONTACT_DATA
  ? resolve(rootDir, process.env.PI_CONTACT_DATA)
  : join(rootDir, 'data', 'pi-contact.json');
const mode = process.env.PI_CONTACT_MODE || 'demo';

const store = createPiContactStore({ dataFile });
const deliveryProvider = mode === 'live'
  ? createResendProvider({
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.PI_CONTACT_FROM_EMAIL,
    })
  : null;
const server = createPiContactServer({ store, mode, deliveryProvider });

server.listen(port, '0.0.0.0', () => {
  console.log(`Pi Contact server running on http://127.0.0.1:${port}`);
  console.log(`Mode: ${mode}`);
  console.log(`Data file: ${dataFile}`);
  console.log('Health: /api/pi-contact/health');
});

function shutdown(signal) {
  console.log(`\n${signal} received. Stopping Pi Contact server...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
