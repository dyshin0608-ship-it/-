import { addDays, parseDate, toDateString } from './date';
import type { DateString, Medication, TimeString } from './types';

/** 알림 식별자 앞에 붙이는 표시. 이 앱이 예약한 알림만 골라내는 데 쓴다. */
export const DOSE_ID_PREFIX = 'dose';

/** 한 번 울릴 복용 알림 하나. */
export type DoseOccurrence = {
  /** 알림 식별자. 날짜·시각에서 그대로 계산되므로 다시 찾아 취소할 수 있다. */
  id: string;
  medicationId: string;
  medicationName: string;
  date: DateString;
  time: TimeString;
  at: Date;
};

export type BuildOptions = {
  /** 오늘부터 며칠 앞까지 예약할지. */
  windowDays: number;
  /** 한 번에 예약해 둘 알림 개수 상한. */
  max: number;
};

export function doseNotificationId(
  medicationId: string,
  date: DateString,
  time: TimeString,
): string {
  return `${DOSE_ID_PREFIX}:${medicationId}:${date}:${time}`;
}

export function isDoseNotificationId(identifier: string): boolean {
  return identifier.startsWith(`${DOSE_ID_PREFIX}:`);
}

/** "YYYY-MM-DD"와 "HH:MM"을 기기 로컬 시간의 Date로 합친다. */
export function doseDateTime(date: DateString, time: TimeString): Date {
  const [hour, minute] = time.split(':').map(Number);
  const at = parseDate(date);
  at.setHours(hour, minute, 0, 0);
  return at;
}

/**
 * 등록된 약들로부터 앞으로 울릴 복용 시각을 모두 만든다.
 *
 * 하루 한 번 반복(DAILY) 알림을 쓰지 않고 시각마다 한 발씩 예약하는 이유:
 * 복용 시작일·종료일을 정확히 지킬 수 있고(감기약 7일치는 딱 7일만 울린다),
 * 나중에 "먹었어요"를 누른 그 한 번만 취소할 수 있다.
 *
 * 이미 지난 시각은 넣지 않는다. 결과는 시간 순으로 정렬되어 있어서
 * max로 자를 때 가까운 알림이 먼저 남는다.
 */
export function buildOccurrences(
  medications: Medication[],
  now: Date,
  options: BuildOptions,
): DoseOccurrence[] {
  const todayDate = toDateString(now);
  const windowEnd = addDays(todayDate, options.windowDays - 1);
  const nowMs = now.getTime();
  const occurrences: DoseOccurrence[] = [];

  for (const medication of medications) {
    // 복용 기간과 예약 창이 겹치는 구간만 본다. "YYYY-MM-DD"는 사전순 비교가 날짜순 비교다.
    const first = medication.startDate > todayDate ? medication.startDate : todayDate;
    const last =
      medication.endDate && medication.endDate < windowEnd ? medication.endDate : windowEnd;
    if (first > last) continue; // 이미 끝난 약, 또는 예약 창보다 늦게 시작하는 약

    for (let date = first; date <= last; date = addDays(date, 1)) {
      for (const time of medication.times) {
        const at = doseDateTime(date, time);
        if (at.getTime() <= nowMs) continue; // 이미 지난 시각
        occurrences.push({
          id: doseNotificationId(medication.id, date, time),
          medicationId: medication.id,
          medicationName: medication.name,
          date,
          time,
          at,
        });
      }
    }
  }

  occurrences.sort((a, b) => a.at.getTime() - b.at.getTime());
  return occurrences.slice(0, options.max);
}

export type ScheduleDiff = {
  /** 취소해야 할 알림 식별자. */
  toCancel: string[];
  /** 새로 걸어야 할 알림. */
  toSchedule: DoseOccurrence[];
  /** 이미 제대로 걸려 있어서 손대지 않는 알림 식별자. */
  unchanged: string[];
};

/**
 * 기기에 걸려 있는 알림과 걸려 있어야 할 알림을 비교한다.
 *
 * 이 앱이 걸지 않은 알림(식별자 앞에 dose: 가 없는 것)은 결과에 넣지 않는다.
 * 남의 알림을 지우지 않기 위해서다.
 */
export function diffSchedule(existingIds: string[], desired: DoseOccurrence[]): ScheduleDiff {
  const desiredIds = new Set(desired.map((occurrence) => occurrence.id));
  const existing = new Set(existingIds.filter(isDoseNotificationId));

  return {
    toCancel: [...existing].filter((id) => !desiredIds.has(id)),
    toSchedule: desired.filter((occurrence) => !existing.has(occurrence.id)),
    unchanged: desired.filter((occurrence) => existing.has(occurrence.id)).map(({ id }) => id),
  };
}

/** 알림 식별자를 되돌려 읽는다. 기기에 실제로 걸려 있는 알림을 확인할 때 쓴다. */
export function parseDoseNotificationId(
  identifier: string,
): { medicationId: string; date: DateString; time: TimeString } | null {
  const parts = identifier.split(':');
  // dose : 약id : YYYY-MM-DD : HH : MM
  if (parts.length !== 5 || parts[0] !== DOSE_ID_PREFIX) return null;
  const [, medicationId, date, hour, minute] = parts;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}$/.test(hour) || !/^\d{2}$/.test(minute)) {
    return null;
  }
  return { medicationId, date, time: `${hour}:${minute}` };
}
