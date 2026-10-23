import { addDays, parseDate, toDateString } from './date';
import type { DateString, Medication, TimeString } from './types';

/** 알림 식별자 앞에 붙이는 표시. 이 앱이 예약한 알림만 골라내는 데 쓴다. */
export const DOSE_ID_PREFIX = 'dose';

/** 재알림 식별자 뒤에 붙이는 표시. 정시 알림과 같은 회차를 가리킨다. */
export const FOLLOWUP_SUFFIX = 'again';

/** 정시에 울리는 알림인지, 체크를 안 했을 때 한 번 더 울리는 알림인지. */
export type DoseKind = 'dose' | 'followup';

/** 한 번 울릴 복용 알림 하나. */
export type DoseOccurrence = {
  /** 알림 식별자. 날짜·시각에서 그대로 계산되므로 다시 찾아 취소할 수 있다. */
  id: string;
  kind: DoseKind;
  medicationId: string;
  medicationName: string;
  /** 먹어야 하는 날짜·시각. 재알림도 늦춰진 시각이 아니라 원래 복용 시각을 들고 있다. */
  date: DateString;
  time: TimeString;
  /** 실제로 울릴 시각. 정시 알림은 date·time과 같고, 재알림은 그보다 뒤다. */
  at: Date;
};

export type BuildOptions = {
  /** 오늘부터 며칠 앞까지 예약할지. */
  windowDays: number;
  /** 한 번에 예약해 둘 알림 개수 상한. */
  max: number;
  /**
   * 이미 먹었다고(또는 못 먹었다고) 표시한 회차의 식별자.
   *
   * 알림만 취소하면 다음 동기화에서 되살아난다. 예약을 만드는 쪽에서
   * 빼 줘야 다시 울리지 않는다. 재알림도 같은 열쇠로 걸러진다.
   */
  skip?: ReadonlySet<string>;
  /**
   * 복용 시각보다 이만큼 뒤에 울리는 알림을 만든다(재알림).
   *
   * 복용 시각이 이미 지났어도 재알림 시각이 남아 있으면 만든다. 그러지 않으면
   * 정시 알림이 울린 직후 동기화가 한 번 돌 때 재알림이 사라져 버린다.
   */
  offsetMinutes?: number;
};

export function doseNotificationId(
  medicationId: string,
  date: DateString,
  time: TimeString,
): string {
  return `${DOSE_ID_PREFIX}:${medicationId}:${date}:${time}`;
}

