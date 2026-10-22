import { alarmStatusKind } from '../lib/alarmStatus';
import type { PermissionState, ScheduleSummary } from '../lib/notifications';
import { Notice } from './ui';

type Props = {
  permissions: PermissionState | null;
  schedule: ScheduleSummary;
  checkFailed?: boolean;
  onFixNotifications: () => void;
  onFixExactAlarms: () => void;
  onRetry?: () => void;
};

/**
 * 알림이 울릴 수 없는 상태일 때만 보여 주는 안내.
 *
 * 네 가지를 구분한다. 알림 권한 꺼짐 / 정확한 알람 꺼짐 / 확인 실패 / 정상.
 * 정상일 때는 아무것도 그리지 않고, 홈 화면이 실제 다음 복용을 보여 준다.
 */
export function AlarmStatusCard({
  permissions,
  schedule,
  checkFailed,
  onFixNotifications,
  onFixExactAlarms,
  onRetry,
}: Props) {
  const kind = alarmStatusKind(permissions, schedule.count, checkFailed);

  if (kind === 'check-failed') {
    return (
      <Notice
        tone="info"
        title="알림 상태를 확인하지 못했어요"
        body="권한과 예약 상태를 읽지 못했습니다. 알림이 정상인지 알 수 없으니 다시 확인해 주세요."
        actionLabel={onRetry ? '다시 확인' : undefined}
        onAction={onRetry}
      />
    );
  }

  if (kind === 'notifications-off') {
    return (
      <Notice
        tone="danger"
        title="알림이 꺼져 있어요"
        body="지금은 복용 시각이 되어도 알림이 오지 않습니다. 알림을 켜면 등록한 시각에 또박이 알려 드립니다."
        actionLabel="알림 켜기"
        onAction={onFixNotifications}
      />
    );
  }

  if (kind === 'exact-alarms-off') {
    return (
      <Notice
        tone="warning"
        title="알림이 늦게 올 수 있어요"
        body={
          '안드로이드가 절전을 위해 알림을 뒤로 미룰 수 있습니다. ' +
          '"알람 및 리마인더"를 허용하면 정한 시각에 정확히 울립니다.'
        }
        actionLabel="설정 열기"
        onAction={onFixExactAlarms}
      />
    );
  }

  return null;
}
