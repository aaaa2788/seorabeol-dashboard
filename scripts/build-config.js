// Vercel 빌드 때 환경변수로 public/config.js 를 만든다.
// 키를 저장소에 적지 않기 위해서다. 변수가 없으면 config.js 를 만들지 않고, 화면은 예시 모드로 뜬다.
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const out = path.join(__dirname, '..', 'public', 'config.js');

if (!url || !key) {
  console.log('SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY 가 없어 예시 모드로 빌드합니다.');
  if (fs.existsSync(out)) fs.unlinkSync(out);
  process.exit(0);
}
fs.writeFileSync(out, `window.APP_CONFIG = ${JSON.stringify({ url, key })};\n`);
console.log('config.js 생성');
