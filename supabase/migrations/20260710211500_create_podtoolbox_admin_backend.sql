create extension if not exists citext with schema public;

create schema if not exists app_private;

create table if not exists public.podtoolbox_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  email public.citext unique not null,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function app_private.is_podtoolbox_admin()
returns boolean
language sql
security definer
set search_path = public, app_private
stable
as $$
  select exists (
    select 1
    from public.podtoolbox_admins admins
    where admins.user_id = (select auth.uid())
       or lower(admins.email::text) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;

revoke all on function app_private.is_podtoolbox_admin() from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_podtoolbox_admin() to authenticated;

create table if not exists public.podcast_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email public.citext unique not null,
  plan text not null default 'Starter' check (plan in ('Starter', 'Studio', 'Network')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  joined_on date not null default current_date,
  renewal_on date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  episode_number integer unique,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  publish_date date,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.podcast_members(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'paid' check (status in ('paid', 'pending', 'failed', 'refunded')),
  provider text not null default 'manual',
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_podcast_members_updated_at on public.podcast_members;
create trigger set_podcast_members_updated_at
before update on public.podcast_members
for each row execute function public.set_updated_at();

drop trigger if exists set_podcast_episodes_updated_at on public.podcast_episodes;
create trigger set_podcast_episodes_updated_at
before update on public.podcast_episodes
for each row execute function public.set_updated_at();

alter table public.podtoolbox_admins enable row level security;
alter table public.podcast_members enable row level security;
alter table public.podcast_episodes enable row level security;
alter table public.membership_payments enable row level security;

drop policy if exists "PodToolbox admins can read admins" on public.podtoolbox_admins;
create policy "PodToolbox admins can read admins"
on public.podtoolbox_admins
for select
to authenticated
using (app_private.is_podtoolbox_admin());

drop policy if exists "PodToolbox admins can insert admins" on public.podtoolbox_admins;
create policy "PodToolbox admins can insert admins"
on public.podtoolbox_admins
for insert
to authenticated
with check (app_private.is_podtoolbox_admin());

drop policy if exists "PodToolbox admins can update admins" on public.podtoolbox_admins;
create policy "PodToolbox admins can update admins"
on public.podtoolbox_admins
for update
to authenticated
using (app_private.is_podtoolbox_admin())
with check (app_private.is_podtoolbox_admin());

drop policy if exists "PodToolbox admins can delete admins" on public.podtoolbox_admins;
create policy "PodToolbox admins can delete admins"
on public.podtoolbox_admins
for delete
to authenticated
using (app_private.is_podtoolbox_admin());

drop policy if exists "PodToolbox admins manage members" on public.podcast_members;
create policy "PodToolbox admins manage members"
on public.podcast_members
for all
to authenticated
using (app_private.is_podtoolbox_admin())
with check (app_private.is_podtoolbox_admin());

drop policy if exists "PodToolbox admins manage episodes" on public.podcast_episodes;
create policy "PodToolbox admins manage episodes"
on public.podcast_episodes
for all
to authenticated
using (app_private.is_podtoolbox_admin())
with check (app_private.is_podtoolbox_admin());

drop policy if exists "PodToolbox admins manage payments" on public.membership_payments;
create policy "PodToolbox admins manage payments"
on public.membership_payments
for all
to authenticated
using (app_private.is_podtoolbox_admin())
with check (app_private.is_podtoolbox_admin());

grant select, insert, update, delete on public.podtoolbox_admins to authenticated;
grant select, insert, update, delete on public.podcast_members to authenticated;
grant select, insert, update, delete on public.podcast_episodes to authenticated;
grant select, insert, update, delete on public.membership_payments to authenticated;

insert into public.podtoolbox_admins (email, role)
values ('mdixon@okanemedia.net', 'owner')
on conflict (email) do update set role = excluded.role;

insert into public.podcast_members (full_name, email, plan, status, joined_on, renewal_on, notes)
values
  ('Jamie Park', 'jamie@park.com', 'Studio', 'active', '2026-05-10', '2026-08-10', 'Loyal audience workshop member.'),
  ('Riley Cooper', 'riley@cooper.com', 'Starter', 'active', '2026-05-09', '2026-08-09', 'New show launch.'),
  ('Taylor Morgan', 'taylor@morgan.com', 'Studio', 'trialing', '2026-05-06', '2026-08-06', 'Interested in paid community tools.'),
  ('Casey Lee', 'casey@lee.com', 'Network', 'active', '2026-05-02', '2026-08-02', 'Manages multiple shows.')
on conflict (email) do update
set full_name = excluded.full_name,
    plan = excluded.plan,
    status = excluded.status,
    joined_on = excluded.joined_on,
    renewal_on = excluded.renewal_on,
    notes = excluded.notes;

insert into public.podcast_episodes (episode_number, title, status, publish_date, description)
values
  (58, 'Building a loyal audience', 'published', '2026-05-11', 'How creators turn listeners into members.'),
  (57, 'Gear that actually matters', 'published', '2026-05-04', 'A practical podcast production setup.'),
  (56, 'Monetization strategies', 'scheduled', '2026-05-18', 'Membership offers, pricing, and retention.'),
  (55, 'Interview with Mia Lee', 'draft', '2026-04-27', 'Guest interview edit in progress.')
on conflict (episode_number) do update
set title = excluded.title,
    status = excluded.status,
    publish_date = excluded.publish_date,
    description = excluded.description;

insert into public.membership_payments (member_id, amount_cents, status, provider, paid_at)
select id, 4900, 'paid', 'manual', '2026-07-01'
from public.podcast_members
where email in ('jamie@park.com', 'taylor@morgan.com')
on conflict do nothing;

insert into public.membership_payments (member_id, amount_cents, status, provider, paid_at)
select id, 12900, 'paid', 'manual', '2026-07-01'
from public.podcast_members
where email = 'casey@lee.com'
on conflict do nothing;
