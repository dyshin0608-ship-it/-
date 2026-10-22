import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { Card } from '../src/components/Card';
import { formatDate, formatRelativeDay, formatTime } from '../src/lib/date';
import {
  readPermissions,
  readScheduledDoses,
  sendTestNotification,
  syncSchedule,
  type PermissionState,
  type ScheduledDose,
} from '../src/lib/notifications';
import { colors, hitTarget, radius, spacing, type } from '../src/theme';

const TEST_DELAY_SECONDS = 60;

/**
 * 실기기 점검용 화면. 기기에 "실제로" 걸려 있는 알림을 안드로이드에서 그대로 읽어
 * 보여 준다. 앱이 예약했다고 생각하는 것과 기기가 들고 있는 것이 같은지 확인하는 곳이다.
 */
export default function AlarmsScreen() {
  const [doses, setDoses] = useState<ScheduledDose[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionState | null>(null);

  const load = useCallback(async () => {
    const [nextPermissions, nextDoses] = await Promise.all([
      readPermissions(),
      readScheduledDoses(),
    ]);
    setPermissions(nextPermissions);
    setDoses(nextDoses);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleResync() {
    const summary = await syncSchedule();
    await load();
    Alert.alert('예약을 다시 맞췄습니다', `복용 알림 ${summary.count}개가 예약되어 있습니다.`);
  }

  async function handleTest() {
    const at = await sendTestNotification(TEST_DELAY_SECONDS);
    const hhmm = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
    Alert.alert(
      '테스트 알림을 걸었습니다',
      `${formatTime(hhmm)}에 울립니다.\n\n지금 화면을 끄고 기다려 보세요.`,
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.summaryCount}>
          복용 알림 {doses?.length ?? 0}개
        </Text>
        <Text style={styles.summaryHint}>기기에 실제로 예약되어 있는 알림입니다.</Text>
        <View style={styles.permissionList}>
          <PermissionRow
            label="알림"
            granted={permissions?.canNotify}
            offText="꺼짐 — 알림이 오지 않습니다"
          />
          <PermissionRow
            label="알람 및 리마인더"
            granted={permissions?.exactAlarms}
            offText="꺼짐 — 알림이 늦을 수 있습니다"
          />
        </View>
      </Card>

      <View style={styles.actions}>
        <AppButton label={`${TEST_DELAY_SECONDS}초 뒤 테스트 알림`} onPress={handleTest} />
        <AppButton label="예약 다시 맞추기" variant="secondary" onPress={handleResync} />
      </View>

      {doses !== null && doses.length === 0 ? (
        <Card tone="muted">
          <Text style={styles.empty}>예약된 알림이 없습니다.</Text>
        </Card>
      ) : (
        doses !== null && (
          <Card padded={false}>
            {doses.map((dose, index) => (
              <DoseRow key={dose.id} dose={dose} divider={index > 0} />
            ))}
          </Card>
        )
      )}
    </ScrollView>
  );
}

function PermissionRow({
  label,
  granted,
  offText,
}: {
  label: string;
  granted: boolean | undefined;
  offText: string;
}) {
  const state = granted === undefined ? '확인 중' : granted ? '허용됨' : offText;
  return (
    <View style={styles.permissionRow}>
      <View
        style={[
          styles.permissionDot,
          granted === undefined
            ? styles.dotUnknown
            : granted
              ? styles.dotOk
              : styles.dotOff,
        ]}
      />
      <Text style={styles.permissionLabel}>{label}</Text>
      <Text style={[styles.permissionState, granted === false && styles.permissionStateOff]}>
        {state}
      </Text>
    </View>
  );
}

function DoseRow({ dose, divider }: { dose: ScheduledDose; divider: boolean }) {
  // 식별자가 가리키는 시각과 안드로이드가 들고 있는 시각이 같아야 한다.
  const expected = `${dose.date} ${dose.time}`;
  const actual = dose.firesAt ? formatClock(dose.firesAt) : null;
  const mismatch = actual !== null && actual !== expected;

  return (
    <View style={[styles.doseRow, divider && styles.doseDivider, mismatch && styles.doseMismatch]}>
      <View style={styles.doseMain}>
        <Text style={styles.doseWhen}>
          {formatRelativeDay(dose.date)} {formatTime(dose.time)}
        </Text>
        <Text style={styles.doseName} numberOfLines={1}>
          {dose.title}
        </Text>
      </View>
      <Text style={styles.doseDate}>{formatDate(dose.date)}</Text>
      {mismatch && <Text style={styles.doseWarn}>기기가 들고 있는 시각: {actual}</Text>}
    </View>
  );
}

function formatClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },

  summaryCount: { ...type.title, color: colors.text },
  summaryHint: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  permissionList: { marginTop: spacing.lg, gap: spacing.md },
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  permissionDot: { width: 8, height: 8, borderRadius: 4 },
  dotOk: { backgroundColor: colors.success },
  dotOff: { backgroundColor: colors.warning },
  dotUnknown: { backgroundColor: colors.borderStrong },
  permissionLabel: { ...type.body, color: colors.text, flex: 1 },
  permissionState: { ...type.caption, color: colors.textMuted, flexShrink: 1, textAlign: 'right' },
  permissionStateOff: { color: colors.warning },

  actions: { gap: spacing.sm },

  empty: { ...type.body, color: colors.textMuted, textAlign: 'center' },

  doseRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: hitTarget },
  doseDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  doseMismatch: { backgroundColor: colors.dangerSoft },
  doseMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  doseWhen: { ...type.mono, color: colors.text },
  doseName: { ...type.body, color: colors.textSecondary, flex: 1 },
  doseDate: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  doseWarn: {
    ...type.caption,
    color: colors.danger,
    fontWeight: '700',
    marginTop: spacing.xs,
    borderRadius: radius.sm,
  },
});
