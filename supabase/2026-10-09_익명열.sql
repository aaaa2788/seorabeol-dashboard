-- 익명 정원장 블로그 순위 열 (2026-10-09)
-- 원장: "익명 정원장 블로그의 순위 열을 시트와 성과판에 만들어 줘."
--
-- 이미 만들어 둔 표에 더하는 것이다. schema.sql 은 새로 만들 때 쓰는 모양(이 열이 이미 들어 있다).
-- Supabase → SQL Editor → New query 에 전체를 붙여넣고 Run. 여러 번 실행해도 안전하다.
-- 한 덩어리(begin … commit)로 돈다 — 열만 생기고 계정 검사가 안 바뀌는 반쪽 상태를 막는다.
-- import.js 는 rank_anon 열이 있는지 먼저 읽어 보고, 있으면 익명 순위와 익명 글을 같이 보낸다.

begin;

-- ① 순위 기록에 익명 칸. null = 그날 노출 없음 (다른 세 칸과 같다)
alter table public.seo_rank_snapshots
  add column if not exists rank_anon smallint check (rank_anon between 1 and 100);

-- ② 발행 글의 계정에 '익명' 허용. 전에는 익명 글이 account = null 로 들어가 화면에서 빠졌다
--    옛 검사 이름은 보통 seo_posts_account_check 지만, 이름이 달라도 account 를 보는 검사는 모두 지우고 다시 건다
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.seo_posts'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%account%'
  loop
    execute format('alter table public.seo_posts drop constraint %I', c);
  end loop;
end $$;
alter table public.seo_posts
  add constraint seo_posts_account_check check (account in ('5991', '최적', '5992', '익명'));

commit;

-- 확인 (따로 실행) — rank_anon 이 보이면 된 것
-- select column_name from information_schema.columns where table_name = 'seo_rank_snapshots' order by ordinal_position;
