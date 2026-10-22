import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import {
  readPermissions,
  requestExactAlarmPermission,
  requestNotificationPermission,
  syncSchedule,
  type PermissionState,
  type ScheduleSummary,
} from '../lib/notifications';

export type AlarmStatus = {
  permissions: PermissionState | null;
  schedule: ScheduleSummary;
  /** 알림 권한을 켜게 한다. 앱에서 다시 물어볼 수 없으면 설정 화면을 연다. */
  fixNotifications: () => Promise<void>;
  /** "알람 및 리마인더"를 켜게 한다. */
  fixExactAlarms: () => Promise<void>;
};

/**
 * 화면이 보일 때마다 권한을 확인하고 예약을 최신 상태로 맞춘다.
 * (약을 추가하거나 고치고 돌아왔을 때, 설정에서 권한을 바꾸고 돌아왔을 때)
 */
export function useAlarmStatus(): AlarmStatus {
  const [permissions, setPermissions] = useState<PermissionState | null>(null);
  const [schedule, setSchedule] = useState<ScheduleSummary>({ count: 0, next: null });

  const refresh = useCallback(async () => {
    const [nextPermissions, nextSchedule] = await Promise.all([readPermissions(), syncSchedule()]);
    setPermissions(nextPermissions);
    setSchedule(nextSchedule);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [nextPermissions, nextSchedule] = await Promise.all([
          readPermissions(),
          syncSchedule(),
        ]);
        if (cancelled) return;
        setPermissions(nextPermissions);
        setSchedule(nextSchedule);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
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

  return { permissions, schedule, fixNotifications, fixExactAlarms };
}
