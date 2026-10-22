import type { PermissionState } from './notifications';

/**
 * 알림 상태 카드가 무엇을 보여줄지 정한다.
 * 화면 그리기와 떼어 놓아서 그대로 테스트할 수 있게 한다.
 */
export type AlarmStatusKind =
  /** 아직 권한을 확인하는 중. */
  | 'unknown'
  /** 알림 권한이 없다. 이 상태로는 알림이 전혀 오지 않는다. */
  | 'notifications-off'
  /** 알림은 오지만 정확한 시각을 보장하지 못한다. */
  | 'exact-alarms-off'
  /** 다 괜찮고 예약된 알림도 있다. */
  | 'ready'
  /** 다 괜찮지만 예약할 약이 없다. */
  | 'nothing-scheduled'
  /** 권한을 확인하다가 실패했다. 허용된 것으로 가정하면 안 된다. */
  | 'check-failed';

export function alarmStatusKind(
  permissions: PermissionState | null,
  scheduledCount: number,
  checkFailed = false,
): AlarmStatusKind {
  // 확인에 실패했으면 모른다고 말한다. 허용된 것처럼 보이게 두지 않는다.
  if (checkFailed) return 'check-failed';
  if (!permissions) return 'unknown';
  if (!permissions.canNotify) return 'notifications-off';
  if (!permissions.exactAlarms) return 'exact-alarms-off';
  return scheduledCount > 0 ? 'ready' : 'nothing-scheduled';
}
