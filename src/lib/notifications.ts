import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { formatTime } from './date';
import type { DateString, TimeString } from './types';
import {
  buildOccurrences,
  diffSchedule,
  parseDoseNotificationId,
  type DoseOccurrence,
} from './schedule';
import { getDoseRecords, recordedKeys } from './doses';
import { getMedications } from './storage';

/**
 * 알림 채널.
 *
 * 안드로이드는 채널을 한 번 만들면 소리·중요도를 코드로 바꿀 수 없다.
 * 그래서 알람 소리로 바꿀 때 채널 이름을 새로 만들었다. 예전 채널
 * (dose-reminders)은 일반 알림 소리로 굳어 있어 손댈 수 없다.
 */
export const DOSE_CHANNEL_ID = 'dose-alarms-v2';

/**
 * 며칠 앞까지 미리 예약해 둘지, 그리고 한 번에 몇 개까지 예약할지.
 *
 * 알림은 기기에 미리 예약해 두는 방식이므로, 사용자가 앱을 한참 열지 않아도
 * 이 기간만큼은 알림이 계속 울린다. 기간을 늘리면 더 오래 버티지만 예약 개수가
 * 늘어난다. 하루 3번 먹는 약 2개 = 30일 치 180개 수준으로 잡았다.
 */
const WINDOW_DAYS = 30;
const MAX_SCHEDULED = 300;

/** 앱이 켜져 있는 동안에도 알림을 화면에 띄운다. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  });
}

/**
 * 안드로이드 알림 채널. 중요도를 MAX로 둬야 화면 위에 떠오르고 소리가 난다.
 * 채널은 한 번 만들어지면 사용자가 바꾼 설정이 우선이므로, 처음 값이 중요하다.
 */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DOSE_CHANNEL_ID, {
    name: '복약 알람',
    importance: Notifications.AndroidImportance.MAX,
    // 알람 소리로 울린다. 폰이 무음·진동이어도 알람은 음소거되지 않는다.
    // 복용 시각을 놓치지 않는 것이 이 앱의 전부라 알림음이 아니라 알람음을 쓴다.
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
    },
    sound: 'alarm.wav',
    vibrationPattern: [0, 500, 300, 500, 300, 500],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: false,
  });
}

export type PermissionState = {
  /** 알림을 띄울 수 있는지 (안드로이드 13+ POST_NOTIFICATIONS). */
  canNotify: boolean;
  /** 앱에서 다시 물어볼 수 있는지. false면 설정 화면으로 보내야 한다. */
  canAskNotify: boolean;
  /** 정확한 시각에 울릴 수 있는지 (안드로이드 12+ 알람 및 리마인더). */
  exactAlarms: boolean;
  canAskExactAlarms: boolean;
};

export async function readPermissions(): Promise<PermissionState> {
  const notify = await Notifications.getPermissionsAsync();
  if (Platform.OS !== 'android') {
    return {
      canNotify: notify.granted,
      canAskNotify: notify.canAskAgain,
      exactAlarms: true,
      canAskExactAlarms: false,
    };
  }
  const exact = await Notifications.getExactAlarmPermissionsAsync();
  return {
    canNotify: notify.granted,
    canAskNotify: notify.canAskAgain,
    exactAlarms: exact.granted,
    canAskExactAlarms: exact.canAskAgain,
  };
}

/** 알림 권한을 요청한다. 이미 거절된 뒤라면 false를 돌려주고, 호출한 쪽이 설정 화면으로 안내한다. */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/**
 * "알람 및 리마인더" 설정 화면을 열고, 사용자가 돌아오면 결과를 돌려준다.
 * 안드로이드 14부터는 새로 설치한 앱에 이 권한이 기본으로 꺼져 있어서,
 * 이걸 켜지 않으면 알림이 수십 분 늦게 올 수 있다.
 */
export async function requestExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const result = await Notifications.requestExactAlarmPermissionsAsync();
    return result.granted;
  } catch {
    // 사용자가 설정 화면에서 권한을 끄면 안드로이드가 앱을 재시작시키고 약속이 끝나지 않는다.
    return false;
  }
}

export type ScheduleSummary = {
  /** 지금 기기에 예약되어 있는 복용 알림 개수. */
  count: number;
  /** 가장 먼저 울릴 알림. */
  next: DoseOccurrence | null;
};

