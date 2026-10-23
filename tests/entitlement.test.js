const assert = require('assert');
const E = require('./build/entitlement.js');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log('  \x1b[32m✓\x1b[0m ' + name); pass++; }
  catch (e) { console.log('  \x1b[31m✗\x1b[0m ' + name + '\n      ' + e.message); fail++; }
}

const now = new Date(2026, 9, 23, 12, 0);
const owned = { owned: true, checkedAt: '2026-10-01T00:00:00.000Z' };

console.log('\n구매 상태 합치기');
test('샀다고 하면 갖는다', () => {
  const r = E.reconcile(null, { ok: true, owned: true }, now);
  assert.strictEqual(r.owned, true);
  assert.strictEqual(r.checkedAt, now.toISOString());
});
test('확실히 안 샀다고 하면 뺏는다 (환불·다른 계정)', () => {
  assert.strictEqual(E.reconcile(owned, { ok: true, owned: false }, now), null);
});
test('못 물어봤으면 갖고 있던 걸 그대로 둔다 (비행기 모드)', () => {
  assert.deepStrictEqual(E.reconcile(owned, { ok: false }, now), owned,
    '인터넷이 없다고 산 기능을 잠그면 안 된다');
});
test('못 물어봤고 원래 없었으면 그대로 없다', () => {
  assert.strictEqual(E.reconcile(null, { ok: false }, now), null);
});
test('확인할 때마다 확인 시각이 새로 찍힌다', () => {
  const later = new Date(2026, 9, 24, 9, 0);
  const r = E.reconcile(owned, { ok: true, owned: true }, later);
  assert.strictEqual(r.checkedAt, later.toISOString());
});
test('오래 확인 못 해도 저절로 만료되지 않는다', () => {
  // 일회성 구매라 기한이 없다. 1년 전에 확인했어도 유지된다.
  const stale = { owned: true, checkedAt: '2025-01-01T00:00:00.000Z' };
  assert.deepStrictEqual(E.reconcile(stale, { ok: false }, now), stale);
});

console.log('\n상품 ID');
test('상품 ID가 정해져 있다', () => {
  assert.strictEqual(E.EXPORT_PRODUCT_ID, 'ttobak.export.lifetime');
  assert.ok(/^[a-z0-9._]+$/.test(E.EXPORT_PRODUCT_ID), 'Play Console이 받는 형식이어야 한다');
});

console.log(`\n${pass}개 통과, ${fail}개 실패\n`);
process.exit(fail ? 1 : 0);
