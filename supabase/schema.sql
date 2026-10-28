-- The Museum of Things That Think: visitor wall, suggestion wall and archive.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- Safe to re-run: every object is created with "if not exists" / "or replace".
--
-- Security model
--   * The browser only ever uses the public "anon" key.
--   * Visitors can INSERT notes and suggestions; a trigger forces them to
--     'pending', trims them, rate-limits per IP hash and per browser id, and
--     rejects duplicates. Nobody but you (dashboard / service role) can update
--     or delete anything.
--   * Visitors can only SELECT approved entries, and only the public columns
--     (never the browser id or IP hash).
--   * Counting and reporting go through SECURITY DEFINER functions, so the
--     visits and reports tables are never readable from the browser.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- secrets
create table if not exists public.museum_secret (
  id boolean primary key default true check (id),
  salt text not null default encode(extensions.gen_random_bytes(24), 'hex')
);
insert into public.museum_secret default values on conflict do nothing;
alter table public.museum_secret enable row level security;   -- no policies: unreadable from the API

-- ---------------------------------------------------------------- tables
create table if not exists public.guestbook (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  visitor_id  uuid not null,
  name        text not null check (char_length(name) between 1 and 24),
  look        jsonb not null default '{}'::jsonb check (pg_column_size(look) < 400),
  message     text not null check (char_length(message) between 2 and 280),
  exhibit     text check (exhibit in ('rag','chat','geo','plant','xai','water','sound')),
  status      text not null default 'pending' check (status in ('pending','approved','hidden')),
  ip_hash     text
);

create table if not exists public.suggestions (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  visitor_id  uuid not null,
  name        text not null check (char_length(name) between 1 and 24),
  look        jsonb not null default '{}'::jsonb check (pg_column_size(look) < 400),
  category    text not null check (category in ('feature','museum','project','design','aiml','general')),
  message     text not null check (char_length(message) between 2 and 280),
  exhibit     text check (exhibit in ('rag','chat','geo','plant','xai','water','sound')),
  status      text not null default 'pending' check (status in ('pending','approved','hidden')),
  ip_hash     text
);

create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('guestbook','suggestions')),
  item_id     bigint not null,
  visitor_id  uuid not null,
  reason      text check (char_length(reason) <= 140),
  unique (kind, item_id, visitor_id)
);

-- one row per explorer per day; an "explorer" is a browser that entered the
-- museum with an avatar (and so agreed to the notice in the avatar dialog)
create table if not exists public.visits (
  visitor_id  uuid not null,
  day         date not null default (now() at time zone 'utc')::date,
  primary key (visitor_id, day)
);

create index if not exists guestbook_status_idx   on public.guestbook (status, created_at desc);
create index if not exists suggestions_status_idx on public.suggestions (status, created_at desc);
create index if not exists guestbook_rate_idx     on public.guestbook (created_at, ip_hash);
create index if not exists suggestions_rate_idx   on public.suggestions (created_at, ip_hash);

-- ---------------------------------------------------------------- guard trigger
create or replace function public.museum_guard() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  hdrs json;
  ip   text;
  h    text;
  n    int;
begin
  begin
    hdrs := current_setting('request.headers', true)::json;
  exception when others then hdrs := null;
  end;
  ip := coalesce(nullif(btrim(split_part(hdrs->>'x-forwarded-for', ',', 1)), ''), hdrs->>'x-real-ip', 'unknown');
  select encode(extensions.digest(ip || (select salt from public.museum_secret), 'sha256'), 'hex') into h;

  new.ip_hash    := h;
  new.status     := 'pending';            -- every entry waits for review
  new.created_at := now();
  new.name       := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.message    := btrim(regexp_replace(new.message, '[[:cntrl:]]', ' ', 'g'));
  if char_length(new.name) < 1 or char_length(new.message) < 2 then
    raise exception 'invalid' using errcode = 'P0001';
  end if;

  -- per person: 3 entries per 10 minutes, 10 per day (by IP hash or browser id)
  execute format('select count(*) from public.%I where (ip_hash = $1 or visitor_id = $2) and created_at > now() - interval ''10 minutes''', tg_table_name)
    into n using h, new.visitor_id;
  if n >= 3 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  execute format('select count(*) from public.%I where (ip_hash = $1 or visitor_id = $2) and created_at > now() - interval ''1 day''', tg_table_name)
    into n using h, new.visitor_id;
  if n >= 10 then raise exception 'rate_limited' using errcode = 'P0001'; end if;

  -- whole wall: at most 60 new entries per 10 minutes (flood brake)
  execute format('select count(*) from public.%I where created_at > now() - interval ''10 minutes''', tg_table_name) into n;
  if n >= 60 then raise exception 'busy' using errcode = 'P0001'; end if;

  -- the same text twice in a day
  execute format('select count(*) from public.%I where (ip_hash = $1 or visitor_id = $2) and lower(message) = lower($3) and created_at > now() - interval ''1 day''', tg_table_name)
    into n using h, new.visitor_id, new.message;
  if n > 0 then raise exception 'duplicate' using errcode = 'P0001'; end if;

  return new;
