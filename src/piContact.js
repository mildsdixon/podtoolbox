function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim();
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);
  return String(tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function makeId(prefix = 'pc') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOptedInContacts(contacts) {
  return [...contacts].filter((contact) => contact.status === 'subscribed' && contact.email);
}

export function addContact(contacts, input) {
  const email = normalizeEmail(input.email);
  const fullName = normalizeName(input.fullName || input.name);

  if (!input.consent) throw new Error('Podtacts requires opt-in consent before adding a contact.');
  if (!validateEmail(email)) throw new Error('Enter a valid email address.');
  if (!fullName) throw new Error('Contact name is required.');

  const nextContact = {
    id: input.id || makeId('contact'),
    fullName,
    email,
    status: 'subscribed',
    source: input.source || 'manual',
    tags: normalizeTags(input.tags),
    optedInAt: input.optedInAt || new Date().toISOString(),
    unsubscribedAt: null,
  };

  const existingIndex = contacts.findIndex((contact) => normalizeEmail(contact.email) === email);
  if (existingIndex === -1) return [nextContact, ...contacts];

  return contacts.map((contact, index) => (
    index === existingIndex
      ? { ...contact, ...nextContact, id: contact.id || nextContact.id }
      : contact
  ));
}

export function unsubscribeContact(contacts, email) {
  const normalized = normalizeEmail(email);
  return contacts.map((contact) => (
    normalizeEmail(contact.email) === normalized
      ? { ...contact, status: 'unsubscribed', unsubscribedAt: new Date().toISOString() }
      : contact
  ));
}

export function createCampaign(input) {
  const subject = String(input.subject || '').trim();
  const previewText = String(input.previewText || '').trim();
  const body = String(input.body || '').trim();

  if (!subject) throw new Error('Campaign subject is required.');
  if (!body) throw new Error('Campaign body is required.');

  return {
    id: input.id || makeId('campaign'),
    subject,
    previewText,
    body,
    status: input.status || 'draft',
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMessage(campaign, contact) {
  const safeBody = escapeHtml(campaign.body).replace(/\n/g, '<br />');
  const unsubscribeUrl = `https://podtoolbox.local/pi-contact/unsubscribe?email=${encodeURIComponent(contact.email)}`;
  return {
    to: contact.email,
    subject: campaign.subject,
    html: `
      <article style="font-family:Arial,sans-serif;line-height:1.5;color:#17212b">
        ${campaign.previewText ? `<p style="color:#56616f">${escapeHtml(campaign.previewText)}</p>` : ''}
        <div>${safeBody}</div>
        <hr />
        <p style="font-size:12px;color:#56616f">You are receiving this because you opted in to Podtacts updates. <a href="${unsubscribeUrl}">Unsubscribe</a>.</p>
      </article>
    `.trim(),
  };
}

export function sendCampaign(campaign, contacts) {
  const recipients = getOptedInContacts(contacts);
  const skippedCount = contacts.length - recipients.length;
  const sentAt = new Date().toISOString();
  const messages = recipients.map((contact) => renderMessage(campaign, contact));

  return {
    campaign: { ...campaign, status: 'sent', sentAt },
    recipients,
    messages,
    sentCount: recipients.length,
    skippedCount,
    sentAt,
  };
}
