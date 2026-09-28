-- 서라벌 블로그 성과판 — 표와 보안 규칙
-- Supabase → SQL Editor → New query 에 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전하다 (if not exists / or replace).
--
-- todolist 와 같은 프로젝트를 쓰므로 표 이름 앞에 seo_ 를 붙였다.

-- ① 발행한 글. 서라벌 posts.csv 의 「발행완료」 줄만 들어온다.
create table if not exists public.seo_posts (
  id            text primary key,          -- 발행일|키워드|블로그 — 같은 글을 두 번 넣어도 한 줄
  published_on  date not null,
  keyword       text not null,
  disease       text,                      -- 질환군
  post_type     text,                      -- 글유형 (① 진단형 등)
  blog          text,                      -- 원래 적힌 블로그 이름 (실명 최적 등)
  account       text check (account in ('5991', '최적', '5992')),  -- 순위를 재는 계정. 없으면 null
  title         text,
  url           text,
  updated_at    timestamptz not null default now()
);

-- ② 순위 기록. 순위가 바뀔 때마다 덮어쓰지 않고 날짜별로 한 줄씩 쌓는다.
--    이게 이 성과판의 핵심 — 예전엔 keywords.csv 에서 옛 순위가 사라졌다.
create table if not exists public.seo_rank_snapshots (
  keyword       text not null,
  measured_on   date not null,
  rank_5991     smallint check (rank_5991 between 1 and 100),   -- null = 그날 노출 없음
  rank_choijeok smallint check (rank_choijeok between 1 and 100),
  rank_5992     smallint check (rank_5992 between 1 and 100),
  updated_at    timestamptz not null default now(),
  primary key (keyword, measured_on)
);

-- ③ 볼 수 있는 사람. 이메일 링크 로그인은 누구나 할 수 있으므로,
--    로그인만으로는 부족하고 여기 적힌 이메일만 본다.
--    이메일은 저장소에 적지 않는다 — SQL Editor 에서 직접 한 줄 넣는다 (README 참고).
create table if not exists public.seo_viewers (
  email text primary key
);

create or replace function public.seo_is_viewer()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.seo_viewers
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

alter table public.seo_posts          enable row level security;
alter table public.seo_rank_snapshots enable row level security;
alter table public.seo_viewers        enable row level security;  -- 정책 없음 = 화면에서 못 읽음

drop policy if exists "viewers read posts" on public.seo_posts;
create policy "viewers read posts" on public.seo_posts
  for select to authenticated using (public.seo_is_viewer());

drop policy if exists "viewers read ranks" on public.seo_rank_snapshots;
create policy "viewers read ranks" on public.seo_rank_snapshots
  for select to authenticated using (public.seo_is_viewer());

-- 쓰기 정책은 일부러 없다. 넣는 것은 PC의 가져오기 도구(비밀 키)만 한다.
