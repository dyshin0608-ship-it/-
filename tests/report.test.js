const assert = require('assert');
const R = require('./build/report.js');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  \x1b[32m✓\x1b[0m ' + name); pass++; }
  catch (e) { console.log('  \x1b[31m✗\x1b[0m ' + name + '\n      ' + e.message); fail++; }
}

const med = (over = {}) => ({
  id: 'm1', name: '타이레놀', times: ['09:00', '21:00'],
  startDate: '2026-03-01', endDate: null, createdAt: '2026-03-01T00:00:00.000Z',
  ...over,
});
const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi, 0, 0);
const rec = (pairs) => {
  const out = {};
  for (const [key, status] of pairs) out[key] = { status, recordedAt: '2026-03-05T00:00:00.000Z' };
  return out;
};

console.log('\n집계');
test('때가 지난 회차만 센다', () => {
  // 3/1 ~ 3/2, 하루 두 번. 3/2 12:00 기준이면 3/2 21:00은 아직 때가 아니다.
  const r = R.buildReport([med()], {}, '2026-03-01', '2026-03-02', at(2026, 3, 2, 12, 0));
  assert.strictEqual(r.total.due, 3, '09:00, 21:00, 09:00 = 3회');
  assert.strictEqual(r.total.unmarked, 3);
});
test('표시하지 않은 회차를 못 먹음으로 세지 않는다', () => {
  const r = R.buildReport([med()], {}, '2026-03-01', '2026-03-01', at(2026, 3, 2, 0, 0));
  assert.strictEqual(r.total.missed, 0, '표시 없음은 못 먹음이 아니다');
  assert.strictEqual(r.total.unmarked, 2);
});
test('세 가지 상태를 따로 센다', () => {
  const records = rec([
    ['dose:m1:2026-03-01:09:00', 'taken'],
    ['dose:m1:2026-03-01:21:00', 'missed'],
    ['dose:m1:2026-03-02:09:00', 'unknown'],
  ]);
  const r = R.buildReport([med()], records, '2026-03-01', '2026-03-02', at(2026, 3, 2, 12, 0));
  assert.deepStrictEqual(r.total, { due: 3, taken: 1, missed: 1, unknown: 1, unmarked: 0 });
});
test('합계가 항상 맞는다', () => {
  const records = rec([['dose:m1:2026-03-01:09:00', 'taken'], ['dose:m1:2026-03-03:21:00', 'missed']]);
  const r = R.buildReport([med()], records, '2026-03-01', '2026-03-05', at(2026, 3, 6, 0, 0));
  const t = r.total;
  assert.strictEqual(t.taken + t.missed + t.unknown + t.unmarked, t.due);
  assert.strictEqual(t.due, 10, '5일 × 2회');
});
test('종료일이 지난 약은 그 뒤로 세지 않는다', () => {
  const r = R.buildReport([med({ endDate: '2026-03-02' })], {}, '2026-03-01', '2026-03-05',
    at(2026, 3, 6, 0, 0));
  assert.strictEqual(r.total.due, 4, '3/1~3/2만 = 4회');
});
test('기간 안에 먹을 일 없는 약은 보고서에 안 들어간다', () => {
  const r = R.buildReport([med(), med({ id: 'm2', name: '비타민', startDate: '2026-04-01' })],
    {}, '2026-03-01', '2026-03-02', at(2026, 3, 3, 0, 0));
  assert.deepStrictEqual(r.medications.map((m) => m.name), ['타이레놀']);
});
test('약별로도 따로 센다', () => {
  const records = rec([['dose:m1:2026-03-01:09:00', 'taken'], ['dose:m2:2026-03-01:08:00', 'missed']]);
  const r = R.buildReport(
    [med(), med({ id: 'm2', name: '비타민', times: ['08:00'] })],
    records, '2026-03-01', '2026-03-01', at(2026, 3, 2, 0, 0));
  const byName = Object.fromEntries(r.medications.map((m) => [m.name, m.tally]));
  assert.strictEqual(byName['타이레놀'].taken, 1);
  assert.strictEqual(byName['비타민'].missed, 1);
  assert.strictEqual(byName['비타민'].due, 1);
});
test('기록이 있는 날만 날짜별 표에 넣는다', () => {
  const r = R.buildReport([med({ endDate: '2026-03-02' })], {}, '2026-03-01', '2026-03-05',
    at(2026, 3, 6, 0, 0));
  assert.deepStrictEqual(r.days.map((d) => d.date), ['2026-03-01', '2026-03-02']);
});

