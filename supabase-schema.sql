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
  max_devices int not null default 1,
  created_at timestamptz default now()
);

-- Əgər "licenses" cədvəli artıq mövcud idisə (CREATE TABLE IF NOT EXISTS keçdi), sütunu əl ilə əlavə et:
alter table licenses add column if not exists max_devices int not null default 1;

-- Bir lisenziyaya bağlanan bütün cihazlar (max_devices sayına qədər)
create table if not exists license_devices (
  id uuid primary key default gen_random_uuid(),
  license_key text not null references licenses(license_key) on delete cascade,
  device_fingerprint text not null,
  device_info jsonb,
  activated_at timestamptz default now(),
  unique(license_key, device_fingerprint)
);

-- Əgər əvvəlcədən aktivləşmiş (köhnə tək-cihaz) lisenziyalar varsa, onları da köçür
insert into license_devices (license_key, device_fingerprint, device_info, activated_at)
select license_key, device_fingerprint, device_info, coalesce(activated_at, now())
from licenses
where device_fingerprint is not null
on conflict (license_key, device_fingerprint) do nothing;

create table if not exists access_attempts (
  id uuid primary key default gen_random_uuid(),
  license_key text,
  device_fingerprint text,
  device_info jsonb,
  ip text,
  allowed boolean,
  note text,
  geo jsonb,
  attempted_at timestamptz default now()
);

alter table access_attempts add column if not exists geo jsonb;

-- Netlify Functions service_role key ilə işlədiyi üçün RLS-i bağlı saxlamaq kifayətdir
-- (default olaraq açıqdır, əlavə policy lazım deyil, çünki client birbaşa Supabase-ə qoşulmur)
alter table licenses enable row level security;
alter table access_attempts enable row level security;

-- Şəkil/video fayllarını saxlamaq üçün ictimai (public) storage bucket
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
