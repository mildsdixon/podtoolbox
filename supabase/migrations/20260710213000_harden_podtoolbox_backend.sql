create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on public.podtoolbox_admins from anon;
revoke all on public.podcast_members from anon;
revoke all on public.podcast_episodes from anon;
revoke all on public.membership_payments from anon;

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.set_updated_at() from anon;
