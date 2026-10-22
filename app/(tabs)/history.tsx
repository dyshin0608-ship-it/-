import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../src/components/Icon';
import { Section } from '../../src/components/ui';
import { addDays, formatDateWithWeekday, formatTime, today } from '../../src/lib/date';
import {
  doseKey,
  getDoseRecords,
  setDoseStatus,
  type DoseRecords,
  type DoseStatus,
} from '../../src/lib/doses';
import { syncSchedule } from '../../src/lib/notifications';
import { dosesForDate, type DayDose } from '../../src/lib/schedule';
import { getMedications } from '../../src/lib/storage';
import type { DateString, Medication } from '../../src/lib/types';
import { colors, gutter, hitTarget, radius, spacing, type } from '../../src/theme';

/** 거슬러 올라가 보여 줄 날수. */
const DAYS_BACK = 30;

const STATUS_VIEW: Record<DoseStatus, { icon: IconName; label: string; color: string }> = {
  taken: { icon: 'box-check', label: '먹었어요', color: colors.success },
  missed: { icon: 'box-x', label: '못 먹었어요', color: colors.danger },
  unknown: { icon: 'box-question', label: '모르겠어요', color: colors.warning },
};

/** 빈칸 → 먹음 → 못 먹음 → 모름 → 빈칸. */
function nextStatus(current: DoseStatus | null): DoseStatus | null {
  if (current === null) return 'taken';
  if (current === 'taken') return 'missed';
  if (current === 'missed') return 'unknown';
  return null;
}

export default function HistoryScreen() {
  const [medications, setMedications] = useState<Medication[] | null>(null);
  const [records, setRecords] = useState<DoseRecords>({});
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void Promise.all([getMedications(), getDoseRecords()]).then(([list, saved]) => {
        if (cancelled) return;
        setMedications(list);
        setRecords(saved);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  /** 지난 기록도 고칠 수 있다. 고치면 예약도 다시 맞춘다. */
  async function mark(key: string, status: DoseStatus | null) {
    setRecords((prev) => {
      const next = { ...prev };
      if (status === null) delete next[key];
      else next[key] = { status, recordedAt: new Date().toISOString() };
      return next;
    });
    await setDoseStatus(key, status);
    await syncSchedule();
  }

  const todayDate = today();
  // 오늘부터 거슬러 올라가며, 그날 먹을 약이 있던 날만 보여 준다.
  const days: { date: DateString; doses: DayDose[] }[] = [];
  if (medications) {
    for (let i = 0; i < DAYS_BACK; i++) {
      const date = addDays(todayDate, -i);
      const doses = dosesForDate(medications, date);
      if (doses.length > 0) days.push({ date, doses });
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>복용 기록</Text>
        <Text style={styles.subtitle}>최근 {DAYS_BACK}일</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {medications !== null && days.length === 0 && (
          <View style={styles.empty}>
            <Icon name="history" size={36} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
            <Text style={styles.emptyBody}>
              약을 등록하면 날짜별로 복용 기록이 쌓입니다. 지난 기록도 여기서 고칠 수 있습니다.
            </Text>
          </View>
        )}

        {days.map(({ date, doses }) => (
          <DayBlock
            key={date}
            date={date}
            doses={doses}
            isToday={date === todayDate}
            records={records}
            onMark={mark}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function DayBlock({
  date,
  doses,
  isToday,
  records,
  onMark,
}: {
  date: DateString;
  doses: DayDose[];
  isToday: boolean;
  records: DoseRecords;
  onMark: (key: string, status: DoseStatus | null) => void;
}) {
  const keys = doses.map((dose) => doseKey(dose.medicationId, date, dose.time));
  const taken = keys.filter((key) => records[key]?.status === 'taken').length;

  return (
    <Section title={`${isToday ? '오늘 · ' : ''}${formatDateWithWeekday(date)}`}>
      <View style={styles.daySummary}>
        <Text style={styles.summaryText}>
          {doses.length}번 중 {taken}번 먹었어요
        </Text>
      </View>
      <View>
        {doses.map((dose, index) => {
          const key = keys[index];
          const status = records[key]?.status ?? null;
          return (
            <DoseRow
              key={key}
              dose={dose}
              status={status}
              first={index === 0}
              onPress={() => onMark(key, nextStatus(status))}
            />
          );
        })}
      </View>
    </Section>
  );
}

/**
 * 한 회차. 줄 전체가 누를 수 있는 영역이다 — 작은 네모만 노리지 않아도 된다.
 * 네모를 왼쪽에 두어 할 일 목록처럼 읽히게 했다.
 */
function DoseRow({
  dose,
  status,
  first,
  onPress,
}: {
  dose: DayDose;
  status: DoseStatus | null;
  first: boolean;
  onPress: () => void;
}) {
  const view = status ? STATUS_VIEW[status] : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        view
          ? `${formatTime(dose.time)} ${dose.medicationName} ${view.label}. 바꾸려면 누르세요`
          : `${formatTime(dose.time)} ${dose.medicationName} 표시 안 됨. 표시하려면 누르세요`
      }
      style={({ pressed }) => [styles.row, !first && styles.rowDivider, pressed && styles.pressed]}
    >
      <Icon
        name={view ? view.icon : 'box'}
        size="lg"
        color={view ? view.color : colors.textSecondary}
      />
      <Text style={styles.rowTime}>{formatTime(dose.time)}</Text>
      <Text style={styles.rowName} numberOfLines={1}>
        {dose.medicationName}
      </Text>
      <Text style={[styles.rowStatus, { color: view ? view.color : colors.textSecondary }]}>
        {view ? view.label : '표시 안 함'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: gutter, paddingVertical: spacing.sm },
  title: { ...type.display, color: colors.text, letterSpacing: -0.4 },
  subtitle: { ...type.caption, color: colors.textSecondary },
  content: { paddingHorizontal: gutter, paddingTop: spacing.md, gap: spacing.xl },

  daySummary: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.bgAlt,
  },
  summaryText: { ...type.caption, color: colors.textSecondary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: hitTarget + 8,
    paddingVertical: spacing.md,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowTime: { ...type.bodyStrong, color: colors.text, minWidth: 84 },
  rowName: { ...type.body, color: colors.textSecondary, flex: 1 },
  rowStatus: { ...type.caption, textAlign: 'right' },
  pressed: { backgroundColor: colors.bgAlt },

  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyTitle: { ...type.title, color: colors.text },
  emptyBody: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
});
