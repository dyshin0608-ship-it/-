import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  addDays,
  dayCount,
  formatDate,
  formatTime,
  minutesOf,
  parseDate,
  parseTime,
  sortTimes,
  toDateString,
  today,
  toTimeString,
} from '../lib/date';
import type { DateString, Medication, MedicationInput, TimeString } from '../lib/types';
import { colors, hitTarget, radius, spacing, type } from '../theme';
import { AppButton } from './AppButton';
import { Card } from './Card';

/** 감기약처럼 기간이 정해진 약을 빨리 넣을 수 있게 하는 단축 버튼. */
const DURATION_PRESETS = [3, 5, 7, 14] as const;

const DEFAULT_TIME = '09:00';
const NAME_MAX = 40;

/** 시각 선택기와 날짜 선택기 중 무엇을 열어 둔 상태인지. */
type PickerTarget =
  | { kind: 'time'; index: number | 'new' }
  | { kind: 'date'; field: 'start' | 'end' };

/** 항목별 오류. 어느 칸이 잘못됐는지 그 칸 아래에 바로 보여 준다. */
type Errors = { name?: string; times?: string; endDate?: string };

type Props = {
  /** 수정일 때 기존 약. 등록이면 넘기지 않는다. */
  medication?: Medication;
  submitLabel: string;
  onSubmit: (input: MedicationInput) => void;
  onDelete?: () => void;
  saving?: boolean;
};

