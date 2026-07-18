import test from 'node:test';
import assert from 'node:assert/strict';
import { createResendProvider } from './resendProvider.js';

test('createResendProvider posts rendered campaign email to Resend API', async () => {
  const calls = [];
  const provider = createResendProvider({
    apiKey: 'test-key',
    fromEmail: 'Pi Contact <hello@example.com>',
    async fetchImpl(url, options) {
      calls.push({ url, options });
      return new Response(JSON.stringify({ id: 'email-123' }), { status: 200 });
    },
  });

  const result = await provider.sendEmail({
    to: 'listener@example.com',
    subject: 'New campaign',
    html: '<p>Hello</p>',
  });

  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].options.headers.authorization, 'Bearer test-key');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    from: 'Pi Contact <hello@example.com>',
    to: ['listener@example.com'],
    subject: 'New campaign',
    html: '<p>Hello</p>',
  });
  assert.equal(result.providerMessageId, 'email-123');
});

test('createResendProvider requires API key and from email', () => {
  assert.throws(() => createResendProvider({ fromEmail: 'hello@example.com' }), /RESEND_API_KEY/);
  assert.throws(() => createResendProvider({ apiKey: 'test-key' }), /PI_CONTACT_FROM_EMAIL/);
});

test('createResendProvider surfaces Resend API errors', async () => {
  const provider = createResendProvider({
    apiKey: 'test-key',
    fromEmail: 'hello@example.com',
    async fetchImpl() {
      return new Response(JSON.stringify({ message: 'domain not verified' }), { status: 403 });
    },
  });

  await assert.rejects(() => provider.sendEmail({ to: 'x@example.com', subject: 'Test', html: '<p>Hi</p>' }), /domain not verified/);
});
