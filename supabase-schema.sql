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

-- Profilə baxış sayğacı (ictimai profil səhifəsində göstərilir)
alter table licenses add column if not exists profile_views bigint not null default 0;

-- Google (Gmail) ilə qeydiyyat/giriş dəstəyi
alter table licenses add column if not exists google_sub text;
alter table licenses add column if not exists google_email text;
create unique index if not exists licenses_google_sub_idx on licenses (google_sub) where google_sub is not null;

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

-- Profil səhifəsindəki "Bizimlə əlaqə" formasından gələn mesajlar
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  license_key text,
  name text,
  email text,
  message text,
  created_at timestamptz default now()
);

-- Platformanın özü barədə istifadəçi rəyləri (ulduz + şərh) — landing səhifədə göstərilir
create table if not exists platform_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating int not null default 5,
  comment text not null,
  avatar_url text,
  social_url text,
  qr_profile_url text,
  created_at timestamptz default now()
);
alter table platform_reviews add column if not exists avatar_url text;
alter table platform_reviews add column if not exists social_url text;
alter table platform_reviews add column if not exists qr_profile_url text;
alter table platform_reviews enable row level security;

-- Netlify Functions service_role key ilə işlədiyi üçün RLS-i bağlı saxlamaq kifayətdir
-- (default olaraq açıqdır, əlavə policy lazım deyil, çünki client birbaşa Supabase-ə qoşulmur)
alter table licenses enable row level security;
alter table access_attempts enable row level security;
alter table contact_messages enable row level security;

-- Şəkil/video fayllarını saxlamaq üçün ictimai (public) storage bucket
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- ============================================================
-- DOSTLUQ + MESAJLAŞMA SİSTEMİ
-- Təhlükəsizlik qeydi: burada istifadəçi "license_key" (məxfi aktivasiya açarı) ilə DEYİL,
-- artıq ictimai olan "profile_slug" ilə tanınır (QR linkində onsuz da paylaşılır).
-- Bütün sorğular Netlify Functions-dan service_role key ilə gedir, client birbaşa Supabase-ə
-- qoşulmur — ona görə RLS-i bağlı saxlamaq (policy əlavə etmədən) kifayətdir.
-- ============================================================

-- İstifadəçinin "onlayn" statusu üçün son aktivlik vaxtı
alter table licenses add column if not exists last_seen timestamptz;

-- Dostluq sorğuları (göndərilib / qəbul edilib / rədd edilib)
create table if not exists friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_slug text not null references licenses(profile_slug) on delete cascade,
  to_slug text not null references licenses(profile_slug) on delete cascade,
  status text not null default 'pending', -- pending | accepted | declined
  created_at timestamptz default now(),
  responded_at timestamptz,
  unique(from_slug, to_slug)
);
create index if not exists friend_requests_to_idx on friend_requests(to_slug, status);
create index if not exists friend_requests_from_idx on friend_requests(from_slug, status);
alter table friend_requests enable row level security;

-- Söhbətlər (fərdi və ya qrup)
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct', -- direct | group
  name text,
  avatar text,
  created_by text references licenses(profile_slug),
  created_at timestamptz default now()
);
alter table conversations enable row level security;

-- Söhbətin üzvləri
create table if not exists conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  slug text not null references licenses(profile_slug) on delete cascade,
  role text not null default 'member', -- admin | member
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  primary key (conversation_id, slug)
);
create index if not exists conv_members_slug_idx on conversation_members(slug);
alter table conversation_members enable row level security;

-- Mesajlar
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_slug text not null references licenses(profile_slug),
  body text not null,
  created_at timestamptz default now()
);
create index if not exists messages_conv_idx on messages(conversation_id, created_at);
alter table messages enable row level security;

-- Mesaj əlavələri: şəkil / video / səs qeydi / fayl / konum
alter table messages add column if not exists msg_type text not null default 'text'; -- text|image|video|audio|file|location
alter table messages add column if not exists attachment_url text;
alter table messages add column if not exists attachment_name text;
alter table messages add column if not exists meta jsonb;

-- Profilə kim baxıb (unikal ziyarətçi = IP-hash üzrə) — "kimlər baxıb, hardan baxıb" bildirişi üçün
create table if not exists profile_views_log (
  id uuid primary key default gen_random_uuid(),
  profile_slug text not null references licenses(profile_slug) on delete cascade,
  ip_hash text not null,
  city text,
  country text,
  first_viewed_at timestamptz default now(),
  last_viewed_at timestamptz default now(),
  view_count int not null default 1,
  seen_by_owner boolean not null default false,
  unique(profile_slug, ip_hash)
);
create index if not exists profile_views_log_slug_idx on profile_views_log(profile_slug, last_viewed_at desc);
alter table profile_views_log enable row level security;
