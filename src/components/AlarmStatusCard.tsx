import { StyleSheet, Text, View } from 'react-native';

import { alarmStatusKind } from '../lib/alarmStatus';
import type { PermissionState, ScheduleSummary } from '../lib/notifications';
import { colors, spacing, type } from '../theme';
import { AppButton } from './AppButton';
import { Card } from './Card';

type Props = {
  permissions: PermissionState | null;
  schedule: ScheduleSummary;
  onFixNotifications: () => void;
  onFixExactAlarms: () => void;
};

/**
 * 알림이 울릴 수 없는 상태일 때만 보여 주는 안내.
 *
 * 경고지 오류 화면이 아니다. 무엇이 꺼져 있고, 무엇을 누르면 되는지만 담는다.
 * 정상일 때는 아무것도 그리지 않고, 홈 화면이 "다음 복용"으로 실제 정보를 보여 준다.
 */
export function AlarmStatusCard({
  permissions,
  schedule,
  onFixNotifications,
  onFixExactAlarms,
}: Props) {
  const kind = alarmStatusKind(permissions, schedule.count);

  if (kind === 'notifications-off') {
    return (
      <Notice
        tone="danger"
        title="알림이 꺼져 있어요"
        body="지금은 복용 시각이 되어도 알림이 오지 않습니다. 알림을 켜면 등록한 시각에 또박이 알려 드립니다."
        actionLabel="알림 켜기"
        onPress={onFixNotifications}
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
        onPress={onFixExactAlarms}
      />
    );
  }

  return null;
}

type NoticeProps = {
  tone: 'warning' | 'danger';
  title: string;
  body: string;
  actionLabel: string;
  onPress: () => void;
};

function Notice({ tone, title, body, actionLabel, onPress }: NoticeProps) {
  return (
    <Card tone={tone}>
      <View style={styles.header}>
        <View style={[styles.dot, tone === 'danger' ? styles.dotDanger : styles.dotWarning]} />
        <Text style={[styles.title, tone === 'danger' ? styles.textDanger : styles.textWarning]}>
          {title}
        </Text>
      </View>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.action}>
        <AppButton label={actionLabel} onPress={onPress} size="sm" variant="secondary" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotDanger: { backgroundColor: colors.danger },
  dotWarning: { backgroundColor: colors.warning },
  title: { ...type.heading, flexShrink: 1 },
  textDanger: { color: colors.danger },
  textWarning: { color: colors.warning },
  body: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm },
  action: { marginTop: spacing.lg, alignItems: 'flex-start' },
});
