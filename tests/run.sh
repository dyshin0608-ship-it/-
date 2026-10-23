#!/bin/sh
# 알림 예약 로직 테스트.
#
# 기기 없이 확인할 수 있는 순수 로직만 돌린다(날짜 계산, 예약 목록 생성,
# 기기 예약과의 비교). expo-notifications를 부르는 부분은 실기기에서
# TESTING.md 절차로 확인한다.
set -e
cd "$(dirname "$0")/.."
rm -rf tests/build
npx tsc --ignoreConfig src/lib/schedule.ts src/lib/date.ts src/lib/types.ts \
  --outDir tests/build --module commonjs --target es2020 \
  --moduleResolution node --skipLibCheck --ignoreDeprecations 6.0
node tests/schedule.test.js
