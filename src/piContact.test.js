import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addContact,
  createCampaign,
  getOptedInContacts,
  sendCampaign,
  unsubscribeContact,
} from './piContact.js';

const initialContacts = [
  { id: 'c-1', fullName: 'Milds Dixon', email: 'milds@example.com', status: 'subscribed', source: 'manual', tags: ['podcaster'] },
  { id: 'c-2', fullName: 'No Thanks', email: 'no@example.com', status: 'unsubscribed', source: 'manual', tags: [] },
];

test('addContact normalizes email and requires opt-in consent', () => {
  assert.throws(() => addContact([], { fullName: 'Cold Email', email: 'cold@example.com', consent: false }), /opt-in consent/i);

  const next = addContact([], {
    fullName: '  Jamie Creator  ',
    email: 'JAMIE@EXAMPLE.COM ',
    consent: true,
    source: 'landing page',
    tags: 'newsletter, launch list',
  });

  assert.equal(next.length, 1);
  assert.equal(next[0].fullName, 'Jamie Creator');
  assert.equal(next[0].email, 'jamie@example.com');
  assert.equal(next[0].status, 'subscribed');
  assert.deepEqual(next[0].tags, ['newsletter', 'launch list']);
  assert.ok(next[0].optedInAt);
});

test('addContact updates existing contact instead of creating duplicate emails', () => {
  const next = addContact(initialContacts, {
    fullName: 'Milds D.',
    email: 'MILDS@example.com',
    consent: true,
    tags: ['vip'],
  });

  assert.equal(next.length, initialContacts.length);
  assert.equal(next[0].fullName, 'Milds D.');
  assert.equal(next[0].email, 'milds@example.com');
  assert.deepEqual(next[0].tags, ['vip']);
});

test('sendCampaign sends only to subscribed opt-in contacts and includes unsubscribe footer', () => {
  const campaign = createCampaign({
    subject: 'New episode drop',
    previewText: 'Here is the latest update',
    body: 'Tap in for the new episode and creator resources.',
  });

  const result = sendCampaign(campaign, initialContacts);

  assert.equal(result.sentCount, 1);
  assert.equal(result.skippedCount, 1);
  assert.equal(result.recipients[0].email, 'milds@example.com');
  assert.match(result.messages[0].html, /unsubscribe/i);
  assert.match(result.messages[0].subject, /New episode drop/);
});

test('unsubscribeContact removes a contact from future sends', () => {
  const unsubscribed = unsubscribeContact(initialContacts, 'milds@example.com');
  assert.equal(getOptedInContacts(unsubscribed).length, 0);
});
