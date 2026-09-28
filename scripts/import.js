#!/usr/bin/env node
/**
 * 서라벌 CSV → Supabase 가져오기
 *
 *   node scripts/import.js --미리보기   읽고 검사만. 아무것도 안 보낸다
 *   node scripts/import.js              검사 통과하면 Supabase에 넣는다
 *   node scripts/import.js --로컬       Supabase 대신 public/local-data.js 로 (내 PC 미리보기용)
 *
 * 읽는 것 (서라벌한의원 폴더, 비공개 저장소)
 *   블로그키워드/data/posts.csv                  → seo_posts (발행완료만)
 *   블로그키워드/data/keywords.csv + _백업/*.csv → seo_rank_snapshots (키워드·잰날마다 한 줄)
 *
 * 키는 서라벌한의원/_원본/키/.env 에서 읽는다 (저장소에 안 올라가는 곳)
 *   SUPABASE_URL=...
 *   SUPABASE_SECRET_KEY=...   ← Supabase의 secret(또는 service_role) 키. 화면용 키가 아니다
 *
 * 경로를 바꾸려면 SEORABEOL_DIR 환경변수.
 *
 * ★ 검사에서 하나라도 걸리면 아무것도 안 넣고 멈춘다.
 *   3회차 피드백 "검사를 만들어도 빠뜨리면 잘못된 결과가 남는다"에 대한 답 —
 *   사람이 검사를 기억할 필요 없이, 넣는 길목에 검사를 박았다.
 */
const fs = require('fs');
const path = require('path');

const 미리보기 = process.argv.includes('--미리보기');
const 서라벌 = process.env.SEORABEOL_DIR
  || path.resolve(__dirname, '..', '..', '서라벌한의원');
const DATA = path.join(서라벌, '블로그키워드', 'data');
const ENV = path.join(서라벌, '_원본', '키', '.env');

const 계정표 = { '실명 5991': '5991', '실명 최적': '최적', '실명 5992': '5992' };
const 날짜꼴 = /^\d{4}-\d{2}-\d{2}$/;

function csv읽기(파일) {
  const t = fs.readFileSync(파일, 'utf8').replace(/^﻿/, '');
  const 줄들 = [];
  let 줄 = [], 칸 = '', 따옴표 = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (따옴표) {
      if (c === '"' && t[i + 1] === '"') { 칸 += '"'; i++; }
      else if (c === '"') 따옴표 = false;
      else 칸 += c;
    } else if (c === '"') 따옴표 = true;
    else if (c === ',') { 줄.push(칸); 칸 = ''; }
    else if (c === '\n') { 줄.push(칸); 줄들.push(줄); 줄 = []; 칸 = ''; }
    else if (c !== '\r') 칸 += c;
  }
  if (칸 || 줄.length) { 줄.push(칸); 줄들.push(줄); }
  const [머리, ...몸] = 줄들;
  return 몸.filter((r) => r.length > 1).map((r) => Object.fromEntries(머리.map((k, i) => [k.trim(), (r[i] || '').trim()])));
}

