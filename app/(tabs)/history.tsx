import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../src/components/Icon';
import {
  addMonths,
  daysInMonth,
  firstWeekday,
  formatDateWithWeekday,
  formatMonth,
  formatTime,
  startOfMonth,
  today,
} from '../../src/lib/date';
import {
  doseKey,
  getDoseRecords,
  setDoseStatus,
  type DoseRecords,
  type DoseStatus,
} from '../../src/lib/doses';
import { dismissDoseNotifications, syncSchedule } from '../../src/lib/notifications';
import { dosesForDate, type DayDose } from '../../src/lib/schedule';
import { getMedications } from '../../src/lib/storage';
import type { DateString, Medication } from '../../src/lib/types';
import { colors, gutter, hitTarget, radius, spacing, type } from '../../src/theme';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const STATUS_VIEW: Record<DoseStatus, { icon: IconName; label: string; color: string }> = {
  taken: { icon: 'box-check', label: '먹었어요', color: colors.success },
  missed: { icon: 'box-x', label: '못 먹었어요', color: colors.danger },
  unknown: { icon: 'box-question', label: '모르겠어요', color: colors.warning },
};

function nextStatus(current: DoseStatus | null): DoseStatus | null {
  if (current === null) return 'taken';
  if (current === 'taken') return 'missed';
  if (current === 'missed') return 'unknown';
  return null;
}

/** 하루를 한 칸으로 줄인 결과. 달력 칸 색을 정한다. */
type DayTally = { total: number; taken: number; missed: number; unknown: number };

function tally(doses: DayDose[], date: DateString, records: DoseRecords): DayTally {
  const t: DayTally = { total: doses.length, taken: 0, missed: 0, unknown: 0 };
  for (const dose of doses) {
    const status = records[doseKey(dose.medicationId, date, dose.time)]?.status;
    if (status === 'taken') t.taken++;
    else if (status === 'missed') t.missed++;
    else if (status === 'unknown') t.unknown++;
  }
  return t;
}

