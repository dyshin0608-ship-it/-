import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../src/components/Icon';
import { Button, Notice, Row, Section } from '../../src/components/ui';
import { formatDate, formatRelativeDay, formatTime } from '../../src/lib/date';
import {
  readPermissions,
  readScheduledDoses,
  sendTestNotification,
  syncSchedule,
  type PermissionState,
  type ScheduledDose,
} from '../../src/lib/notifications';
import { colors, gutter, radius, spacing, type } from '../../src/theme';

const TEST_DELAY_SECONDS = 60;

/**
 * 실기기 점검용 화면. 기기에 "실제로" 걸려 있는 알림을 안드로이드에서 그대로 읽어
 * 보여 준다. 앱이 예약했다고 생각하는 것과 기기가 들고 있는 것이 같은지 확인하는 곳이다.
 */
export default function AlarmsScreen() {
  const [doses, setDoses] = useState<ScheduledDose[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionState | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextPermissions, nextDoses] = await Promise.all([
        readPermissions(),
        readScheduledDoses(),
      ]);
      setPermissions(nextPermissions);
      setDoses(nextDoses);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleResync() {
    if (busy) return;
    setBusy(true);
    try {
      const summary = await syncSchedule();
      await load();
      Alert.alert('예약을 다시 맞췄습니다', `복용 알림 ${summary.count}개가 예약되어 있습니다.`);
    } catch {
      Alert.alert('예약을 맞추지 못했습니다', '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    if (busy) return;
    setBusy(true);
    try {
      const at = await sendTestNotification(TEST_DELAY_SECONDS);
      const hhmm = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
      Alert.alert(
        '테스트 알림을 걸었습니다',
        `${formatTime(hhmm)}에 울립니다.\n\n지금 화면을 끄고 기다려 보세요.`,
      );
    } catch {
      Alert.alert('테스트 알림을 걸지 못했습니다', '알림 권한을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {failed ? (
        <Notice
          tone="info"
          title="상태를 확인하지 못했어요"
          body="권한과 예약 목록을 읽지 못했습니다."
          actionLabel="다시 확인"
          onAction={load}
        />
      ) : (
        <View style={styles.summary}>
          <Text style={styles.summaryCount}>
            {doses === null ? '확인 중' : `복용 알림 ${doses.length}개`}
          </Text>
          <Text style={styles.summaryHint}>기기에 실제로 예약되어 있는 알림입니다.</Text>
        </View>
      )}

      <Section title="권한">
        <View>
          <PermissionRow
            first
            label="알림"
            granted={permissions?.canNotify}
            offText="꺼짐 · 알림이 오지 않습니다"
          />
          <PermissionRow
            label="알람 및 리마인더"
            granted={permissions?.exactAlarms}
            offText="꺼짐 · 알림이 늦을 수 있습니다"
          />
        </View>
        <Text style={styles.footnote}>
          두 권한이 모두 허용되어도 제조사 절전 기능이 알림을 미룰 수 있습니다. 알림이 늦으면
          설정에서 또박을 배터리 최적화 대상에서 빼 주세요.
        </Text>
      </Section>

      <View style={styles.actions}>
        <Button
          label={`${TEST_DELAY_SECONDS}초 뒤 테스트 알림`}
          icon="bell"
          onPress={handleTest}
          disabled={busy}
        />
        <Button
          label="예약 다시 맞추기"
          icon="refresh"
          variant="secondary"
          onPress={handleResync}
          disabled={busy}
        />
      </View>

      {doses !== null && (
        <Section title="예약 목록">
          {doses.length === 0 ? (
            <Text style={styles.empty}>예약된 알림이 없습니다.</Text>
          ) : (
            <View>
              {doses.map((dose, index) => (
                <DoseRow key={dose.id} dose={dose} first={index === 0} />
              ))}
            </View>
          )}
        </Section>
      )}
    </ScrollView>
  );
}

function PermissionRow({
  label,
  granted,
  offText,
  first,
}: {
  label: string;
  granted: boolean | undefined;
  offText: string;
  first?: boolean;
}) {
  const state = granted === undefined ? '확인 중' : granted ? '허용됨' : offText;
  return (
    <Row
      first={first}
      leading={
        <Icon
          name={granted === undefined ? 'help' : granted ? 'check-circle' : 'bell-off'}
          size="md"
          color={granted === undefined ? colors.textSecondary : granted ? colors.success : colors.warning}
        />
      }
    >
      <Text style={styles.permissionLabel}>{label}</Text>
      <Text style={[styles.permissionState, granted === false && styles.permissionOff]}>
        {state}
      </Text>
    </Row>
  );
}

function DoseRow({ dose, first }: { dose: ScheduledDose; first: boolean }) {
  // 식별자가 가리키는 시각과 안드로이드가 들고 있는 시각이 같아야 한다.
  const expected = `${dose.date} ${dose.time}`;
  const actual = dose.firesAt ? formatClock(dose.firesAt) : null;
  const mismatch = actual !== null && actual !== expected;

  return (
    <Row first={first} style={mismatch ? styles.mismatch : undefined}>
      <View style={styles.doseTop}>
        <Text style={styles.doseWhen}>
          {formatRelativeDay(dose.date)} {formatTime(dose.time)}
        </Text>
        <Text style={styles.doseName} numberOfLines={1}>
          {dose.title}
        </Text>
      </View>
      <Text style={styles.doseDate}>{formatDate(dose.date)}</Text>
      {mismatch && <Text style={styles.doseWarn}>기기가 들고 있는 시각: {actual}</Text>}
    </Row>
  );
}

function formatClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gutter, gap: spacing.xl },

  summary: { gap: 2 },
  summaryCount: { ...type.title, color: colors.text },
  summaryHint: { ...type.caption, color: colors.textSecondary },

  permissionLabel: { ...type.body, color: colors.text },
  permissionState: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  permissionOff: { color: colors.warning },
  footnote: { ...type.caption, color: colors.textSecondary, lineHeight: 19 },

  actions: { gap: spacing.sm },
  empty: { ...type.body, color: colors.textSecondary },

  doseTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  doseWhen: { ...type.bodyStrong, color: colors.text },
  doseName: { ...type.body, color: colors.textSecondary, flex: 1 },
  doseDate: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  doseWarn: { ...type.caption, color: colors.danger, fontWeight: '700', marginTop: spacing.xs },
  mismatch: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm },
});
