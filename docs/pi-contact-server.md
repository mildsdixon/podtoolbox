# Pi Contact Server

Pi Contact has a local backend process for contacts, campaigns, demo sends, and optional live email delivery through Resend.

## Start in demo mode

```bash
cd /Users/mildsdixon/Documents/Pod\ Toolbox
npm run contact
```

Default server:

```text
http://127.0.0.1:5191
```

Health check:

```bash
curl http://127.0.0.1:5191/api/pi-contact/health
```

## Start with Resend live sending

1. Create a Free account at <https://resend.com>.
2. Verify your domain/sender in Resend.
3. Create an API key in Resend.
4. Create `/Users/mildsdixon/Documents/Pod Toolbox/.env.local` with:

```bash
PI_CONTACT_MODE=live
RESEND_API_KEY=your_resend_api_key_here
PI_CONTACT_FROM_EMAIL=Pi Contact <hello@yourdomain.com>
```

Then run:

```bash
npm run contact
```

If you do not set `PI_CONTACT_MODE=live`, Pi Contact stays in safe demo mode and will not send real emails.

## What works now

- Saves opt-in contacts to a local JSON data file
- Requires opt-in consent before adding a subscribed contact
- Normalizes/de-duplicates emails
- Unsubscribes contacts
- Creates campaign records
- Prepares demo sends only to subscribed contacts
- Sends live emails through Resend when live mode is configured
- Logs provider message IDs for live sends
- Logs demo send results
- Adds unsubscribe footer to rendered email HTML

## Data file

Default:

```text
/Users/mildsdixon/Documents/Pod Toolbox/data/pi-contact.json
```

Override:

```bash
PI_CONTACT_DATA=/path/to/pi-contact.json npm run contact
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/pi-contact/health` | Server status |
| GET | `/api/pi-contact/state` | Contacts, campaigns, send log |
| GET | `/api/pi-contact/contacts` | Contact list |
| POST | `/api/pi-contact/contacts` | Add/update opt-in contact |
| POST | `/api/pi-contact/unsubscribe` | Mark contact unsubscribed |
| POST | `/api/pi-contact/campaigns` | Create campaign draft |
| POST | `/api/pi-contact/campaigns/send` | Demo send or live provider send |

## Demo send example

```bash
curl -X POST http://127.0.0.1:5191/api/pi-contact/contacts \
  -H 'content-type: application/json' \
  -d '{"fullName":"Milds Dixon","email":"milds@example.com","consent":true,"tags":"vip,launch"}'

curl -X POST http://127.0.0.1:5191/api/pi-contact/campaigns/send \
  -H 'content-type: application/json' \
  -d '{"subject":"New episode","previewText":"Tap in","body":"The new episode is live."}'
```

## Important

The code is ready for Resend. The only thing Nate cannot do from Hermes is personally create/own the Resend account for you, because signup/payment/login and API-key creation need your account access. Once you paste the Free account API key into `.env.local`, Pi Contact can run in live mode.
