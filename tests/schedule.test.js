const assert = require('assert');
const S = require('./build/schedule.js');

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
const WIN = { windowDays: 30, max: 400 };

console.log('\n식별자');
test('정시 알림 식별자', () => {
  assert.strictEqual(S.doseNotificationId('m1', '2026-03-05', '09:00'), 'dose:m1:2026-03-05:09:00');
});
test('재알림 식별자는 정시 알림에서 파생된다', () => {
  assert.strictEqual(S.followupNotificationId('dose:m1:2026-03-05:09:00'), 'dose:m1:2026-03-05:09:00:again');
});
test('정시 알림 식별자를 되읽는다', () => {
  assert.deepStrictEqual(S.parseDoseNotificationId('dose:m1:2026-03-05:09:00'),
    { medicationId: 'm1', date: '2026-03-05', time: '09:00', kind: 'dose' });
});
test('재알림 식별자를 되읽으면 원래 복용 시각이 나온다', () => {
  assert.deepStrictEqual(S.parseDoseNotificationId('dose:m1:2026-03-05:09:00:again'),
    { medicationId: 'm1', date: '2026-03-05', time: '09:00', kind: 'followup' });
});
test('남의 알림 식별자는 읽지 않는다', () => {
  for (const bad of ['test:123', 'preview:bell:1', 'dose:m1:2026-03-05', 'dose:m1:2026-3-5:09:00',
                     'dose:m1:2026-03-05:09:00:other', 'dose:m1:2026-03-05:09:00:again:x']) {
    assert.strictEqual(S.parseDoseNotificationId(bad), null, bad);
  }
});

console.log('\n정시 알림 예약');
test('지난 시각은 예약하지 않는다', () => {
  const out = S.buildOccurrences([med()], at(2026, 3, 5, 12, 0), WIN);
  assert.strictEqual(out[0].id, 'dose:m1:2026-03-05:21:00');
  assert.ok(out.every(o => o.kind === 'dose'));
});
test('종료일이 있으면 딱 그날까지만', () => {
  // 감기약 7일치: 3/1 ~ 3/7, 하루 두 번 = 14회. 3/1 09:00 전에 세면 14개.
  const out = S.buildOccurrences([med({ endDate: '2026-03-07' })], at(2026, 3, 1, 8, 0), WIN);
  assert.strictEqual(out.length, 14);
  assert.strictEqual(out[out.length - 1].id, 'dose:m1:2026-03-07:21:00');
});
test('표시한 회차는 다시 예약하지 않는다', () => {
  const skip = new Set(['dose:m1:2026-03-05:21:00']);
  const out = S.buildOccurrences([med()], at(2026, 3, 5, 12, 0), { ...WIN, skip });
  assert.ok(!out.some(o => o.id.includes('2026-03-05:21:00')));
});

console.log('\n다시 알림');
test('재알림은 복용 시각보다 설정한 만큼 뒤에 울린다', () => {
  const out = S.buildOccurrences([med()], at(2026, 3, 5, 12, 0), { ...WIN, offsetMinutes: 10 });
  const first = out[0];
  assert.strictEqual(first.id, 'dose:m1:2026-03-05:21:00:again');
  assert.strictEqual(first.kind, 'followup');
  assert.strictEqual(first.time, '21:00', '원래 복용 시각을 들고 있어야 한다');
  assert.strictEqual(first.at.getTime(), at(2026, 3, 5, 21, 10).getTime());
});
test('정시가 막 지난 회차의 재알림은 살아 있다 (핵심)', () => {
  // 09:00 알림이 3분 전에 울렸다. 체크 전이므로 09:10 재알림이 남아 있어야 한다.
  const now = at(2026, 3, 5, 9, 3);
  const doses = S.buildOccurrences([med()], now, WIN);
  const followups = S.buildOccurrences([med()], now, { ...WIN, offsetMinutes: 10 });
  assert.ok(!doses.some(o => o.id === 'dose:m1:2026-03-05:09:00'), '정시 알림은 지났다');
  assert.strictEqual(followups[0].id, 'dose:m1:2026-03-05:09:00:again', '재알림은 남아 있어야 한다');
});
test('재알림 시각까지 지나면 사라진다', () => {
  const followups = S.buildOccurrences([med()], at(2026, 3, 5, 9, 11), { ...WIN, offsetMinutes: 10 });
  assert.ok(!followups.some(o => o.id === 'dose:m1:2026-03-05:09:00:again'));
});
test('체크하면 정시 알림과 재알림이 함께 사라진다', () => {
  const now = at(2026, 3, 5, 9, 3);
  const skip = new Set([S.doseNotificationId('m1', '2026-03-05', '09:00')]);
  const followups = S.buildOccurrences([med()], now, { ...WIN, skip, offsetMinutes: 10 });
  assert.ok(!followups.some(o => o.id.startsWith('dose:m1:2026-03-05:09:00')));
});
test('재알림을 끄면(0분) 아무것도 만들지 않는다', () => {
  const out = S.buildOccurrences([med()], at(2026, 3, 5, 12, 0), { ...WIN, offsetMinutes: 0 });
  assert.ok(out.every(o => o.kind === 'dose'), 'offset 0은 정시 알림과 같다');
});
test('종료일 마지막 회차의 재알림도 종료일 안에 있다', () => {
  const out = S.buildOccurrences([med({ endDate: '2026-03-07' })], at(2026, 3, 1, 8, 0),
    { ...WIN, offsetMinutes: 10 });
  assert.strictEqual(out.length, 14);
  assert.strictEqual(out[out.length - 1].at.getTime(), at(2026, 3, 7, 21, 10).getTime());
});

