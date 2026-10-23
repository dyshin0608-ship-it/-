// STORE.md의 문구가 Play Console 글자 수 제한에 맞는지 본다.
// 문구를 고친 뒤 올리기 전에 돌려 보세요.
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, '..', 'STORE.md'), 'utf8');
const blocks = [...md.matchAll(/```\n([\s\S]*?)\n```/g)].map((m) => m[1]);

// STORE.md에 나오는 순서. 개인정보처리방침은 제한이 없다.
const fields = [
  { name: '앱 이름', limit: 30 },
  { name: '앱 이름 (검색어 넣은 쪽)', limit: 30 },
  { name: '짧은 설명', limit: 80 },
  { name: '긴 설명', limit: 4000 },
  { name: '개인정보처리방침', limit: null },
];

if (blocks.length < fields.length) {
  console.error(`STORE.md에서 문구 블록을 ${blocks.length}개만 찾았습니다 (${fields.length}개 필요).`);
  process.exit(1);
}

let over = 0;
for (let i = 0; i < fields.length; i++) {
  const { name, limit } = fields[i];
  const n = [...blocks[i]].length; // 글자 수 (서러게이트 쌍 포함)
  if (limit === null) {
    console.log(`  ${name.padEnd(24)} ${String(n).padStart(5)}자  (제한 없음)`);
    continue;
  }
  const ok = n <= limit;
  if (!ok) over++;
  console.log(
    `  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${name.padEnd(22)} ` +
      `${String(n).padStart(5)} / ${limit}자`,
  );
}

if (over) {
  console.error(`\n${over}개 항목이 제한을 넘었습니다. 줄여서 다시 돌리세요.\n`);
  process.exit(1);
}
console.log('\n모두 제한 안에 있습니다.\n');
