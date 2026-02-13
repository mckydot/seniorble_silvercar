-- Security-critical tables (Supabase SQL Editor에서 실행)
-- 1) users 테이블이 없다면 아래 실행 후, 2) refresh_tokens 실행

-- 보호자(guardian) 계정 테이블 (없을 때만 생성) - 회원가입 계정은 전부 보호자
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

-- Refresh token 저장 (해시만 저장)
create table if not exists public.refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  revoked boolean not null default false,
  expires_at timestamptz not null,
  last_used_at timestamptz null,
  user_agent text null,
  ip text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_refresh_tokens_user_id on public.refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_expires_at on public.refresh_tokens(expires_at);

-- Optional: keep revoked/expired tokens cleaned periodically via scheduled job.
