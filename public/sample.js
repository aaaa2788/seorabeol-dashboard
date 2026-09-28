// 로그인 전이나 키가 없을 때 보여주는 예시 데이터.
// 실제 키워드·순위가 아니다. 화면 모양을 보여주기 위해 지어낸 값이다.
window.SAMPLE = {
  posts: [
    { published_on: '2026-09-15', keyword: '예시 대상포진 병원', disease: '대상포진', account: '5991', title: '예시 글 1', url: null },
    { published_on: '2026-09-08', keyword: '예시 피부질환 한의원', disease: '피부질환', account: '5991', title: '예시 글 2', url: null },
    { published_on: '2026-09-18', keyword: '예시 건선 한의원', disease: '건선', account: '최적', title: '예시 글 3', url: null },
    { published_on: '2026-09-03', keyword: '예시 두드러기 병원', disease: '두드러기', account: '최적', title: '예시 글 4', url: null },
    { published_on: '2026-09-21', keyword: '예시 아토피 한의원', disease: '아토피', account: '5992', title: '예시 글 5', url: null },
  ],
  ranks: [
    { keyword: '예시 대상포진 병원', measured_on: '2026-09-09', rank_5991: null },
    { keyword: '예시 대상포진 병원', measured_on: '2026-09-16', rank_5991: 1 },
    { keyword: '예시 대상포진 병원', measured_on: '2026-09-21', rank_5991: 1 },
    { keyword: '예시 피부질환 한의원', measured_on: '2026-08-19', rank_5991: 13 },
    { keyword: '예시 피부질환 한의원', measured_on: '2026-09-16', rank_5991: 1 },
    { keyword: '예시 건선 한의원', measured_on: '2026-09-09', rank_choijeok: 3 },
    { keyword: '예시 건선 한의원', measured_on: '2026-09-20', rank_choijeok: 1 },
    { keyword: '예시 두드러기 병원', measured_on: '2026-08-27', rank_choijeok: 5 },
    { keyword: '예시 두드러기 병원', measured_on: '2026-09-16', rank_choijeok: null },
    { keyword: '예시 두드러기 병원', measured_on: '2026-09-21', rank_choijeok: null },
    { keyword: '예시 아토피 한의원', measured_on: '2026-09-16', rank_5992: 7 },
  ],
};
