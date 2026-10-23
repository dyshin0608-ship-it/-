import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../src/components/Icon';
import { Button, Notice, Row, Section } from '../../src/components/ui';
import { formatDate, formatRelativeDay, formatTime } from '../../src/lib/date';
import {
  previewSound,
  readPermissions,
  readScheduledDoses,
  sendTestNotification,
  syncSchedule,
  type PermissionState,
  type ScheduledDose,
} from '../../src/lib/notifications';
import {
  ALARM_SOUNDS,
  DEFAULT_SETTINGS,
  REPEAT_CHOICES,
  getSettings,
  setRepeatAfterMinutes,
  setSoundKey,
  type AlarmSound,
  type RepeatMinutes,
  type Settings,
} from '../../src/lib/settings';
import { colors, gutter, hitTarget, radius, spacing, type } from '../../src/theme';

const TEST_DELAY_SECONDS = 60;
const PREVIEW_DELAY_SECONDS = 2;

/**
 * 알림 설정과 실기기 점검 화면.
 *
 * 예약 목록은 기기에 "실제로" 걸려 있는 알림을 안드로이드에서 그대로 읽어 보여 준다.
 * 앱이 예약했다고 생각하는 것과 기기가 들고 있는 것이 같은지 확인하는 곳이다.
 */
export default function AlarmsScreen() {
  const [doses, setDoses] = useState<ScheduledDose[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionState | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextPermissions, nextDoses, nextSettings] = await Promise.all([
        readPermissions(),
        readScheduledDoses(),
        getSettings(),
      ]);
      setPermissions(nextPermissions);
      setDoses(nextDoses);
      setSettings(nextSettings);
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

  /** 알림음을 바꾸면 이미 걸려 있는 알림도 새 소리로 다시 걸어야 한다. */
  async function handlePickSound(sound: AlarmSound) {
    if (busy || sound.key === settings.soundKey) return;
    setBusy(true);
    try {
      setSettings(await setSoundKey(sound.key));
      await syncSchedule();
      await load();
    } catch {
      Alert.alert('알림음을 바꾸지 못했습니다', '잠시 후 다시 시도해 주세요.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handlePreview(sound: AlarmSound) {
    try {
      await previewSound(sound, PREVIEW_DELAY_SECONDS);
    } catch {
      Alert.alert('소리를 들려주지 못했습니다', '알림 권한을 확인해 주세요.');
    }
  }

  async function handlePickRepeat(minutes: RepeatMinutes) {
    if (busy || minutes === settings.repeatAfterMinutes) return;
    setBusy(true);
    try {
      setSettings(await setRepeatAfterMinutes(minutes));
      await syncSchedule();
      await load();
    } catch {
      Alert.alert('설정을 바꾸지 못했습니다', '잠시 후 다시 시도해 주세요.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleResync() {
    if (busy) return;
    setBusy(true);
    try {
      const summary = await syncSchedule();
      await load();
      const followup =
        summary.followupCount > 0 ? `\n다시 알림 ${summary.followupCount}개도 함께 걸려 있습니다.` : '';
      Alert.alert(
        '예약을 다시 맞췄습니다',
        `복용 알림 ${summary.count}개가 예약되어 있습니다.${followup}`,
      );
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

  const scheduled = doses?.filter((dose) => dose.kind === 'dose') ?? null;
  const followups = doses?.filter((dose) => dose.kind === 'followup') ?? null;

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
            {scheduled === null ? '확인 중' : `복용 알림 ${scheduled.length}개`}
          </Text>
          <Text style={styles.summaryHint}>
            기기에 실제로 예약되어 있는 알림입니다.
            {followups && followups.length > 0 ? ` 다시 알림 ${followups.length}개 포함.` : ''}
          </Text>
        </View>
      )}

      <Section title="알림음">
        <View>
          {ALARM_SOUNDS.map((sound, index) => (
            <Row
              key={sound.key}
              first={index === 0}
              onPress={() => void handlePickSound(sound)}
              accessibilityLabel={`알림음 ${sound.label}`}
              leading={<Radio selected={sound.key === settings.soundKey} />}
              trailing={
                <Pressable
                  onPress={() => void handlePreview(sound)}
                  accessibilityRole="button"
                  accessibilityLabel={`${sound.label} 들어보기`}
                  hitSlop={8}
                  style={({ pressed }) => [styles.preview, pressed && styles.previewPressed]}
                >
                  <Icon name="bell" size="sm" color={colors.brand} />
                  <Text style={styles.previewLabel}>들어보기</Text>
                </Pressable>
              }
            >
              <Text style={styles.choiceLabel}>{sound.label}</Text>
              <Text style={styles.choiceHint}>{sound.description}</Text>
            </Row>
          ))}
        </View>
        <Text style={styles.footnote}>
          알림음은 알람 소리로 울립니다. 폰이 무음이나 진동이어도 복용 알림은 소리가 납니다.
          {'\n'}들어보기를 누르면 {PREVIEW_DELAY_SECONDS}초 뒤에 실제 알림이 한 번 울립니다.
        </Text>
      </Section>

      <Section title="다시 알림">
        <View style={styles.segmented}>
          {REPEAT_CHOICES.map((minutes) => {
            const active = minutes === settings.repeatAfterMinutes;
            return (
              <Pressable
                key={minutes}
                onPress={() => void handlePickRepeat(minutes)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={minutes === 0 ? '다시 알림 끄기' : `${minutes}분 뒤 다시 알림`}
                style={({ pressed }) => [
                  styles.segment,
                  active && styles.segmentActive,
                  pressed && !active && styles.segmentPressed,
                ]}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {minutes === 0 ? '끔' : `${minutes}분`}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.footnote}>
          {settings.repeatAfterMinutes === 0
            ? '복용 시각에 한 번만 울립니다.'
            : `복용 시각에 울린 뒤 체크하지 않으면 ${settings.repeatAfterMinutes}분 뒤에 한 번 더 울립니다. 먹었어요·못 먹었어요·모름 중 하나를 누르면 다시 알림은 취소됩니다.`}
        </Text>
      </Section>

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
                <DoseRow
                  key={dose.id}
                  dose={dose}
                  first={index === 0}
                  repeatAfterMinutes={settings.repeatAfterMinutes}
                />
              ))}
            </View>
          )}
        </Section>
      )}
    </ScrollView>
  );
}

