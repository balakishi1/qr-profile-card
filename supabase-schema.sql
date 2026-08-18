-- Supabase SQL Editor-də işə sal (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

create table if not exists licenses (
  id uuid primary key default gen_random_uuid(),
  license_key text unique not null,
  owner_name text,
  profile_slug text unique,
  profile_data jsonb default '{"bio":"","links":[]}'::jsonb,
  device_fingerprint text,
  device_info jsonb,
  is_active boolean default true,
  activated_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists access_attempts (
  id uuid primary key default gen_random_uuid(),
  license_key text,
  device_fingerprint text,
  device_info jsonb,
  ip text,
  allowed boolean,
  note text,
  attempted_at timestamptz default now()
);

-- Netlify Functions service_role key ilə işlədiyi üçün RLS-i bağlı saxlamaq kifayətdir
-- (default olaraq açıqdır, əlavə policy lazım deyil, çünki client birbaşa Supabase-ə qoşulmur)
alter table licenses enable row level security;
alter table access_attempts enable row level security;
