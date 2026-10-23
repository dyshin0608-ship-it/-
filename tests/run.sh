#!/bin/sh
# 기기 없이 확인할 수 있는 순수 로직 테스트.
#
# 날짜 계산, 알림 예약 목록 생성, 기기 예약과의 비교, 복약 기록 보고서 집계.
# expo-notifications나 AsyncStorage를 부르는 부분은 여기서 돌릴 수 없으므로
# 실기기에서 TESTING.md 절차로 확인한다.
set -e
cd "$(dirname "$0")/.."
rm -rf tests/build
npx tsc --ignoreConfig \
  src/lib/schedule.ts \
  src/lib/date.ts \
  src/lib/types.ts \
  src/lib/report.ts \
  src/lib/entitlement.ts \
  --outDir tests/build --module commonjs --target es2020 \
  --moduleResolution node --skipLibCheck --ignoreDeprecations 6.0
node tests/schedule.test.js
node tests/report.test.js
node tests/entitlement.test.js