/** 고른 항목에 점이 찍히는 동그라미. 아이콘 대신 그려서 크기를 맞춘다. */
function Radio({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radio, selected && styles.radioOn]}>
      {selected && <View style={styles.radioDot} />}
    </View>
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

function DoseRow({
  dose,
  first,
  repeatAfterMinutes,
}: {
  dose: ScheduledDose;
  first: boolean;
  repeatAfterMinutes: number;
}) {
  const followup = dose.kind === 'followup';
  // 식별자가 가리키는 시각과 안드로이드가 들고 있는 시각이 같아야 한다.
  // 다시 알림은 복용 시각보다 설정한 만큼 뒤에 울리는 것이 맞다.
  const offsetMs = followup ? repeatAfterMinutes * 60_000 : 0;
  const expected = formatClock(new Date(parseClock(dose.date, dose.time).getTime() + offsetMs));
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
      <Text style={styles.doseDate}>
        {formatDate(dose.date)}
        {followup ? ` · ${repeatAfterMinutes}분 뒤 다시 알림` : ''}
      </Text>
      {mismatch && <Text style={styles.doseWarn}>기기가 들고 있는 시각: {actual}</Text>}
    </Row>
  );
}

function parseClock(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
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
  summaryHint: { ...type.caption, color: colors.textSecondary, lineHeight: 19 },

  choiceLabel: { ...type.body, color: colors.text },
  choiceHint: { ...type.caption, color: colors.textSecondary, marginTop: 2 },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },

  preview: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs },
  previewPressed: { opacity: 0.5 },
  previewLabel: { ...type.caption, color: colors.brand, fontWeight: '700' },

  segmented: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.bgAlt,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: hitTarget - 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.brand },
  segmentPressed: { backgroundColor: colors.border },
  segmentLabel: { ...type.body, color: colors.textSecondary },
  segmentLabelActive: { color: colors.brand, fontWeight: '700' },

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