function env읽기() {
  if (!fs.existsSync(ENV)) return {};
  return Object.fromEntries(fs.readFileSync(ENV, 'utf8').split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
}

const 문제 = [];

function 순위(값, 어디) {
  if (값 === '') return null;              // 잰 날인데 비어 있으면 = 노출 없음
  if (!/^\d+$/.test(값) || +값 < 1 || +값 > 100) {
    문제.push(`${어디}: 순위 「${값}」 — 1~100 숫자가 아님`);
    return null;
  }
  return +값;
}

// ── 발행 글
const 글들 = csv읽기(path.join(DATA, 'posts.csv'))
  .filter((p) => p.상태 === '발행완료')
  .map((p) => {
    if (!날짜꼴.test(p.날짜)) 문제.push(`posts.csv 「${p.키워드}」: 날짜 「${p.날짜}」 형식이 이상함`);
    return {
      id: `${p.날짜}|${p.키워드}|${p.블로그}`,
      published_on: p.날짜,
      keyword: p.키워드,
      disease: p.질환군 || null,
      post_type: p.글유형 || null,
      blog: p.블로그 || null,
      account: 계정표[p.블로그] || null,
      title: p.제목 || null,
      url: p.링크 || null,
    };
  });

// ── 순위 기록. 오래된 백업부터 읽고, 같은 키워드·같은 날이면 나중 파일이 이긴다
const 백업폴더 = path.join(DATA, '_백업');
const 파일들 = fs.readdirSync(백업폴더).filter((f) => f.endsWith('.csv')).sort()
  .map((f) => path.join(백업폴더, f)).concat(path.join(DATA, 'keywords.csv'));

const 기록 = new Map();
const 덮어씀 = [];
for (const 파일 of 파일들) {
  for (const k of csv읽기(파일)) {
    const 잰날 = k.순위잰날;
    if (!잰날) continue;                      // 순위를 잰 적 없는 키워드
    const 어디 = `${path.basename(파일)} 「${k.키워드}」`;
    if (!날짜꼴.test(잰날)) { 문제.push(`${어디}: 순위잰날 「${잰날}」 형식이 이상함`); continue; }
    const 새것 = {
      keyword: k.키워드,
      measured_on: 잰날,
      rank_5991: 순위(k['5991'], 어디),
      rank_choijeok: 순위(k['최적'], 어디),
      rank_5992: 순위(k['5992'], 어디),
    };
    const 열쇠 = `${k.키워드}|${잰날}`;
    const 옛것 = 기록.get(열쇠);
    if (옛것 && ['rank_5991', 'rank_choijeok', 'rank_5992'].some((c) => 옛것[c] !== 새것[c])) {
      덮어씀.push(`${열쇠}: ${[옛것.rank_5991, 옛것.rank_choijeok, 옛것.rank_5992].join('/')} → ${[새것.rank_5991, 새것.rank_choijeok, 새것.rank_5992].join('/')} (${path.basename(파일)})`);
    }
    기록.set(열쇠, 새것);
  }
}
const 순위들 = [...기록.values()];

console.log(`발행 글 ${글들.length}편 (순위 재는 계정 ${글들.filter((g) => g.account).length}편)`);
console.log(`순위 기록 ${순위들.length}줄 · 파일 ${파일들.length}개 · 날짜 ${new Set(순위들.map((r) => r.measured_on)).size}일`);
if (덮어씀.length) {
  console.log(`\n같은 날 값이 파일마다 달라 나중 파일로 맞춘 것 ${덮어씀.length}건:`);
  덮어씀.slice(0, 10).forEach((d) => console.log('  ' + d));
  if (덮어씀.length > 10) console.log(`  … 외 ${덮어씀.length - 10}건`);
}

if (문제.length) {
  console.error(`\n✗ 검사에서 ${문제.length}건 걸려 아무것도 넣지 않았습니다:`);
  문제.slice(0, 20).forEach((m) => console.error('  ' + m));
  process.exit(1);
}
console.log('\n✓ 검사 통과');
if (미리보기) { console.log('(미리보기 — 보내지 않음)'); process.exit(0); }
if (process.argv.includes('--로컬')) {
  // Supabase 없이 내 PC에서만 실제 데이터로 화면을 본다. 이 파일은 .gitignore 라 저장소에 안 올라간다
  const 파일 = path.join(__dirname, '..', 'public', 'local-data.js');
  fs.writeFileSync(파일, `window.LOCAL_DATA = ${JSON.stringify({ posts: 글들, ranks: 순위들 })};\n`);
  console.log(`로컬 미리보기 파일을 만들었습니다: ${파일}`);
  process.exit(0);
}

const env = { ...env읽기(), ...process.env };
const URL = env.SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error(`\n✗ Supabase 키가 없습니다. ${ENV} 에 SUPABASE_URL 과 SUPABASE_SECRET_KEY 를 넣어 주세요.`);
  process.exit(1);
}

async function 보내기(표, 줄들, 충돌칸) {
  const 머리 = {
    apikey: KEY,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };
  if (KEY.startsWith('eyJ')) 머리.Authorization = `Bearer ${KEY}`;  // 옛 service_role 키(JWT)
  for (let i = 0; i < 줄들.length; i += 500) {
    const 묶음 = 줄들.slice(i, i + 500).map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    const res = await fetch(`${URL.replace(/\/$/, '')}/rest/v1/${표}?on_conflict=${충돌칸}`, {
      method: 'POST', headers: 머리, body: JSON.stringify(묶음),
    });
    if (!res.ok) throw new Error(`${표} ${res.status}: ${await res.text()}`);
  }
  console.log(`  ${표} ${줄들.length}줄 넣음`);
}

(async () => {
  await 보내기('seo_posts', 글들, 'id');
  await 보내기('seo_rank_snapshots', 순위들, 'keyword,measured_on');
  console.log('✓ 끝');
})().catch((e) => { console.error('✗ ' + e.message); process.exit(1); });
