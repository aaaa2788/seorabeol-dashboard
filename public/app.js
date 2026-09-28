// 서라벌 블로그 성과판
// 발행한 글마다 「발행 전 마지막 순위 → 발행 뒤 순위들」을 한 줄로 놓고, 오른 글·빠진 글을 가른다.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const 칸 = { '5991': 'rank_5991', '최적': 'rank_choijeok', '5992': 'rank_5992' };
const 없음 = 999;  // 노출 없음은 가장 나쁜 순위로 비교한다
const $ = (id) => document.getElementById(id);
const 짧은날 = (d) => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const 상태 = { 줄들: [], 결과: '', 계정: '' };

// ── 판정
function 판정(글, 순위기록) {
  const 열 = 칸[글.account];
  const 기록 = 순위기록.filter((r) => r.keyword === 글.keyword)
    .sort((a, b) => a.measured_on.localeCompare(b.measured_on));
  const 전 = 기록.filter((r) => r.measured_on < 글.published_on).at(-1);
  const 후 = 기록.filter((r) => r.measured_on > 글.published_on);
  const 값 = (r) => (r && r[열] != null ? r[열] : null);
  const 줄 = { ...글, 전: 전 ? { 날: 전.measured_on, 순위: 값(전) } : null, 후: 후.map((r) => ({ 날: r.measured_on, 순위: 값(r) })) };

  if (!후.length) return { ...줄, 결과: 'wait', 글자: '아직 안 잼' };
  const 지금 = 값(후.at(-1)) ?? 없음;
  if (!전) return { ...줄, 결과: 'nobase', 글자: 지금 === 없음 ? '노출 없음' : `지금 ${지금}위 · 전 기록 없음` };
  const 앞 = 값(전) ?? 없음;
  // 발행 뒤 올랐다가 도로 내려온 글 — 전과 비교하면 「그대로」지만 가장 먼저 봐야 할 글이다
  const 최고 = Math.min(...후.map((r) => 값(r) ?? 없음));
  if (지금 >= 앞 && 최고 < 지금) return { ...줄, 결과: 'down', 글자: `최고 ${최고}위 → ${지금 === 없음 ? '빠짐' : `${지금}위`}` };
  if (지금 < 앞) return { ...줄, 결과: 'up', 글자: 앞 === 없음 ? `새로 ${지금}위` : `↑ ${앞 - 지금}칸 (${지금}위)` };
  if (지금 > 앞) return { ...줄, 결과: 'down', 글자: 지금 === 없음 ? '빠짐' : `↓ ${지금 - 앞}칸 (${지금}위)` };
  return { ...줄, 결과: 'same', 글자: 지금 === 없음 ? '여전히 없음' : `그대로 ${지금}위` };
}

// ── 그리기
const 묶음 = [
  { key: 'up', 이름: '순위 올라감', 색: 'p-up' },
  { key: 'down', 이름: '내려감 · 빠짐', 색: 'p-down' },
  { key: 'same', 이름: '그대로', 색: 'p-same' },
  { key: 'wait', 이름: '아직 안 잼', 색: 'p-wait' },
];
const 색 = { up: 'p-up', down: 'p-down', same: 'p-same', wait: 'p-wait', nobase: 'p-same' };

function 순위칩(x, 표시) {
  const 글 = x.순위 == null ? '없음' : `${x.순위}위`;
  return `<span class="r${x.순위 == null ? ' none' : ''}">${글}<i>${표시 || 짧은날(x.날)}</i></span>`;
}

