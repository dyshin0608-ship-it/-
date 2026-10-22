import AsyncStorage from '@react-native-async-storage/async-storage';

import { addDays, today } from './date';
import { doseNotificationId } from './schedule';
import type { DateString, TimeString } from './types';

/**
 * 한 회차를 어떻게 했는지.
 *
 * "모름"을 따로 둔 이유: 먹었는지 기억이 안 나는 일이 실제로 흔한데,
 * 그걸 "먹음"이나 "못 먹음" 중 하나로 고르게 하면 기록이 거짓이 된다.
 */
export type DoseStatus = 'taken' | 'missed' | 'unknown';

export type DoseRecord = {
  status: DoseStatus;
  /** 표시한 시각. 나중에 기록을 고칠 때 쓴다. */
  recordedAt: string;
};

/** 회차 식별자 → 기록. 식별자는 알림 식별자와 같아서 서로 짝이 맞는다. */
export type DoseRecords = Record<string, DoseRecord>;

const KEY = 'medi.doses.v1';

/** 오래된 기록은 지운다. 1년이면 기록 화면에서 돌아볼 만큼 넉넉하다. */
const KEEP_DAYS = 365;

/** 회차 하나를 가리키는 열쇠. 알림 식별자와 같은 문자열을 쓴다. */
export function doseKey(
  medicationId: string,
  date: DateString,
  time: TimeString,
): string {
  return doseNotificationId(medicationId, date, time);
}

function isRecord(value: unknown): value is DoseRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return r.status === 'taken' || r.status === 'missed' || r.status === 'unknown';
}

export async function getDoseRecords(): Promise<DoseRecords> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: DoseRecords = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isRecord(value)) out[key] = value;
    }
    return out;
  } catch {
    // 저장된 내용이 깨졌더라도 앱이 멈추지는 않게 한다.
    return {};
  }
}

/** 기록 날짜가 너무 오래됐으면 버린다. 식별자에 날짜가 들어 있어 그걸로 가른다. */
function prune(records: DoseRecords): DoseRecords {
  const cutoff = addDays(today(), -KEEP_DAYS);
  const out: DoseRecords = {};
  for (const [key, record] of Object.entries(records)) {
    const date = key.split(':')[2];
    if (!date || date >= cutoff) out[key] = record;
  }
  return out;
}

/** 상태를 적는다. null을 주면 표시를 지운다(= 다시 알림이 온다). */
export async function setDoseStatus(
  key: string,
  status: DoseStatus | null,
): Promise<void> {
  const records = await getDoseRecords();
  if (status === null) delete records[key];
  else records[key] = { status, recordedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEY, JSON.stringify(prune(records)));
}

/** 이미 표시한 회차들. 알림을 다시 걸지 않도록 예약 생성기에 넘긴다. */
export function recordedKeys(records: DoseRecords): Set<string> {
  return new Set(Object.keys(records));
}
