-- Protech AI Hub: initial schema (PostgreSQL 13+; uses built-in gen_random_uuid()).

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  fid           bigint not null unique,          -- verified Farcaster ID (from Quick Auth "sub")
  display_name  text,                            -- reserved; not populated from unverified client data
  created_at    timestamptz not null default now()
);

create table if not exists generations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  tool         text not null check (tool in ('cast_writer', 'reply_assistant', 'project_promoter')),
  title        text not null,
  input_meta   jsonb not null,                   -- the inputs used, so a saved result has context
  output       text not null,                    -- plain-text result (copyable)
  output_data  jsonb,                            -- structured result (project_promoter only)
  model        text not null,
  created_at   timestamptz not null default now()
);

-- History listing: newest first, per user.
create index if not exists generations_user_created_idx
  on generations (user_id, created_at desc, id desc);

create table if not exists usage_records (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  usage_date        date not null,               -- UTC day
  generation_count  integer not null default 0 check (generation_count >= 0),
  unique (user_id, usage_date)
);
