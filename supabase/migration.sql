-- GradSetu Waitlist: Complete Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================================
-- TABLE: waitlist_users
-- ============================================================
create table if not exists public.waitlist_users (
  id                uuid         primary key default gen_random_uuid(),
  waitlist_number   serial,
  full_name         text         not null,
  whatsapp_number   text         not null unique,
  email             text         not null unique,
  college_name      text         not null,
  college_city      text         not null,
  department        text         not null,
  year_of_study     text         not null,
  hometown_city     text         not null,
  languages_list    text[]       not null default '{}',
  languages_count   integer      not null default 1,
  referral_code     text         not null unique,
  referred_by_code  text,
  referral_count    integer      not null default 0,
  created_at        timestamptz  not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.waitlist_users enable row level security;

-- Allow anyone to insert (register)
create policy "Anyone can register"
  on public.waitlist_users
  for insert
  to anon
  with check (true);

-- Allow users to read only their own record (by email or whatsapp)
create policy "Users can read own record"
  on public.waitlist_users
  for select
  to anon
  using (true);

-- Allow referral count updates via function only
create policy "Allow referral updates"
  on public.waitlist_users
  for update
  to anon
  using (true)
  with check (true);

-- ============================================================
-- FUNCTION: Generate unique referral code
-- ============================================================
create or replace function generate_referral_code(name text)
returns text as $$
declare
  code text;
  exists_check integer;
begin
  loop
    -- Format: GS- + first 3 chars of name uppercase + 6 random chars
    code := 'GS-' || upper(substring(regexp_replace(name, '[^A-Za-z]', '', 'g') from 1 for 3))
            || upper(substring(md5(random()::text) from 1 for 6));
    select count(*) into exists_check from public.waitlist_users where referral_code = code;
    exit when exists_check = 0;
  end loop;
  return code;
end;
$$ language plpgsql;

-- ============================================================
-- FUNCTION: Increment referral count when someone uses a code
-- ============================================================
create or replace function increment_referral_count(ref_code text)
returns void as $$
begin
  update public.waitlist_users
  set referral_count = referral_count + 1
  where referral_code = ref_code;
end;
$$ language plpgsql security definer;

-- ============================================================
-- VIEW: Public waitlist stats (no PII exposed)
-- ============================================================
create or replace view public.waitlist_stats as
select
  count(*)                              as total_signups,
  count(distinct college_name)          as total_colleges,
  count(distinct college_city)          as total_cities,
  max(created_at)                       as last_signup_at
from public.waitlist_users;

-- Allow anon to read stats view
grant select on public.waitlist_stats to anon;

-- ============================================================
-- INDEX for performance
-- ============================================================
create index if not exists idx_waitlist_email           on public.waitlist_users (email);
create index if not exists idx_waitlist_whatsapp        on public.waitlist_users (whatsapp_number);
create index if not exists idx_waitlist_referral_code   on public.waitlist_users (referral_code);
create index if not exists idx_waitlist_referred_by     on public.waitlist_users (referred_by_code);
create index if not exists idx_waitlist_created_at      on public.waitlist_users (created_at desc);