console.log('\n목록 합치기');
test('시간 순으로 섞인다', () => {
  const now = at(2026, 3, 5, 8, 0);
  const doses = S.buildOccurrences([med()], now, WIN);
  const followups = S.buildOccurrences([med()], now, { ...WIN, offsetMinutes: 10 });
  const merged = S.mergeOccurrences([doses, followups], 4);
  assert.deepStrictEqual(merged.map(o => o.id), [
    'dose:m1:2026-03-05:09:00',
    'dose:m1:2026-03-05:09:00:again',
    'dose:m1:2026-03-05:21:00',
    'dose:m1:2026-03-05:21:00:again',
  ]);
});
test('상한에 걸려 잘려도 재알림만 남는 일은 없다', () => {
  const now = at(2026, 3, 5, 8, 0);
  const doses = S.buildOccurrences([med()], now, WIN);
  const followups = S.buildOccurrences([med()], now, { ...WIN, offsetMinutes: 10 });
  for (let max = 1; max <= 20; max++) {
    const merged = S.mergeOccurrences([doses, followups], max);
    const ids = new Set(merged.map(o => o.id));
    for (const o of merged) {
      if (o.kind !== 'followup') continue;
      const parent = o.id.slice(0, -(':again'.length));
      assert.ok(ids.has(parent), `max=${max}: ${o.id}의 정시 알림이 없다`);
    }
  }
});

console.log('\n기기 예약과 비교');
const occ = (id) => ({ id, kind: id.endsWith(':again') ? 'followup' : 'dose', medicationId: 'm1',
  medicationName: '타이레놀', date: '2026-03-05', time: '09:00', at: at(2026, 3, 5, 9, 0) });

test('없는 것만 새로 걸고 필요 없어진 것만 취소한다', () => {
  const existing = [
    { identifier: 'dose:m1:2026-03-05:09:00', channelId: 'dose-alarms-v2' },
    { identifier: 'dose:m1:2026-03-05:21:00', channelId: 'dose-alarms-v2' },
  ];
  const d = S.diffSchedule(existing, [occ('dose:m1:2026-03-05:09:00'), occ('dose:m1:2026-03-06:09:00')],
    'dose-alarms-v2');
  assert.deepStrictEqual(d.toCancel, ['dose:m1:2026-03-05:21:00']);
  assert.deepStrictEqual(d.toSchedule.map(o => o.id), ['dose:m1:2026-03-06:09:00']);
  assert.deepStrictEqual(d.unchanged, ['dose:m1:2026-03-05:09:00']);
});
test('남이 건 알림은 건드리지 않는다', () => {
  const existing = [
    { identifier: 'test:12345', channelId: 'dose-alarms-v2' },
    { identifier: 'preview:bell:12345', channelId: 'dose-alarms-v2-bell' },
    { identifier: 'something-else', channelId: null },
  ];
  const d = S.diffSchedule(existing, [], 'dose-alarms-v2');
  assert.deepStrictEqual(d.toCancel, []);
});
test('알림음을 바꾸면 이미 걸린 알림도 다시 건다', () => {
  const existing = [{ identifier: 'dose:m1:2026-03-05:09:00', channelId: 'dose-alarms-v2' }];
  const d = S.diffSchedule(existing, [occ('dose:m1:2026-03-05:09:00')], 'dose-alarms-v2-urgent');
  assert.deepStrictEqual(d.toSchedule.map(o => o.id), ['dose:m1:2026-03-05:09:00']);
  assert.deepStrictEqual(d.unchanged, []);
  assert.deepStrictEqual(d.toCancel, [], '같은 식별자로 덮어쓰므로 취소하지 않는다');
});
test('알림음이 같으면 손대지 않는다', () => {
  const existing = [{ identifier: 'dose:m1:2026-03-05:09:00', channelId: 'dose-alarms-v2-urgent' }];
  const d = S.diffSchedule(existing, [occ('dose:m1:2026-03-05:09:00')], 'dose-alarms-v2-urgent');
  assert.deepStrictEqual(d.unchanged, ['dose:m1:2026-03-05:09:00']);
  assert.deepStrictEqual(d.toSchedule, []);
});
test('채널을 알 수 없으면 괜히 다시 걸지 않는다', () => {
  const existing = [{ identifier: 'dose:m1:2026-03-05:09:00', channelId: null }];
  const d = S.diffSchedule(existing, [occ('dose:m1:2026-03-05:09:00')], 'dose-alarms-v2-urgent');
  assert.deepStrictEqual(d.unchanged, ['dose:m1:2026-03-05:09:00']);
});
test('재알림도 같은 규칙으로 취소된다', () => {
  const existing = [{ identifier: 'dose:m1:2026-03-05:09:00:again', channelId: 'dose-alarms-v2' }];
  const d = S.diffSchedule(existing, [], 'dose-alarms-v2');
  assert.deepStrictEqual(d.toCancel, ['dose:m1:2026-03-05:09:00:again']);
});

console.log(`\n${pass}개 통과, ${fail}개 실패\n`);
process.exit(fail ? 1 : 0);