export function MedicationForm({ medication, submitLabel, onSubmit, onDelete, saving }: Props) {
  const [name, setName] = useState(medication?.name ?? '');
  const [times, setTimes] = useState<TimeString[]>(medication?.times ?? [DEFAULT_TIME]);
  const [startDate, setStartDate] = useState<DateString>(medication?.startDate ?? today());
  const [endDate, setEndDate] = useState<DateString | null>(medication?.endDate ?? null);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const hasEndDate = endDate !== null;

  function clearError(field: keyof Errors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handlePickerChange(event: DateTimePickerEvent, picked?: Date) {
    const target = picker;
    setPicker(null); // 안드로이드 선택기는 대화상자라서 선택/취소와 함께 닫는다.
    if (!target || event.type === 'dismissed' || !picked) return;

    if (target.kind === 'time') {
      const value = toTimeString(picked);
      const duplicate = times.some((t, i) => t === value && i !== target.index);
      if (duplicate) {
        setErrors((prev) => ({ ...prev, times: '이미 같은 시각이 있습니다.' }));
        return;
      }
      clearError('times');
      setTimes((prev) =>
        sortTimes(
          target.index === 'new'
            ? [...prev, value]
            : prev.map((t, i) => (i === target.index ? value : t)),
        ),
      );
      return;
    }

    const value = toDateString(picked);
    if (target.field === 'start') {
      setStartDate(value);
      // 시작일이 종료일보다 늦어지면 종료일을 같이 밀어 준다.
      if (endDate && value > endDate) setEndDate(value);
    } else {
      setEndDate(value);
    }
    clearError('endDate');
  }

  function setOngoing(ongoing: boolean) {
    // 기간을 정할 때 기본값은 "오늘부터 7일" — 가장 흔한 경우다.
    setEndDate(ongoing ? null : addDays(startDate, 6));
    clearError('endDate');
  }

  function handleSubmit() {
    const trimmed = name.trim();
    const next: Errors = {};
    if (!trimmed) next.name = '약 이름을 입력해 주세요.';
    if (times.length === 0) next.times = '복용 시각을 한 개 이상 추가해 주세요.';
    if (endDate && endDate < startDate) next.endDate = '종료일이 시작일보다 앞설 수 없습니다.';

    if (next.name || next.times || next.endDate) {
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit({ name: trimmed, times: sortTimes(times), startDate, endDate });
  }

  const pickerValue =
    picker?.kind === 'time'
      ? parseTime(picker.index === 'new' ? nextSuggestedTime(times) : times[picker.index])
      : parseDate(picker?.field === 'end' ? (endDate ?? startDate) : startDate);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Field label="약 이름" error={errors.name}>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              clearError('name');
            }}
            placeholder="예: 타이레놀"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, errors.name && styles.inputError]}
            maxLength={NAME_MAX}
            autoFocus={!medication}
            returnKeyType="done"
            accessibilityLabel="약 이름"
          />
        </Field>

        <Field
          label="복용 시각"
          hint="하루에 여러 번 먹는 약이면 시각을 여러 개 추가하세요."
          error={errors.times}
        >
          <View style={styles.timeList}>
            {times.map((time, index) => (
              <View key={`${time}-${index}`} style={styles.timeChip}>
                <Pressable
                  onPress={() => setPicker({ kind: 'time', index })}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatTime(time)} 변경`}
                  style={({ pressed }) => [styles.timeChipMain, pressed && styles.pressed]}
                >
                  <Text style={styles.timeText}>{formatTime(time)}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setTimes((prev) => prev.filter((_, i) => i !== index));
                    clearError('times');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatTime(time)} 삭제`}
                  hitSlop={10}
                  style={({ pressed }) => [styles.timeChipRemove, pressed && styles.pressed]}
                >
                  <Text style={styles.timeChipRemoveText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.addTime}>
            <AppButton
              label="시각 추가"
              leading="＋"
              variant="secondary"
              size="sm"
              onPress={() => setPicker({ kind: 'time', index: 'new' })}
            />
          </View>
        </Field>

        <Field label="복용 시작일">
          <DateRow
            value={formatDate(startDate)}
            onPress={() => setPicker({ kind: 'date', field: 'start' })}
            accessibilityLabel={`복용 시작일 ${formatDate(startDate)}, 변경하려면 누르세요`}
          />
        </Field>

        <Field label="복용 기간" error={errors.endDate}>
          <View style={styles.segmented}>
            <SegmentButton
              label="계속 복용"
              selected={!hasEndDate}
              onPress={() => setOngoing(true)}
            />
            <SegmentButton
              label="기간 정하기"
              selected={hasEndDate}
              onPress={() => setOngoing(false)}
            />
          </View>

          {hasEndDate && endDate ? (
            <View style={styles.periodBlock}>
              <DateRow
                value={formatDate(endDate)}
                caption="마지막 복용일"
                onPress={() => setPicker({ kind: 'date', field: 'end' })}
                accessibilityLabel={`복용 종료일 ${formatDate(endDate)}, 변경하려면 누르세요`}
              />
              <View style={styles.presetRow}>
                {DURATION_PRESETS.map((days) => {
                  const active = dayCount(startDate, endDate) === days;
                  return (
                    <Pressable
                      key={days}
                      onPress={() => {
                        setEndDate(addDays(startDate, days - 1));
                        clearError('endDate');
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={({ pressed }) => [
                        styles.preset,
                        active && styles.presetActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.presetText, active && styles.presetTextActive]}>
                        {days}일치
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.periodSummary}>
                {startDate === endDate
                  ? '오늘 하루만 복용합니다.'
                  : `${dayCount(startDate, endDate)}일치입니다. 마지막 날이 지나면 알림이 저절로 멈춥니다.`}
              </Text>
            </View>
          ) : (
            <Text style={styles.periodSummary}>
              종료일 없이 계속 복용합니다. 나중에 언제든 기간을 정할 수 있습니다.
            </Text>
          )}
        </Field>

        {onDelete && (
          <View style={styles.deleteWrap}>
            <AppButton label="이 약 삭제" variant="danger" onPress={onDelete} />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton label={submitLabel} onPress={handleSubmit} loading={saving} />
      </View>

      {picker && (
        <DateTimePicker
          value={pickerValue}
          mode={picker.kind}
          display="default"
          onChange={handlePickerChange}
        />
      )}
    </View>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      <View style={styles.fieldBody}>{children}</View>
      {error && (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </Card>
  );
}

function DateRow({
  value,
  caption,
  onPress,
  accessibilityLabel,
}: {
  value: string;
  caption?: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.dateRow, pressed && styles.pressed]}
    >
      <View style={styles.dateRowText}>
        {caption && <Text style={styles.dateCaption}>{caption}</Text>}
        <Text style={styles.dateValue}>{value}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.segment,
        selected && styles.segmentActive,
        pressed && !selected && styles.pressed,
      ]}
    >
      <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

/** 새 시각을 추가할 때 선택기에 띄울 초기값. 마지막 시각보다 늦게 잡아 준다. */
function nextSuggestedTime(times: TimeString[]): TimeString {
  if (times.length === 0) return DEFAULT_TIME;
  const last = Math.max(...times.map(minutesOf));
  const suggested = Math.min(last + 240, 22 * 60); // 4시간 뒤, 늦어도 밤 10시
  const h = Math.floor(suggested / 60);
  const m = suggested % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  field: {},
  fieldLabel: { ...type.heading, color: colors.text },
  fieldHint: { ...type.caption, color: colors.textMuted, marginTop: spacing.xs },
  fieldBody: { marginTop: spacing.md },
  fieldError: { ...type.label, color: colors.danger, marginTop: spacing.md },

  input: {
    minHeight: hitTarget + 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    ...type.body,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },

  timeList: { gap: spacing.sm },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  timeChipMain: {
    flex: 1,
    minHeight: hitTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  timeText: { ...type.bodyStrong, color: colors.text },
  timeChipRemove: {
    width: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  timeChipRemoveText: { ...type.body, color: colors.textMuted },
  addTime: { marginTop: spacing.md, alignItems: 'flex-start' },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: hitTarget + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  dateRowText: { flex: 1 },
  dateCaption: { ...type.caption, color: colors.textMuted, marginBottom: 2 },
  dateValue: { ...type.bodyStrong, color: colors.text },
  chevron: { ...type.title, color: colors.textMuted, marginLeft: spacing.sm },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: hitTarget - 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { ...type.label, color: colors.textSecondary, textAlign: 'center' },
  segmentTextActive: { color: colors.brand },

  periodBlock: { marginTop: spacing.md, gap: spacing.md },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preset: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  presetActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  presetText: { ...type.label, color: colors.textSecondary },
  presetTextActive: { color: colors.onBrand },
  periodSummary: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },

  deleteWrap: { marginTop: spacing.sm },
  pressed: { opacity: 0.7 },

  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
