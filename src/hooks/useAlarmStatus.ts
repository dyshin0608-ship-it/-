import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import {
  readPermissions,
  readScheduledDoses,
  requestExactAlarmPermission,
  requestNotificationPermission,
  syncSchedule,
  type PermissionState,
  type ScheduleSummary,
} from '../lib/notifications';

export type AlarmStatus = {
  permissions: PermissionState | null;
  schedule: ScheduleSummary;
  /**
   * 안드로이드가 실제로 들고 있는 복용 알림 개수.
   * 앱이 "예약했다고 생각하는" 수가 아니라 기기에 물어본 수다.
   * 확인하지 못했으면 null이고, 그때는 숫자를 보여 주지 않는다.
   */
  scheduledCount: number | null;
  /** 권한이나 예약 상태를 확인하지 못했다. */
  checkFailed: boolean;
  /** 알림 권한을 켜게 한다. 앱에서 다시 물어볼 수 없으면 설정 화면을 연다. */
  fixNotifications: () => Promise<void>;
  /** "알람 및 리마인더"를 켜게 한다. */
  fixExactAlarms: () => Promise<void>;
  /** 상태를 다시 읽는다. */
  refresh: () => Promise<void>;
};

/**
 * 화면이 보일 때마다 권한을 확인하고 예약을 최신 상태로 맞춘다.
 * (약을 추가하거나 고치고 돌아왔을 때, 설정에서 권한을 바꾸고 돌아왔을 때)
 */
export function useAlarmStatus(): AlarmStatus {
  const [permissions, setPermissions] = useState<PermissionState | null>(null);
  const [schedule, setSchedule] = useState<ScheduleSummary>({ count: 0, next: null });
  const [scheduledCount, setScheduledCount] = useState<number | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextPermissions, nextSchedule] = await Promise.all([
        readPermissions(),
        syncSchedule(),
      ]);
      // 예약을 맞춘 뒤에 기기에 실제로 몇 개가 걸렸는지 되묻는다.
      const actual = await readScheduledDoses();
      setPermissions(nextPermissions);
      setSchedule(nextSchedule);
      setScheduledCount(actual.length);
      setCheckFailed(false);
    } catch {
      // 확인에 실패하면 모른다고 표시한다. 허용된 것으로 가정하지 않는다.
      setScheduledCount(null);
      setCheckFailed(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const fixNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (!granted) await Linking.openSettings();
    await refresh();
  }, [refresh]);

  const fixExactAlarms = useCallback(async () => {
    await requestExactAlarmPermission();
    await refresh();
  }, [refresh]);

  return {
    permissions,
    schedule,
    scheduledCount,
    checkFailed,
    fixNotifications,
    fixExactAlarms,
    refresh,
  };
}
