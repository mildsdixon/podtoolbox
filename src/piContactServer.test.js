import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPiContactStore } from './piContactStore.js';
import { createPiContactServer } from './piContactServer.js';

async function withServer(fn, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'pi-contact-'));
  const store = createPiContactStore({ dataFile: join(dir, 'pi-contact.json') });
  const server = createPiContactServer({ store, ...options });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(baseUrl, store);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json();
  return { response, body };
}

test('Pi Contact server adds opt-in contacts and persists them', async () => {
  await withServer(async (baseUrl, store) => {
    const { response, body } = await jsonFetch(`${baseUrl}/api/pi-contact/contacts`, {
      method: 'POST',
      body: JSON.stringify({ fullName: 'Server Listener', email: 'SERVER@EXAMPLE.COM', consent: true, tags: 'launch, vip' }),
    });

    assert.equal(response.status, 201);
    assert.equal(body.contact.email, 'server@example.com');
    assert.equal(body.contacts.length, 1);

    const reloaded = await store.load();
    assert.equal(reloaded.contacts[0].email, 'server@example.com');
  });
});

test('Pi Contact server rejects contacts without opt-in consent', async () => {
  await withServer(async (baseUrl) => {
    const { response, body } = await jsonFetch(`${baseUrl}/api/pi-contact/contacts`, {
      method: 'POST',
      body: JSON.stringify({ fullName: 'Cold Add', email: 'cold@example.com', consent: false }),
    });

    assert.equal(response.status, 400);
    assert.match(body.error, /opt-in consent/i);
  });
});

test('Pi Contact server prepares demo campaign send and logs result', async () => {
  await withServer(async (baseUrl) => {
    await jsonFetch(`${baseUrl}/api/pi-contact/contacts`, {
      method: 'POST',
      body: JSON.stringify({ fullName: 'Subscribed One', email: 'one@example.com', consent: true }),
    });
    await jsonFetch(`${baseUrl}/api/pi-contact/contacts`, {
      method: 'POST',
      body: JSON.stringify({ fullName: 'Subscribed Two', email: 'two@example.com', consent: true }),
    });
    await jsonFetch(`${baseUrl}/api/pi-contact/unsubscribe`, {
      method: 'POST',
      body: JSON.stringify({ email: 'two@example.com' }),
    });

    const { response, body } = await jsonFetch(`${baseUrl}/api/pi-contact/campaigns/send`, {
      method: 'POST',
      body: JSON.stringify({ subject: 'New show', previewText: 'Quick note', body: 'Listen now.' }),
    });

    assert.equal(response.status, 200);
    assert.equal(body.mode, 'demo');
    assert.equal(body.sentCount, 1);
    assert.equal(body.skippedCount, 1);
    assert.equal(body.sendLog.length, 1);
    assert.match(body.messages[0].html, /unsubscribe/i);
  });
});

test('Pi Contact server health endpoint reports ready', async () => {
  await withServer(async (baseUrl) => {
    const { response, body } = await jsonFetch(`${baseUrl}/api/pi-contact/health`);
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, 'pi-contact');
  });
});

test('Pi Contact server sends through live delivery provider when configured', async () => {
  const deliveries = [];
  const deliveryProvider = {
    name: 'resend',
    async sendEmail(message) {
      deliveries.push(message);
      return { providerMessageId: `resend-${deliveries.length}` };
    },
  };

  await withServer(async (baseUrl) => {
    await jsonFetch(`${baseUrl}/api/pi-contact/contacts`, {
      method: 'POST',
      body: JSON.stringify({ fullName: 'Live Subscribed', email: 'live@example.com', consent: true }),
    });

    const { response, body } = await jsonFetch(`${baseUrl}/api/pi-contact/campaigns/send`, {
      method: 'POST',
      body: JSON.stringify({ subject: 'Live campaign', previewText: 'Provider send', body: 'This should go through Resend.' }),
    });

    assert.equal(response.status, 200);
    assert.equal(body.mode, 'live');
    assert.equal(body.provider, 'resend');
    assert.equal(body.sentCount, 1);
    assert.equal(body.deliveries[0].providerMessageId, 'resend-1');
    assert.equal(deliveries[0].to, 'live@example.com');
    assert.match(deliveries[0].html, /unsubscribe/i);
  }, { mode: 'live', deliveryProvider });
});

test('Pi Contact server rejects live send when provider is missing', async () => {
  await withServer(async (baseUrl) => {
    await jsonFetch(`${baseUrl}/api/pi-contact/contacts`, {
      method: 'POST',
      body: JSON.stringify({ fullName: 'Needs Provider', email: 'needs@example.com', consent: true }),
    });

    const { response, body } = await jsonFetch(`${baseUrl}/api/pi-contact/campaigns/send`, {
      method: 'POST',
      body: JSON.stringify({ subject: 'No provider', body: 'Should fail.' }),
    });

    assert.equal(response.status, 400);
    assert.match(body.error, /delivery provider/i);
  }, { mode: 'live' });
});
