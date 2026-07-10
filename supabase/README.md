# PodToolbox Supabase Backend

Supabase project:

- Project ID: `rcvuuzrjrgzdsfnvfdzz`
- URL: `https://rcvuuzrjrgzdsfnvfdzz.supabase.co`
- Bootstrap admin email: `mdixon@okanemedia.net`

Tables created:

- `public.podtoolbox_admins`
- `public.podcast_members`
- `public.podcast_episodes`
- `public.membership_payments`

Security:

- RLS is enabled on every PodToolbox table.
- Only authenticated users recognized by `app_private.is_podtoolbox_admin()` can read or write backend data.
- The first owner is bootstrapped by email so the matching Supabase Auth user can sign in and manage data.
- Do not put a Supabase service role key in the frontend or DigitalOcean static-site environment.

Local env:

```bash
cp .env.example .env.local
```

Then fill:

```bash
VITE_SUPABASE_URL=https://rcvuuzrjrgzdsfnvfdzz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Admin flow:

1. Open the site.
2. Click **Admin**.
3. Use **Create admin account** with `mdixon@okanemedia.net` if the Auth user does not exist yet.
4. Confirm the email if Supabase email confirmation is enabled.
5. Sign in and manage members, episodes, and payments.
