import { Pressable, StyleSheet, Text, View } from 'react-native';

import { alarmStatusKind } from '../lib/alarmStatus';
import { formatRelativeDay, formatTime } from '../lib/date';
import type { PermissionState, ScheduleSummary } from '../lib/notifications';
import { colors, radius, spacing } from '../theme';

type Props = {
  permissions: PermissionState | null;
  schedule: ScheduleSummary;
  onFixNotifications: () => void;
  onFixExactAlarms: () => void;
  onOpenDiagnostics: () => void;
};

/**
 * 알림이 실제로 울릴 수 있는 상태인지 한눈에 보여 준다.
 * "알림이 반드시 온다"가 이 앱의 약속이라, 안 울릴 상태면 가장 먼저 보여야 한다.
 */
export function AlarmStatusCard({
  permissions,
  schedule,
  onFixNotifications,
  onFixExactAlarms,
  onOpenDiagnostics,
}: Props) {
  const kind = alarmStatusKind(permissions, schedule.count);

  if (kind === 'unknown' || kind === 'nothing-scheduled') return null;

  if (kind === 'notifications-off') {
    return (
      <Card tone="error">
        <Text style={styles.titleError}>알림이 꺼져 있습니다</Text>
        <Text style={styles.body}>
          지금 상태로는 복용 시각이 되어도 알림이 오지 않습니다.
        </Text>
        <FixButton label="알림 켜기" tone="error" onPress={onFixNotifications} />
      </Card>
    );
  }

  if (kind === 'exact-alarms-off') {
    return (
      <Card tone="warning">
        <Text style={styles.titleWarning}>알림이 늦게 올 수 있습니다</Text>
        <Text style={styles.body}>
          "알람 및 리마인더"를 허용하면 정해진 시각에 정확히 울립니다. 허용하지 않으면 안드로이드가
          알림을 수십 분 뒤로 미룰 수 있습니다.
        </Text>
        <FixButton label="설정 열기" tone="warning" onPress={onFixExactAlarms} />
      </Card>
    );
  }

  return (
    <Card tone="ok">
      <Text style={styles.titleOk}>알림 {schedule.count}개가 예약되어 있습니다</Text>
      {schedule.next && (
        <Text style={styles.body}>
          다음 알림 · {formatRelativeDay(schedule.next.date)} {formatTime(schedule.next.time)}{' '}
          {schedule.next.medicationName}
        </Text>
      )}
      <Text style={styles.footnote}>알림은 기기에 직접 예약됩니다. 인터넷이 끊겨도 울립니다.</Text>
      <Pressable
        onPress={onOpenDiagnostics}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Text style={styles.link}>예약된 알림 확인 →</Text>
      </Pressable>
    </Card>
  );
}

function Card({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <View style={[styles.card, cardTones[tone]]}>{children}</View>;
}

function FixButton({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: 'error' | 'warning';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.fixButton, buttonTones[tone], pressed && styles.pressed]}
    >
      <Text style={styles.fixLabel}>{label}</Text>
    </Pressable>
  );
}

type Tone = 'error' | 'warning' | 'ok';

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  titleError: { fontSize: 17, fontWeight: '700', color: colors.danger },
  titleWarning: { fontSize: 17, fontWeight: '700', color: '#A65A00' },
  titleOk: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { marginTop: spacing.xs, fontSize: 15, lineHeight: 22, color: colors.text },
  footnote: { marginTop: spacing.sm, fontSize: 13, color: colors.muted },
  fixButton: {
    marginTop: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixLabel: { fontSize: 16, fontWeight: '700', color: colors.primaryText },
  link: { marginTop: spacing.sm, fontSize: 14, fontWeight: '700', color: colors.primary },
  pressed: { opacity: 0.75 },
});

const cardTones = StyleSheet.create({
  error: { backgroundColor: '#FDECEC', borderColor: '#F3B9B9' },
  warning: { backgroundColor: '#FFF6E5', borderColor: '#F0D59B' },
  ok: { backgroundColor: colors.surface, borderColor: colors.border },
});

const buttonTones = StyleSheet.create({
  error: { backgroundColor: colors.danger },
  warning: { backgroundColor: '#A65A00' },
});
