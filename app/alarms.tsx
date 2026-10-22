import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { formatDate, formatRelativeDay, formatTime } from '../src/lib/date';
import {
  readPermissions,
  readScheduledDoses,
  sendTestNotification,
  syncSchedule,
  type PermissionState,
  type ScheduledDose,
} from '../src/lib/notifications';
import { colors, radius, spacing } from '../src/theme';

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
    Alert.alert('다시 맞췄습니다', `예약 ${summary.count}개`);
  }

  async function handleTest() {
    const at = await sendTestNotification(TEST_DELAY_SECONDS);
    Alert.alert(
      '테스트 알림을 걸었습니다',
      `${formatTime(`${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`)}에 울립니다.\n\n지금 화면을 끄고 기다려 보세요.`,
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={doses ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>기기에 예약된 복용 알림 {doses?.length ?? 0}개</Text>
              <Text style={styles.summaryLine}>
                알림 권한 {permissions ? (permissions.canNotify ? '허용됨' : '꺼짐') : '확인 중'}
              </Text>
              <Text style={styles.summaryLine}>
                알람 및 리마인더{' '}
                {permissions ? (permissions.exactAlarms ? '허용됨' : '꺼짐 — 알림이 늦을 수 있음') : '확인 중'}
              </Text>
            </View>
            <View style={styles.actions}>
              <AppButton label={`${TEST_DELAY_SECONDS}초 뒤 테스트 알림`} onPress={handleTest} />
              <View style={styles.gap} />
              <AppButton label="예약 다시 맞추기" variant="secondary" onPress={handleResync} />
            </View>
          </View>
        }
        renderItem={({ item }) => <DoseRow dose={item} />}
        ListEmptyComponent={
          doses === null ? undefined : <Text style={styles.empty}>예약된 알림이 없습니다.</Text>
        }
      />
    </View>
  );
}

function DoseRow({ dose }: { dose: ScheduledDose }) {
  // 식별자가 가리키는 시각과 안드로이드가 들고 있는 시각이 같아야 한다.
  const expected = `${dose.date} ${dose.time}`;
  const actual = dose.firesAt
    ? `${dose.firesAt.getFullYear()}-${String(dose.firesAt.getMonth() + 1).padStart(2, '0')}-${String(
        dose.firesAt.getDate(),
      ).padStart(2, '0')} ${String(dose.firesAt.getHours()).padStart(2, '0')}:${String(
        dose.firesAt.getMinutes(),
      ).padStart(2, '0')}`
    : null;
  const mismatch = actual !== null && actual !== expected;

  return (
    <View style={[styles.row, mismatch && styles.rowMismatch]}>
      <Text style={styles.rowWhen}>
        {formatRelativeDay(dose.date)} {formatTime(dose.time)}
      </Text>
      <Text style={styles.rowName}>{dose.title}</Text>
      <Text style={styles.rowMeta}>{formatDate(dose.date)}</Text>
      {mismatch && <Text style={styles.rowWarn}>기기가 들고 있는 시각: {actual}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  summary: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  summaryLine: { marginTop: spacing.xs, fontSize: 15, color: colors.muted },
  actions: { marginTop: spacing.md, marginBottom: spacing.lg },
  gap: { height: spacing.sm },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMismatch: { backgroundColor: '#FDECEC' },
  rowWhen: { fontSize: 17, fontWeight: '700', color: colors.text },
  rowName: { marginTop: 2, fontSize: 15, color: colors.text },
  rowMeta: { marginTop: 2, fontSize: 13, color: colors.muted },
  rowWarn: { marginTop: spacing.xs, fontSize: 13, fontWeight: '700', color: colors.danger },
  empty: { paddingVertical: spacing.lg, fontSize: 15, color: colors.muted, textAlign: 'center' },
});
