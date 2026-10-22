import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

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
import { colors, radius, spacing } from '../theme';
import { AppButton } from './AppButton';

/** 감기약처럼 기간이 정해진 약을 빨리 넣을 수 있게 하는 단축 버튼. */
const DURATION_PRESETS = [3, 5, 7, 14] as const;

const DEFAULT_TIME = '09:00';
const NAME_MAX = 40;

/** 시각 선택기와 날짜 선택기 중 무엇을 열어 둔 상태인지. */
type PickerTarget =
  | { kind: 'time'; index: number | 'new' }
  | { kind: 'date'; field: 'start' | 'end' };

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
  const [error, setError] = useState<string | null>(null);

  const hasEndDate = endDate !== null;

  function openTimePicker(index: number | 'new') {
    setPicker({ kind: 'time', index });
  }

  function handlePickerChange(event: DateTimePickerEvent, picked?: Date) {
    const target = picker;
    setPicker(null); // 안드로이드 선택기는 대화상자라서 선택/취소와 함께 닫는다.
    if (!target || event.type === 'dismissed' || !picked) return;

    if (target.kind === 'time') {
      const value = toTimeString(picked);
      const duplicate = times.some((t, i) => t === value && i !== target.index);
      if (duplicate) {
        setError('이미 같은 시각이 있습니다.');
        return;
      }
      setError(null);
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
    setError(null);
  }

  function removeTime(index: number) {
    setTimes((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleEndDate(enabled: boolean) {
    // 기본값은 "오늘부터 7일" — 기간이 정해진 약에서 가장 흔한 경우다.
    setEndDate(enabled ? addDays(startDate, 6) : null);
    setError(null);
  }

  function applyPreset(days: number) {
    setEndDate(addDays(startDate, days - 1));
    setError(null);
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('약 이름을 입력해 주세요.');
      return;
    }
    if (times.length === 0) {
      setError('복용 시각을 한 개 이상 추가해 주세요.');
      return;
    }
    if (endDate && endDate < startDate) {
      setError('종료일이 시작일보다 앞설 수 없습니다.');
      return;
    }
    setError(null);
    onSubmit({ name: trimmed, times: sortTimes(times), startDate, endDate });
  }

  const pickerValue =
    picker?.kind === 'time'
      ? parseTime(picker.index === 'new' ? nextSuggestedTime(times) : times[picker.index])
      : parseDate(picker?.field === 'end' ? (endDate ?? startDate) : startDate);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>약 이름</Text>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder="예: 타이레놀"
            placeholderTextColor={colors.muted}
            style={styles.input}
            maxLength={NAME_MAX}
            autoFocus={!medication}
            returnKeyType="done"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>복용 시각</Text>
          <Text style={styles.hint}>하루에 여러 번 먹는 약이면 시각을 여러 개 추가하세요.</Text>
          {times.map((time, index) => (
            <View key={`${time}-${index}`} style={styles.timeRow}>
              <Pressable
                onPress={() => openTimePicker(index)}
                accessibilityRole="button"
                accessibilityLabel={`${formatTime(time)} 수정`}
                style={({ pressed }) => [styles.timeButton, pressed && styles.pressed]}
              >
                <Text style={styles.timeText}>{formatTime(time)}</Text>
              </Pressable>
              <Pressable
                onPress={() => removeTime(index)}
                accessibilityRole="button"
                accessibilityLabel={`${formatTime(time)} 삭제`}
                hitSlop={8}
                style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
              >
                <Text style={styles.removeText}>삭제</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => openTimePicker('new')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.addTime, pressed && styles.pressed]}
          >
            <Text style={styles.addTimeText}>+ 시각 추가</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>복용 시작일</Text>
          <Pressable
            onPress={() => setPicker({ kind: 'date', field: 'start' })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
          >
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <Text style={styles.label}>종료일 없이 계속 복용</Text>
              <Text style={styles.hint}>
                {hasEndDate ? '기간이 정해진 약입니다.' : '끄면 마지막 복용일을 정할 수 있습니다.'}
              </Text>
            </View>
            <Switch
              value={!hasEndDate}
              onValueChange={(value) => toggleEndDate(!value)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.background}
            />
          </View>

          {hasEndDate && endDate && (
            <View style={styles.endDateBlock}>
              <Pressable
                onPress={() => setPicker({ kind: 'date', field: 'end' })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
              >
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </Pressable>
              <Text style={styles.durationText}>
                {startDate === endDate
                  ? '오늘 하루만 복용'
                  : `${dayCount(startDate, endDate)}일치`}
              </Text>
              <View style={styles.presetRow}>
                {DURATION_PRESETS.map((days) => {
                  const active = dayCount(startDate, endDate) === days;
                  return (
                    <Pressable
                      key={days}
                      onPress={() => applyPreset(days)}
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
            </View>
          )}
        </View>

        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

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
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  section: { marginBottom: spacing.lg },
  label: { fontSize: 17, fontWeight: '700', color: colors.text },
  hint: { fontSize: 14, color: colors.muted, marginTop: spacing.xs },
  input: {
    marginTop: spacing.sm,
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.background,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  timeButton: {
    flex: 1,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  timeText: { fontSize: 20, fontWeight: '600', color: colors.text },
  removeButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginLeft: spacing.xs },
  removeText: { fontSize: 15, color: colors.danger, fontWeight: '600' },
  addTime: {
    marginTop: spacing.sm,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.md,
  },
  addTimeText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  dateButton: {
    marginTop: spacing.sm,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  dateText: { fontSize: 18, fontWeight: '600', color: colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabelWrap: { flex: 1, paddingRight: spacing.md },
  endDateBlock: { marginTop: spacing.sm },
  durationText: { marginTop: spacing.sm, fontSize: 15, fontWeight: '600', color: colors.primary },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, gap: spacing.sm },
  preset: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  presetActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetText: { fontSize: 15, fontWeight: '600', color: colors.text },
  presetTextActive: { color: colors.primaryText },
  error: { fontSize: 15, color: colors.danger, fontWeight: '600', marginBottom: spacing.md },
  deleteWrap: { marginTop: spacing.sm },
  pressed: { opacity: 0.7 },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