export default function HistoryScreen() {
  const [medications, setMedications] = useState<Medication[] | null>(null);
  const [records, setRecords] = useState<DoseRecords>({});
  const [month, setMonth] = useState<DateString>(() => startOfMonth(today()));
  const [selected, setSelected] = useState<DateString>(() => today());
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
    if (status !== null) await dismissDoseNotifications(key);
    await syncSchedule();
  }

  const todayDate = today();
  const meds = medications ?? [];

  // 달력 한 장. 빈칸으로 요일을 맞춘 뒤 날짜를 채운다.
  const cells = useMemo(() => {
    const out: (DateString | null)[] = Array(firstWeekday(month)).fill(null);
    const count = daysInMonth(month);
    for (let day = 1; day <= count; day++) {
      out.push(`${month.slice(0, 7)}-${String(day).padStart(2, '0')}`);
    }
    return out;
  }, [month]);

  const selectedDoses = dosesForDate(meds, selected);
  const thisMonth = startOfMonth(todayDate);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>복용 기록</Text>
        <Pressable
          onPress={() => router.push('/export')}
          accessibilityRole="button"
          accessibilityLabel="진료용으로 내보내기"
          hitSlop={8}
          style={({ pressed }) => [styles.exportButton, pressed && styles.exportPressed]}
        >
          <Icon name="share" size="md" color={colors.brand} />
          <Text style={styles.exportLabel}>내보내기</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monthBar}>
          <MonthButton icon="chevron-right" flip label="이전 달" onPress={() => setMonth(addMonths(month, -1))} />
          <Text style={styles.monthText}>{formatMonth(month)}</Text>
          <MonthButton
            icon="chevron-right"
            label="다음 달"
            disabled={month >= thisMonth}
            onPress={() => setMonth(addMonths(month, 1))}
          />
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekday}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((date, index) => (
            <DayCell
              key={date ?? `blank-${index}`}
              date={date}
              tally={date ? tally(dosesForDate(meds, date), date, records) : null}
              isToday={date === todayDate}
              isSelected={date === selected}
              isFuture={!!date && date > todayDate}
              onPress={() => date && setSelected(date)}
            />
          ))}
        </View>

        <View style={styles.legend}>
          <LegendDot color={colors.success} label="모두 먹음" />
          <LegendDot color={colors.warning} label="일부" />
          <LegendDot color={colors.danger} label="못 먹음" />
          <LegendDot color={colors.border} label="표시 안 함" />
        </View>

        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{formatDateWithWeekday(selected)}</Text>
          {selectedDoses.length > 0 && (
            <Text style={styles.daySummary}>
              {selectedDoses.length}번 중 {tally(selectedDoses, selected, records).taken}번 먹었어요
            </Text>
          )}
        </View>

        {selectedDoses.length === 0 ? (
          <Text style={styles.noDose}>이 날은 먹을 약이 없었습니다.</Text>
        ) : (
          <View>
            {selectedDoses.map((dose, index) => {
              const key = doseKey(dose.medicationId, selected, dose.time);
              const status = records[key]?.status ?? null;
              return (
                <DoseRow
                  key={key}
                  dose={dose}
                  status={status}
                  first={index === 0}
                  onPress={() => void mark(key, nextStatus(status))}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MonthButton({
  icon,
  label,
  onPress,
  disabled,
  flip,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  flip?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.monthButton,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={flip ? styles.flip : undefined}>
        <Icon name={icon} size="lg" color={colors.text} />
      </View>
    </Pressable>
  );
}

/** 하루 칸. 색 하나로 그날을 요약한다. */
function DayCell({
  date,
  tally: t,
  isToday,
  isSelected,
  isFuture,
  onPress,
}: {
  date: DateString | null;
  tally: DayTally | null;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  onPress: () => void;
}) {
  if (!date || !t) return <View style={styles.cell} />;

  const day = Number(date.slice(8));
  const marked = t.taken + t.missed + t.unknown;
  let fill: string = 'transparent';
  let textColor: string = colors.text;

  if (t.total === 0) {
    textColor = colors.textSecondary;
  } else if (t.taken === t.total) {
    fill = colors.success;
    textColor = colors.bg;
  } else if (marked === 0) {
    fill = isFuture ? 'transparent' : colors.bgAlt;
    textColor = isFuture ? colors.textSecondary : colors.textSecondary;
  } else if (t.taken > 0) {
    fill = colors.warning;
    textColor = colors.bg;
  } else {
    fill = colors.danger;
    textColor = colors.bg;
  }

  const label =
    t.total === 0
      ? `${day}일, 약 없음`
      : `${day}일, ${t.total}번 중 ${t.taken}번 먹음`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.dayDot,
          { backgroundColor: fill },
          isSelected && styles.daySelected,
          isToday && !isSelected && styles.dayToday,
        ]}
      >
        <Text style={[styles.dayText, { color: textColor }]}>{day}</Text>
      </View>
    </Pressable>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

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
      style={({ pressed }) => [styles.row, !first && styles.rowDivider, pressed && styles.rowPressed]}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: gutter,
    paddingVertical: spacing.sm,
  },
  title: { ...type.display, color: colors.text, letterSpacing: -0.4, flex: 1 },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs },
  exportPressed: { opacity: 0.5 },
  exportLabel: { ...type.caption, color: colors.brand, fontWeight: '700' },
  content: { paddingHorizontal: gutter, paddingTop: spacing.sm, gap: spacing.lg },

  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthText: { ...type.title, color: colors.text },
  monthButton: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flip: { transform: [{ scaleX: -1 }] },
  disabled: { opacity: 0.3 },
  pressed: { opacity: 0.6 },

  weekRow: { flexDirection: 'row' },
  weekday: { ...type.caption, color: colors.textSecondary, flex: 1, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: spacing.xs },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { borderWidth: 2, borderColor: colors.brand },
  dayToday: { borderWidth: 1, borderColor: colors.textSecondary },
  dayText: { ...type.label },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...type.caption, color: colors.textSecondary },

  dayHeader: { gap: 2 },
  dayTitle: { ...type.bodyStrong, color: colors.text },
  daySummary: { ...type.caption, color: colors.textSecondary },
  noDose: { ...type.body, color: colors.textSecondary },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: hitTarget + 8,
    paddingVertical: spacing.md,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowPressed: { backgroundColor: colors.bgAlt },
  rowTime: { ...type.bodyStrong, color: colors.text, minWidth: 84 },
  rowName: { ...type.body, color: colors.textSecondary, flex: 1 },
  rowStatus: { ...type.caption, textAlign: 'right' },
});
