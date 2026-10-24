import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { formatTime } from './date';
import type { DateString, TimeString } from './types';
import {
  buildOccurrences,
  diffSchedule,
  followupNotificationId,
  mergeOccurrences,
  parseDoseNotificationId,
  type DoseKind,
  type DoseOccurrence,
} from './schedule';
import { getDoseRecords, recordedKeys } from './doses';
import { getMedications } from './storage';
import { ALARM_SOUNDS, getSettings, soundFor, type AlarmSound } from './settings';

/**
 * 며칠 앞까지 미리 예약해 둘지, 그리고 한 번에 몇 개까지 예약할지.
 *
 * 알림은 기기에 미리 예약해 두는 방식이므로, 사용자가 앱을 한참 열지 않아도
 * 이 기간만큼은 알림이 계속 울린다. 기간을 늘리면 더 오래 버티지만 예약 개수가
 * 늘어난다. 재알림을 켜면 한 회차가 알림 두 개를 쓴다.
 */
const WINDOW_DAYS = 30;
const MAX_SCHEDULED = 400;

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
 * 채널은 한 번 만들어지면 소리를 코드로 바꿀 수 없어서 알림음마다 채널이 따로 있다.
 */
export async function ensureNotificationChannel(sound: AlarmSound): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(sound.channelId, {
    name: `복약 알람 (${sound.label})`,
    importance: Notifications.AndroidImportance.MAX,
    // 알람 소리로 울린다. 폰이 무음·진동이어도 알람은 음소거되지 않는다.
    // 복용 시각을 놓치지 않는 것이 이 앱의 전부라 알림음이 아니라 알람음을 쓴다.
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: { enforceAudibility: true, requestHardwareAudioVideoSynchronization: false },
    },
    sound: sound.file,
    vibrationPattern: [0, 500, 300, 500, 300, 500],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: false,
  });
}

/**
 * 지금 쓰지 않는 알림음 채널을 지운다. 안드로이드 알림 설정에 안 쓰는 채널이
 * 쌓이지 않게 하려는 것이다.
 *
 * 반드시 예약을 다시 걸은 "뒤에" 부른다. 채널을 먼저 지우면 그 채널로 걸려 있던
 * 알림이 울릴 때 조용히 사라진다.
 */
async function pruneUnusedChannels(keep: AlarmSound): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const sound of ALARM_SOUNDS) {
    if (sound.key === keep.key) continue;
    try {
      await Notifications.deleteNotificationChannelAsync(sound.channelId);
    } catch {
      // 없는 채널을 지우려 한 것뿐이다. 예약에 영향을 주지 않는다.
    }
  }
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
  /** 지금 기기에 예약되어 있는 정시 복용 알림 개수. 재알림은 세지 않는다. */
  count: number;
  /** 재알림으로 예약된 개수. 재알림을 껐으면 0이다. */
  followupCount: number;
  /** 가장 먼저 울릴 정시 알림. */
  next: DoseOccurrence | null;
};

export const EMPTY_SUMMARY: ScheduleSummary = { count: 0, followupCount: 0, next: null };

/** 예약 작업이 겹치지 않게 한 줄로 세운다. (목록 화면 복귀와 저장이 동시에 일어날 수 있다) */
let pending: Promise<ScheduleSummary> = Promise.resolve(EMPTY_SUMMARY);

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
    return EMPTY_SUMMARY;
  }

  const settings = await getSettings();
  const sound = soundFor(settings.soundKey);
  await ensureNotificationChannel(sound);

  const [medications, records] = await Promise.all([getMedications(), getDoseRecords()]);
  const now = new Date();
  const skip = recordedKeys(records);
  const common = { windowDays: WINDOW_DAYS, max: MAX_SCHEDULED, skip };

  const doses = buildOccurrences(medications, now, common);
  // 체크하지 않으면 한 번 더 울리는 알림. 체크하면 skip에 들어가 둘 다 사라진다.
  const followups =
    settings.repeatAfterMinutes > 0
      ? buildOccurrences(medications, now, {
          ...common,
          offsetMinutes: settings.repeatAfterMinutes,
        })
      : [];
  const desired = mergeOccurrences([doses, followups], MAX_SCHEDULED);

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const diff = diffSchedule(
    existing.map((request) => ({
      identifier: request.identifier,
      channelId: triggerChannelId(request.trigger),
    })),
    desired,
    sound.channelId,
  );

  for (const identifier of diff.toCancel) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }
  for (const occurrence of diff.toSchedule) {
    await scheduleDose(occurrence, sound, settings.repeatAfterMinutes);
  }

  // 예약을 다 걸은 뒤에 지운다. 순서를 바꾸면 알림이 조용히 사라진다.
  await pruneUnusedChannels(sound);

  const scheduled = desired.filter((occurrence) => occurrence.kind === 'dose');
  return {
    count: scheduled.length,
    followupCount: desired.length - scheduled.length,
    next: scheduled[0] ?? null,
  };
}