function 그리기() {
  const 계정줄 = 상태.줄들.filter((r) => !상태.계정 || r.account === 상태.계정);
  $('tiles').innerHTML = 묶음.map((g) => {
    const n = 계정줄.filter((r) => r.결과 === g.key).length;
    return `<button class="tile" data-k="${g.key}" aria-pressed="${상태.결과 === g.key}"><div class="l">${g.이름}</div><div class="n">${n}편</div></button>`;
  }).join('');
  $('tiles').querySelectorAll('.tile').forEach((b) => b.onclick = () => {
    상태.결과 = 상태.결과 === b.dataset.k ? '' : b.dataset.k;
    그리기();
  });

  const 보일줄 = 계정줄.filter((r) => !상태.결과 || r.결과 === 상태.결과);
  $('count').textContent = `${보일줄.length}편 보는 중${상태.결과 ? ' · 위 칸을 다시 누르면 전체' : ''}`;
  $('list').innerHTML = `<div class="row hd"><span>발행일</span><span>키워드</span><span>계정</span><span>순위 흐름 (발행 전 → 후)</span><span>결과</span></div>`
    + (보일줄.length ? 보일줄.map((r) => {
      const 흐름 = [
        r.전 ? 순위칩(r.전, `전 ${짧은날(r.전.날)}`) : '<span class="r none">기록 없음<i>전</i></span>',
        ...r.후.slice(-4).map((x) => 순위칩(x)),
      ].join('→');
      const 이름 = r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.keyword)}</a>` : esc(r.keyword);
      return `<div class="row${r.결과 === 'down' ? ' down' : ''}">
        <span class="d">${짧은날(r.published_on)}</span>
        <span class="kw">${이름}<small>${esc(r.disease || '')}</small></span>
        <span class="acc">${esc(r.account)}</span>
        <span class="flow">${흐름}</span>
        <span class="pill ${색[r.결과]}">${esc(r.글자)}</span>
      </div>`;
    }).join('') : '<div class="empty">해당하는 글이 없습니다.</div>');
}

function 보여주기(posts, ranks, 메타) {
  상태.줄들 = posts.filter((p) => 칸[p.account]).map((p) => 판정(p, ranks))
    .sort((a, b) => b.published_on.localeCompare(a.published_on));
  const 마지막 = ranks.map((r) => r.measured_on).sort().at(-1);
  $('meta').textContent = `${메타}${마지막 ? ` · 마지막 순위 ${짧은날(마지막)}` : ''}`;
  그리기();
}

$('acc').onchange = (e) => { 상태.계정 = e.target.value; 그리기(); };

// ── 로그인과 데이터
function 예시(안내) {
  $('banner').innerHTML = `<div class="banner">${안내}</div>`;
  보여주기(window.SAMPLE.posts, window.SAMPLE.ranks, '예시 데이터');
}

async function 시작() {
  const cfg = window.APP_CONFIG;
  if (!cfg && window.LOCAL_DATA) {
    $('banner').innerHTML = '<div class="banner">내 PC 미리보기 — 서라벌 CSV에서 바로 읽은 실제 데이터입니다. 인터넷 주소에는 올라가지 않습니다.</div>';
    return 보여주기(window.LOCAL_DATA.posts, window.LOCAL_DATA.ranks, '로컬');
  }
  if (!cfg) return 예시('<b>예시 데이터입니다.</b> 실제 키워드·순위가 아닙니다. (Supabase 연결 전)');

  const sb = createClient(cfg.url, cfg.key);
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    예시(`<b>예시 데이터입니다.</b> 실제 성과는 로그인하면 보입니다.
      <form id="login"><input id="email" type="email" required placeholder="name@example.com" autocomplete="email">
      <button>로그인 링크 받기</button><span id="msg"></span></form>`);
    $('login').onsubmit = async (e) => {
      e.preventDefault();
      const 버튼 = e.submitter || $('login').querySelector('button');
      버튼.disabled = true;  // 두 번 누르면 Supabase가 1분 제한으로 거절한다
      const { error } = await sb.auth.signInWithOtp({ email: $('email').value, options: { emailRedirectTo: location.origin } });
      const 초 = error && (error.message.match(/after (\d+) seconds?/) || [])[1];
      $('msg').textContent = !error ? '메일을 보냈습니다. 메일함(스팸함 포함)에서 링크를 눌러 주세요.'
        : 초 ? `방금 보낸 메일이 있습니다. 메일함을 먼저 확인해 주세요. 다시 받으려면 ${초}초 뒤에 누르세요.`
        : `보내지 못했습니다: ${error.message}`;
      setTimeout(() => { 버튼.disabled = false; }, (초 ? +초 : 60) * 1000);
    };
    return;
  }

  const [p, r] = await Promise.all([
    sb.from('seo_posts').select('*'),
    sb.from('seo_rank_snapshots').select('*').order('measured_on').limit(10000),
  ]);
  if (p.error || r.error) {
    $('banner').innerHTML = `<div class="banner">불러오지 못했습니다: ${esc((p.error || r.error).message)}</div>`;
    return;
  }
  if (!p.data.length) {
    $('banner').innerHTML = `<div class="banner">${esc(session.user.email)} 로 로그인했지만 볼 수 있는 기록이 없습니다. 볼 수 있는 사람 목록(seo_viewers)에 이 이메일이 있는지 확인해 주세요.
      <button id="out">로그아웃</button></div>`;
    $('out').onclick = async () => { await sb.auth.signOut(); location.reload(); };
    return;
  }
  $('banner').innerHTML = '';
  보여주기(p.data, r.data, session.user.email);
}

시작();
