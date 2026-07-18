export function createResendProvider({ apiKey, fromEmail, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('RESEND_API_KEY is required for Resend live sending.');
  if (!fromEmail) throw new Error('PI_CONTACT_FROM_EMAIL is required for Resend live sending.');
  if (typeof fetchImpl !== 'function') throw new Error('Resend provider requires fetch.');

  return {
    name: 'resend',
    async sendEmail(message) {
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [message.to],
          subject: message.subject,
          html: message.html,
        }),
      });

      const text = await response.text();
      let body = {};
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = { raw: text };
        }
      }

      if (!response.ok) {
        const detail = body.message || body.error || text || `HTTP ${response.status}`;
        throw new Error(`Resend send failed: ${detail}`);
      }

      return {
        provider: 'resend',
        providerMessageId: body.id,
        to: message.to,
        statusCode: response.status,
      };
    },
  };
}
