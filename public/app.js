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
  // 같은 날짜들로 세 계정 순위를 모두 싣는다 — 이 글이 빠져도 다른 계정 글이 노출 중일 수 있다
  //   (9/30 원장: 시트엔 5991 1위인데 최적 글은 「빠짐」. 발행 계정만 보지 말고 세 계정을 한 번에)
  const 보일날 = [전, ...후.slice(-4)].filter(Boolean);
  const 계정표 = Object.entries(칸).map(([k, c]) => ({ 계정: k, 이글: k === 글.account, 순위들: 보일날.map((r) => r[c] ?? null) }));
  const 줄 = { ...글, 계정표, 보일날: 보일날.map((r) => r.measured_on), 전있음: !!전,
    전: 전 ? { 날: 전.measured_on, 순위: 값(전) } : null, 후: 후.map((r) => ({ 날: r.measured_on, 순위: 값(r) })) };

  if (!후.length) return { ...줄, 결과: 'wait', 글자: '아직 안 잼' };

  // 긴급 = 가장 최근 측정에서 세 계정 모두 5위 밖 (원장 기준 9/30)
  //   한 계정이라도 5위 안이면 한의원은 노출 중이라 급하지 않다. 글 하나가 아니라 키워드로 본다
  const 최근 = 후.at(-1);
  const 최고계정 = Object.entries(칸).map(([k, c]) => ({ 계정: k, 순위: 최근[c] ?? 없음 }))
    .sort((a, b) => a.순위 - b.순위)[0];
  if (최고계정.순위 > 5) return { ...줄, 결과: 'urgent', 글자: '긴급 · 5위 안 없음' };

  const 지금 = 값(최근) ?? 없음;
  const 앞 = 전 ? 값(전) ?? 없음 : null;
  if (앞 != null && 지금 < 앞) return { ...줄, 결과: 'up', 글자: 앞 === 없음 ? `새로 ${지금}위` : `↑ ${앞 - 지금}칸 (${지금}위)` };
  return { ...줄, 결과: 'ok', 글자: `${최고계정.계정} ${최고계정.순위}위로 노출 중` };
}

// ── 그리기
const 묶음 = [
  { key: 'urgent', 이름: '긴급 · 세 계정 모두 5위 밖', 색: 'p-down' },
  { key: 'up', 이름: '이 글로 순위 올라감', 색: 'p-up' },
  { key: 'ok', 이름: '5위 안 노출 중', 색: 'p-same' },
  { key: 'wait', 이름: '아직 안 잼', 색: 'p-wait' },
];
const 색 = { urgent: 'p-down', up: 'p-up', ok: 'p-same', wait: 'p-wait' };

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
      // 세 계정 × 같은 날짜. 이 글을 올린 계정 줄을 진하게, 나머지는 흐리게
      const 날머리 = r.보일날.map((d, i) => `<i>${i === 0 && r.전있음 ? '전 ' : ''}${짧은날(d)}</i>`).join('');
      const 흐름 = !r.보일날.length ? '<span class="r none">기록 없음</span>'
        : `<div class="accs" style="--n:${r.보일날.length}"><b></b>${날머리}${r.계정표.map((a) =>
          `<b class="${a.이글 ? 'mine' : ''}">${esc(a.계정)}${a.이글 ? ' ✎' : ''}</b>${a.순위들.map((v) =>
            `<span class="c${v == null ? ' none' : ''}${v === 1 ? ' top' : ''}${a.이글 ? ' mine' : ''}">${v == null ? '–' : `${v}위`}</span>`).join('')}`).join('')}</div>`;
      const 이름 = r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.keyword)}</a>` : esc(r.keyword);
      return `<div class="row${r.결과 === 'urgent' ? ' down' : ''}">
        <span class="d">${짧은날(r.published_on)}</span>
        <span class="kw">${이름}<small>${esc(r.disease || '')}</small></span>
        <span class="acc">${esc(r.account)}</span>
        <span class="flow">${흐름}</span>
        <span class="res"><span class="pill ${색[r.결과]}">${esc(r.글자)}</span></span>
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

  // Supabase는 한 번에 1,000줄까지만 준다. 나눠서 끝까지 받는다
  //   (2026-09-30: 순위 기록이 1,172줄이 되자 최근 날짜가 잘려 9/29·9/30이 화면에서 빠졌다)
  const 전부 = async (표, 정렬) => {
    const 쪽 = 1000, 모음 = [];
    for (let 시작 = 0; ; 시작 += 쪽) {
      let q = sb.from(표).select('*');
      for (const 칸이름 of 정렬) q = q.order(칸이름);  // 같은 날짜가 수백 줄이라 키워드까지 정렬해야 쪽 경계에서 겹치거나 빠지지 않는다
      const { data, error } = await q.range(시작, 시작 + 쪽 - 1);
      if (error) return { error };
      모음.push(...data);
      if (data.length < 쪽) return { data: 모음 };
    }
  };
  const [p, r] = await Promise.all([전부('seo_posts', ['id']), 전부('seo_rank_snapshots', ['measured_on', 'keyword'])]);
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