/** 같은 회차의 재알림 식별자. 정시 알림 식별자에서 그대로 계산된다. */
export function followupNotificationId(doseId: string): string {
  return `${doseId}:${FOLLOWUP_SUFFIX}`;
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
 * 이미 지난 알림은 넣지 않는다. 결과는 시간 순으로 정렬되어 있어서
 * max로 자를 때 가까운 알림이 먼저 남는다.
 *
 * offsetMinutes를 주면 같은 회차의 재알림을 만든다.
 */
export function buildOccurrences(
  medications: Medication[],
  now: Date,
  options: BuildOptions,
): DoseOccurrence[] {
  const todayDate = toDateString(now);
  const windowEnd = addDays(todayDate, options.windowDays - 1);
  const nowMs = now.getTime();
  const offsetMs = (options.offsetMinutes ?? 0) * 60_000;
  const kind: DoseKind = offsetMs > 0 ? 'followup' : 'dose';
  const occurrences: DoseOccurrence[] = [];

  for (const medication of medications) {
    // 복용 기간과 예약 창이 겹치는 구간만 본다. "YYYY-MM-DD"는 사전순 비교가 날짜순 비교다.
    const first = medication.startDate > todayDate ? medication.startDate : todayDate;
    const last =
      medication.endDate && medication.endDate < windowEnd ? medication.endDate : windowEnd;
    if (first > last) continue; // 이미 끝난 약, 또는 예약 창보다 늦게 시작하는 약

    for (let date = first; date <= last; date = addDays(date, 1)) {
      for (const time of medication.times) {
        const at = new Date(doseDateTime(date, time).getTime() + offsetMs);
        if (at.getTime() <= nowMs) continue; // 이미 지난 알림
        const doseId = doseNotificationId(medication.id, date, time);
        if (options.skip?.has(doseId)) continue; // 이미 표시한 회차
        occurrences.push({
          id: kind === 'followup' ? followupNotificationId(doseId) : doseId,
          kind,
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

/**
 * 정시 알림과 재알림을 시간 순으로 합치고 개수 상한에 맞춰 자른다.
 *
 * 시각 순으로 자르기 때문에 상한에 걸려 잘리는 쪽은 늘 먼 미래다. 한 회차의
 * 재알림은 정시 알림보다 반드시 뒤에 있으므로, 재알림만 남고 정시 알림이
 * 잘려 나가는 일은 생기지 않는다.
 */
export function mergeOccurrences(
  lists: readonly DoseOccurrence[][],
  max: number,
): DoseOccurrence[] {
  const merged = lists.flat();
  merged.sort((a, b) => a.at.getTime() - b.at.getTime());
  return merged.slice(0, max);
}

/** 기기에 걸려 있는 알림 하나. channelId는 안드로이드가 알려줄 때만 들어 있다. */
export type ExistingNotification = {
  identifier: string;
  channelId?: string | null;
};

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
 *
 * channelId를 주면 채널이 바뀐 알림도 다시 걸 목록에 넣는다. 알림음을 바꾸면
 * 채널이 달라지는데, 이미 걸려 있는 알림은 예전 채널을 들고 있어서 그대로 두면
 * 바뀐 소리로 울리지 않는다.
 */
export function diffSchedule(
  existing: readonly ExistingNotification[],
  desired: readonly DoseOccurrence[],
  channelId?: string,
): ScheduleDiff {
  const desiredIds = new Set(desired.map((occurrence) => occurrence.id));
  const existingById = new Map<string, ExistingNotification>();
  for (const notification of existing) {
    if (isDoseNotificationId(notification.identifier)) {
      existingById.set(notification.identifier, notification);
    }
  }

  const toSchedule: DoseOccurrence[] = [];
  const unchanged: string[] = [];
  for (const occurrence of desired) {
    const already = existingById.get(occurrence.id);
    if (!already) {
      toSchedule.push(occurrence);
    } else if (channelId && already.channelId && already.channelId !== channelId) {
      toSchedule.push(occurrence); // 알림음이 바뀌었다
    } else {
      unchanged.push(occurrence.id);
    }
  }

  return {
    toCancel: [...existingById.keys()].filter((id) => !desiredIds.has(id)),
    toSchedule,
    unchanged,
  };
}

/** 알림 식별자를 되돌려 읽는다. 기기에 실제로 걸려 있는 알림을 확인할 때 쓴다. */
export function parseDoseNotificationId(
  identifier: string,
): { medicationId: string; date: DateString; time: TimeString; kind: DoseKind } | null {
  const parts = identifier.split(':');
  // dose : 약id : YYYY-MM-DD : HH : MM  [ : again ]
  let kind: DoseKind;
  if (parts.length === 5) kind = 'dose';
  else if (parts.length === 6 && parts[5] === FOLLOWUP_SUFFIX) kind = 'followup';
  else return null;
  if (parts[0] !== DOSE_ID_PREFIX) return null;
  const [, medicationId, date, hour, minute] = parts;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}$/.test(hour) || !/^\d{2}$/.test(minute)) {
    return null;
  }
  return { medicationId, date, time: `${hour}:${minute}`, kind };
}

/** 하루치 복용 시각 하나. 이미 지난 시각도 포함한다. */
export type DayDose = {
  medicationId: string;
  medicationName: string;
  time: TimeString;
  at: Date;
};

/**
 * 어떤 날짜에 먹어야 할 복용 시각 전부.
 *
 * buildOccurrences와 달리 지난 시각도 돌려준다. 알림 예약이 아니라
 * "오늘 일정"을 화면에 보여 주기 위한 것이다. 예약 로직은 건드리지 않는다.
 */
export function dosesForDate(medications: Medication[], date: DateString): DayDose[] {
  const doses: DayDose[] = [];

  for (const medication of medications) {
    if (date < medication.startDate) continue;
    if (medication.endDate && date > medication.endDate) continue;
    for (const time of medication.times) {
      doses.push({
        medicationId: medication.id,
        medicationName: medication.name,
        time,
        at: doseDateTime(date, time),
      });
    }
  }

  doses.sort((a, b) => a.at.getTime() - b.at.getTime());
  return doses;
}
