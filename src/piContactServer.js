import { createServer } from 'node:http';
import { addContact, createCampaign, sendCampaign, unsubscribeContact } from './piContact.js';

const MAX_BODY_BYTES = 1_000_000;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  response.end(JSON.stringify(payload));
}

function notFound(response) {
  sendJson(response, 404, { error: 'Pi Contact endpoint not found.' });
}

async function readJson(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

export function createPiContactServer({ store, mode = 'demo', deliveryProvider = null }) {
  if (!store) throw new Error('Pi Contact server requires a store.');

  return createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      sendJson(response, 200, { ok: true });
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

    try {
      if (request.method === 'GET' && url.pathname === '/api/pi-contact/health') {
        const state = await store.load();
        sendJson(response, 200, {
          ok: true,
          service: 'pi-contact',
          mode,
          contacts: state.contacts.length,
          campaigns: state.campaigns.length,
          sends: state.sendLog.length,
        });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/pi-contact/state') {
        sendJson(response, 200, await store.load());
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/pi-contact/contacts') {
        const state = await store.load();
        sendJson(response, 200, { contacts: state.contacts });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/pi-contact/contacts') {
        const input = await readJson(request);
        const next = await store.update((state) => ({ ...state, contacts: addContact(state.contacts, input) }));
        const email = String(input.email || '').trim().toLowerCase();
        sendJson(response, 201, {
          contact: next.contacts.find((contact) => contact.email === email),
          contacts: next.contacts,
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/pi-contact/unsubscribe') {
        const input = await readJson(request);
        if (!input.email) throw new Error('Email is required to unsubscribe.');
        const next = await store.update((state) => ({ ...state, contacts: unsubscribeContact(state.contacts, input.email) }));
        sendJson(response, 200, { contacts: next.contacts });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/pi-contact/campaigns') {
        const input = await readJson(request);
        const campaign = createCampaign(input);
        const next = await store.update((state) => ({ ...state, campaigns: [campaign, ...state.campaigns] }));
        sendJson(response, 201, { campaign, campaigns: next.campaigns });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/pi-contact/campaigns/send') {
        const input = await readJson(request);
        const campaign = createCampaign(input);
        const currentState = await store.load();
        const result = sendCampaign(campaign, currentState.contacts);

        if (mode === 'live' && !deliveryProvider) {
          throw new Error('Live mode requires a delivery provider. Set RESEND_API_KEY and PI_CONTACT_FROM_EMAIL or run in demo mode.');
        }

        const deliveries = mode === 'live'
          ? await Promise.all(result.messages.map((message) => deliveryProvider.sendEmail(message)))
          : [];

        const logEntry = {
          id: `send-${Date.now()}`,
          mode,
          provider: mode === 'live' ? deliveryProvider.name : 'demo',
          campaign: result.campaign,
          sentCount: result.sentCount,
          skippedCount: result.skippedCount,
          recipients: result.recipients,
          deliveries,
          sentAt: result.sentAt,
        };

        const next = await store.save({
          ...currentState,
          campaigns: [result.campaign, ...currentState.campaigns],
          sendLog: [logEntry, ...currentState.sendLog],
        });

        sendJson(response, 200, {
          mode,
          provider: logEntry.provider,
          ...result,
          deliveries,
          sendLog: next.sendLog,
          message: mode === 'demo'
            ? 'Demo send prepared. Connect a provider before sending live email.'
            : 'Campaign sent through configured provider.',
        });
        return;
      }

      notFound(response);
    } catch (error) {
      const statusCode = error instanceof SyntaxError ? 400 : 400;
      sendJson(response, statusCode, { error: error.message || 'Pi Contact request failed.' });
    }
  });
}