end $$;

drop trigger if exists guestbook_guard on public.guestbook;
create trigger guestbook_guard before insert on public.guestbook for each row execute function public.museum_guard();
drop trigger if exists suggestions_guard on public.suggestions;
create trigger suggestions_guard before insert on public.suggestions for each row execute function public.museum_guard();

-- ---------------------------------------------------------------- access rules
alter table public.guestbook   enable row level security;
alter table public.suggestions enable row level security;
alter table public.reports     enable row level security;
alter table public.visits      enable row level security;

revoke all on public.guestbook, public.suggestions, public.reports, public.visits, public.museum_secret from anon, authenticated;
grant select (id, created_at, name, look, message, exhibit)            on public.guestbook   to anon, authenticated;
grant select (id, created_at, name, look, category, message, exhibit)  on public.suggestions to anon, authenticated;
grant insert (visitor_id, name, look, message, exhibit)                on public.guestbook   to anon, authenticated;
grant insert (visitor_id, name, look, category, message, exhibit)      on public.suggestions to anon, authenticated;

drop policy if exists "approved notes are public"      on public.guestbook;
drop policy if exists "anyone can leave a note"        on public.guestbook;
drop policy if exists "approved ideas are public"      on public.suggestions;
drop policy if exists "anyone can suggest"             on public.suggestions;
create policy "approved notes are public" on public.guestbook   for select to anon, authenticated using (status = 'approved');
create policy "anyone can leave a note"   on public.guestbook   for insert to anon, authenticated with check (status = 'pending');
create policy "approved ideas are public" on public.suggestions for select to anon, authenticated using (status = 'approved');
create policy "anyone can suggest"        on public.suggestions for insert to anon, authenticated with check (status = 'pending');
-- (no update / delete policies: only you, from the dashboard, can change or remove entries)

-- ---------------------------------------------------------------- functions
-- record that this explorer entered today (idempotent)
create or replace function public.log_visit(vid uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.visits (visitor_id) values (vid) on conflict do nothing;
$$;

-- the archive's numbers, all derived from real rows
create or replace function public.museum_stats() returns json
language sql security definer stable set search_path = public as $$
  select json_build_object(
    'today',       (select count(*) from public.visits where day = (now() at time zone 'utc')::date),
    'total',       (select count(distinct visitor_id) from public.visits),
    'since',       (select min(day) from public.visits),
    'notes',       (select count(*) from public.guestbook where status = 'approved'),
    'suggestions', (select count(*) from public.suggestions),
    'ideas_shown', (select count(*) from public.suggestions where status = 'approved')
  );
$$;

-- report an entry; three different reporters send it back to review
create or replace function public.report_item(p_kind text, p_id bigint, vid uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_kind not in ('guestbook','suggestions') then raise exception 'invalid' using errcode = 'P0001'; end if;
  insert into public.reports (kind, item_id, visitor_id, reason) values (p_kind, p_id, vid, left(p_reason, 140)) on conflict do nothing;
  select count(*) into n from public.reports where kind = p_kind and item_id = p_id;
  if n >= 3 then
    execute format('update public.%I set status = ''pending'' where id = $1 and status = ''approved''', p_kind) using p_id;
  end if;
end $$;

revoke all on function public.log_visit(uuid), public.museum_stats(), public.report_item(text, bigint, uuid, text) from public;
grant execute on function public.log_visit(uuid), public.museum_stats(), public.report_item(text, bigint, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------- moderation helpers (dashboard only)
create or replace view public.moderation_queue with (security_invoker = true) as
  select 'guestbook' as kind, id, created_at, name, null::text as category, message, exhibit, status,
         (select count(*) from public.reports r where r.kind = 'guestbook' and r.item_id = g.id) as reports
    from public.guestbook g where status = 'pending'
  union all
  select 'suggestions', id, created_at, name, category, message, exhibit, status,
         (select count(*) from public.reports r where r.kind = 'suggestions' and r.item_id = s.id)
    from public.suggestions s where status = 'pending'
  order by created_at;
revoke all on public.moderation_queue from anon, authenticated;