/** 예약 작업이 겹치지 않게 한 줄로 세운다. (목록 화면 복귀와 저장이 동시에 일어날 수 있다) */
let pending: Promise<ScheduleSummary> = Promise.resolve({ count: 0, next: null });

export function syncSchedule(): Promise<ScheduleSummary> {
  pending = pending.then(runSync, runSync);
  return pending;
}

/**
 * 등록된 약에서 "있어야 할 알림 목록"을 만들고, 기기에 예약된 것과 비교해
 * 없는 것만 새로 걸고 필요 없어진 것만 취소한다.
 *
 * 전부 취소하고 다시 거는 방식이 아니다. 그 사이에 알림이 하나도 없는 순간이
 * 생기고, 매번 수백 개를 다시 예약하게 된다. 알림 식별자를 날짜·시각에서
 * 계산하기 때문에 이렇게 맞춰 볼 수 있다.
 */
async function runSync(): Promise<ScheduleSummary> {
  const permissions = await readPermissions();
  if (!permissions.canNotify) {
    // 권한이 없으면 예약해도 울리지 않는다. 권한을 받은 뒤 다시 부른다.
    return { count: 0, next: null };
  }

  await ensureNotificationChannel();

  const [medications, records] = await Promise.all([getMedications(), getDoseRecords()]);
  const desired = buildOccurrences(medications, new Date(), {
    windowDays: WINDOW_DAYS,
    max: MAX_SCHEDULED,
    // 이미 표시한 회차는 다시 울리지 않는다.
    skip: recordedKeys(records),
  });

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const diff = diffSchedule(
    existing.map((request) => request.identifier),
    desired,
  );

  for (const identifier of diff.toCancel) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }
  for (const occurrence of diff.toSchedule) {
    await scheduleDose(occurrence);
  }

  return { count: desired.length, next: desired[0] ?? null };
}

async function scheduleDose(occurrence: DoseOccurrence): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: occurrence.id,
    content: {
      title: occurrence.medicationName,
      body: `${formatTime(occurrence.time)} · 복용 시간입니다`,
      sound: 'alarm.wav',
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: {
        type: 'dose',
        medicationId: occurrence.medicationId,
        date: occurrence.date,
        time: occurrence.time,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: occurrence.at,
      channelId: DOSE_CHANNEL_ID,
      // 이 앱의 핵심. setAlarmClock()으로 걸리는 알람이라 제조사 절전 기능이
      // 뒤로 미루지 않는다. 'bestEffort'로 두면 기기에 따라 수십 분 늦게 온다.
      delivery: 'alarmClock',
    },
  });
}

/** 기기에 실제로 걸려 있는 복용 알림. 예약 상태를 눈으로 확인할 때 쓴다. */
export type ScheduledDose = {
  id: string;
  title: string;
  date: DateString;
  time: TimeString;
  /** 안드로이드가 알려주는 실제 발동 시각. 식별자와 어긋나면 그게 버그다. */
  firesAt: Date | null;
};

export async function readScheduledDoses(): Promise<ScheduledDose[]> {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  const doses: ScheduledDose[] = [];

  for (const request of requests) {
    const parsed = parseDoseNotificationId(request.identifier);
    if (!parsed) continue;
    doses.push({
      id: request.identifier,
      title: typeof request.content.title === 'string' ? request.content.title : '',
      date: parsed.date,
      time: parsed.time,
      firesAt: triggerDate(request.trigger),
    });
  }

  doses.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return doses;
}

/** 안드로이드가 돌려주는 트리거에서 발동 시각을 꺼낸다. */
function triggerDate(trigger: Notifications.NotificationTrigger): Date | null {
  if (trigger && typeof trigger === 'object' && 'value' in trigger) {
    const value = (trigger as { value: unknown }).value;
    if (typeof value === 'number') return new Date(value);
  }
  return null;
}

/** 테스트용. 지금 쓰는 채널·전달 방식 그대로 잠시 뒤에 울려 본다. */
export async function sendTestNotification(afterSeconds: number): Promise<Date> {
  await ensureNotificationChannel();
  const at = new Date(Date.now() + afterSeconds * 1000);
  await Notifications.scheduleNotificationAsync({
    identifier: `test:${at.getTime()}`,
    content: {
      title: '테스트 알림',
      body: '이 알림이 제시간에 왔다면 알림 설정이 정상입니다.',
      sound: 'alarm.wav',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      channelId: DOSE_CHANNEL_ID,
      delivery: 'alarmClock',
    },
  });
  return at;
}