console.log('\n복용률');
test('표시한 회차만으로 계산한다', () => {
  // 먹음 1, 못 먹음 1, 표시 없음 8 → 1/2 = 50%. 1/10 = 10%가 아니다.
  const records = rec([['dose:m1:2026-03-01:09:00', 'taken'], ['dose:m1:2026-03-01:21:00', 'missed']]);
  const r = R.buildReport([med()], records, '2026-03-01', '2026-03-05', at(2026, 3, 6, 0, 0));
  assert.strictEqual(R.adherence(r.total), 0.5);
});
test('표시한 게 하나도 없으면 0%가 아니라 모른다', () => {
  const r = R.buildReport([med()], {}, '2026-03-01', '2026-03-05', at(2026, 3, 6, 0, 0));
  assert.strictEqual(R.adherence(r.total), null, '0을 돌려주면 "하나도 안 먹었다"는 거짓이 된다');
});
test('모름은 분모에 들어간다', () => {
  const records = rec([['dose:m1:2026-03-01:09:00', 'taken'], ['dose:m1:2026-03-01:21:00', 'unknown']]);
  const r = R.buildReport([med()], records, '2026-03-01', '2026-03-01', at(2026, 3, 2, 0, 0));
  assert.strictEqual(R.adherence(r.total), 0.5);
});

console.log('\nHTML');
test('숫자가 그대로 들어간다', () => {
  const records = rec([['dose:m1:2026-03-01:09:00', 'taken'], ['dose:m1:2026-03-01:21:00', 'missed']]);
  const r = R.buildReport([med()], records, '2026-03-01', '2026-03-01', at(2026, 3, 2, 0, 0));
  const html = R.renderReportHtml(r);
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('50.0%'), '복용률');
  assert.ok(html.includes('타이레놀'));
  assert.ok(html.includes('먹음') && html.includes('못 먹음'));
});
test('바깥에서 가져오는 자원이 없다', () => {
  const r = R.buildReport([med()], {}, '2026-03-01', '2026-03-01', at(2026, 3, 2, 0, 0));
  const html = R.renderReportHtml(r);
  assert.ok(!/https?:\/\//.test(html), '인터넷 없이도 PDF가 만들어져야 한다');
  assert.ok(!/<img|<script|@import|url\(/.test(html));
});
test('약 이름의 HTML 특수문자를 막는다', () => {
  const r = R.buildReport([med({ name: '<script>x</script>&"' })], {}, '2026-03-01', '2026-03-01',
    at(2026, 3, 2, 0, 0));
  const html = R.renderReportHtml(r);
  assert.ok(!html.includes('<script>x'), '약 이름이 태그로 해석되면 안 된다');
  assert.ok(html.includes('&lt;script&gt;'));
});
test('기록이 없어도 HTML이 깨지지 않는다', () => {
  const r = R.buildReport([], {}, '2026-03-01', '2026-03-05', at(2026, 3, 6, 0, 0));
  const html = R.renderReportHtml(r);
  assert.ok(html.includes('복용 기록이 없습니다'));
  assert.ok(html.includes('—'), '복용률은 0%가 아니라 —');
});

console.log(`\n${pass}개 통과, ${fail}개 실패\n`);
process.exit(fail ? 1 : 0);