async function scheduleDose(
  occurrence: DoseOccurrence,
  sound: AlarmSound,
  repeatAfterMinutes: number,
): Promise<void> {
  const followup = occurrence.kind === 'followup';
  await Notifications.scheduleNotificationAsync({
    identifier: occurrence.id,
    content: {
      title: followup ? `${occurrence.medicationName} · 아직 체크하지 않았어요` : occurrence.medicationName,
      body: followup
        ? `${formatTime(occurrence.time)} 복용을 체크하지 않았습니다`
        : `${formatTime(occurrence.time)} · 복용 시간입니다`,
      // 안드로이드는 채널이 소리를 정하고, 이 값은 iOS에서 쓰인다.
      sound: sound.file,
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: {
        type: occurrence.kind,
        medicationId: occurrence.medicationId,
        date: occurrence.date,
        time: occurrence.time,
        ...(followup ? { afterMinutes: repeatAfterMinutes } : null),
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: occurrence.at,
      channelId: sound.channelId,
      // 이 앱의 핵심. setAlarmClock()으로 걸리는 알람이라 제조사 절전 기능이
      // 뒤로 미루지 않는다. 'bestEffort'로 두면 기기에 따라 수십 분 늦게 온다.
      delivery: 'alarmClock',
    },
  });
}

/**
 * 이미 울려서 알림창에 남아 있는 알림을 치운다.
 *
 * 예약 취소(cancel)는 **아직 울리지 않은** 알림만 거둔다. 이미 울린 알림은
 * 알림창에 그대로 남아서 "복용 시간입니다"라고 계속 떠 있다. 먹었다고 체크한
 * 사람에게는 그게 알림이 안 꺼진 것으로 보인다.
 *
 * 정시 알림과 재알림을 둘 다 치운다.
 */
export async function dismissDoseNotifications(doseId: string): Promise<void> {
  for (const identifier of [doseId, followupNotificationId(doseId)]) {
    try {
      await Notifications.dismissNotificationAsync(identifier);
    } catch {
      // 알림창에 없는 알림을 치우려 한 것뿐이다.
    }
  }
}

/** 기기에 실제로 걸려 있는 복용 알림. 예약 상태를 눈으로 확인할 때 쓴다. */
export type ScheduledDose = {
  id: string;
  kind: DoseKind;
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
      kind: parsed.kind,
      title: typeof request.content.title === 'string' ? request.content.title : '',
      date: parsed.date,
      time: parsed.time,
      firesAt: triggerDate(request.trigger),
    });
  }

  // 같은 회차는 정시 알림이 먼저 오게 둔다.
  doses.sort(
    (a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`) ||
      (a.kind === b.kind ? 0 : a.kind === 'dose' ? -1 : 1),
  );
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

/** 트리거에서 채널을 꺼낸다. 알림음이 바뀌었는지 알아내는 데 쓴다. */
function triggerChannelId(trigger: Notifications.NotificationTrigger): string | null {
  if (trigger && typeof trigger === 'object' && 'channelId' in trigger) {
    const value = (trigger as { channelId: unknown }).channelId;
    if (typeof value === 'string') return value;
  }
  return null;
}

/** 테스트용. 지금 쓰는 채널·전달 방식 그대로 잠시 뒤에 울려 본다. */
export async function sendTestNotification(afterSeconds: number): Promise<Date> {
  const settings = await getSettings();
  const sound = soundFor(settings.soundKey);
  await ensureNotificationChannel(sound);
  const at = new Date(Date.now() + afterSeconds * 1000);
  await Notifications.scheduleNotificationAsync({
    identifier: `test:${at.getTime()}`,
    content: {
      title: '테스트 알림',
      body: '이 알림이 제시간에 왔다면 알림 설정이 정상입니다.',
      sound: sound.file,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      channelId: sound.channelId,
      delivery: 'alarmClock',
    },
  });
  return at;
}

/**
 * 알림음을 골랐을 때 실제로 어떻게 울리는지 들려준다.
 *
 * 안드로이드에서 알림음은 채널에 묶여 있어서 소리만 따로 재생할 수 없다.
 * 그래서 실제 알림을 잠깐 뒤에 한 발 걸어 본다. 울리는 방식이 복용 알림과 똑같다.
 */
export async function previewSound(sound: AlarmSound, afterSeconds = 2): Promise<void> {
  await ensureNotificationChannel(sound);
  const at = new Date(Date.now() + afterSeconds * 1000);
  await Notifications.scheduleNotificationAsync({
    identifier: `preview:${sound.key}:${at.getTime()}`,
    content: {
      title: `${sound.label} 미리 듣기`,
      body: '복용 알림은 이 소리로 울립니다.',
      sound: sound.file,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      channelId: sound.channelId,
      delivery: 'alarmClock',
    },
  });
}
