import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const initialState = {
  contacts: [],
  campaigns: [],
  sendLog: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createPiContactStore({ dataFile }) {
  if (!dataFile) throw new Error('Pi Contact store requires a dataFile path.');

  async function ensureFile() {
    await mkdir(dirname(dataFile), { recursive: true });
    try {
      await readFile(dataFile, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await writeFile(dataFile, JSON.stringify(initialState, null, 2));
    }
  }

  async function load() {
    await ensureFile();
    const raw = await readFile(dataFile, 'utf8');
    if (!raw.trim()) return clone(initialState);
    const parsed = JSON.parse(raw);
    return {
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
      sendLog: Array.isArray(parsed.sendLog) ? parsed.sendLog : [],
    };
  }

  async function save(state) {
    await mkdir(dirname(dataFile), { recursive: true });
    const next = {
      contacts: Array.isArray(state.contacts) ? state.contacts : [],
      campaigns: Array.isArray(state.campaigns) ? state.campaigns : [],
      sendLog: Array.isArray(state.sendLog) ? state.sendLog : [],
    };
    await writeFile(dataFile, JSON.stringify(next, null, 2));
    return clone(next);
  }

  async function update(mutator) {
    const current = await load();
    const next = await mutator(clone(current));
    return save(next || current);
  }

  return { dataFile, load, save, update };
}
