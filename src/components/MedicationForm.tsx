import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { searchDrugs } from '../lib/drugs';
import type { DateString, Medication, MedicationInput, TimeString } from '../lib/types';
import { colors, gutter, hitTarget, radius, spacing, type } from '../theme';
import { Icon } from './Icon';
import { Button, FieldError, Row, Section, TextField } from './ui';

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
  // 식약처 자료에서 고른 약. 고르지 않아도 등록은 된다.
  const [drugSeq, setDrugSeq] = useState<string | undefined>(medication?.drugSeq);
  const insets = useSafeAreaInsets();

  const hasEndDate = endDate !== null;
  // 이름을 직접 치는 중에만 후보를 띄운다. 이미 골랐으면 띄우지 않는다.
  const suggestions = useMemo(
    () => (drugSeq ? [] : searchDrugs(name)),
    [name, drugSeq],
  );

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
    if (saving) return; // 중복 제출 방지

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
    onSubmit({ name: trimmed, times: sortTimes(times), startDate, endDate, drugSeq });
  }

  const pickerValue =
    picker?.kind === 'time'
      ? parseTime(picker.index === 'new' ? nextSuggestedTime(times) : times[picker.index])
      : parseDate(picker?.field === 'end' ? (endDate ?? startDate) : startDate);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View>
          <TextField
            label="약 이름"
            value={name}
            onChangeText={(text) => {
              setName(text);
              // 이름을 고쳐 쓰면 골라 둔 약과 어긋나므로 연결을 끊는다.
              setDrugSeq(undefined);
              clearError('name');
            }}
            placeholder="예: 타이레놀, 위장약"
            maxLength={NAME_MAX}
            autoFocus={!medication}
            returnKeyType="done"
            error={errors.name}
          />

          {name.trim().length >= 2 && suggestions.length === 0 && !drugSeq && (
            <Text style={styles.suggestNone}>
              식약처 자료에서 찾지 못했습니다. 이름 그대로 등록해도 알림은 정상입니다.
            </Text>
          )}

          {suggestions.length > 0 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestHint}>식약처 자료에서 찾았어요</Text>
              {suggestions.map((drug, index) => (
                <Row
                  key={drug.seq}
                  first={index === 0}
                  showChevron
                  onPress={() => {
                    setName(drug.name);
                    setDrugSeq(drug.seq);
                    clearError('name');
                  }}
                  accessibilityLabel={`${drug.name} 선택`}
                >
                  <Text style={styles.suggestName} numberOfLines={1}>
                    {drug.name}
                  </Text>
                  {/* 쓰임새로 찾은 약은 왜 나왔는지 보여 준다 */}
                  <Text style={styles.suggestMaker} numberOfLines={2}>
                    {drug.matchedBy === 'efficacy' ? drug.efficacy : drug.maker}
                  </Text>
                </Row>
              ))}
            </View>
          )}

          {drugSeq && (
            <View style={styles.linked}>
              <Row
                first
                showChevron
                onPress={() => router.push({ pathname: '/drug/[seq]', params: { seq: drugSeq } })}
                accessibilityLabel="이 약의 정보 보기"
                leading={<Icon name="help" size="md" color={colors.brand} />}
              >
                <Text style={styles.linkedText}>이 약은 어떨 때 먹나요?</Text>
              </Row>
            </View>
          )}
        </View>

        <Section title="복용 시각">
          <View>
            {times.map((time, index) => (
              <Row
                key={`${time}-${index}`}
                first={index === 0}
                leading={<Icon name="clock" size="md" color={colors.textSecondary} />}
                onPress={() => setPicker({ kind: 'time', index })}
                accessibilityLabel={`${formatTime(time)} 변경`}
                trailing={
                  <Pressable
                    onPress={() => {
                      setTimes((prev) => prev.filter((_, i) => i !== index));
                      clearError('times');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatTime(time)} 삭제`}
                    hitSlop={10}
                    style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                  >
                    <Icon name="close" size="md" color={colors.textSecondary} />
                  </Pressable>
                }
              >
                <Text style={styles.timeText}>{formatTime(time)}</Text>
              </Row>
            ))}
          </View>
          <Button
            label="시각 추가"
            icon="plus"
            variant="quiet"
            fullWidth={false}
            onPress={() => setPicker({ kind: 'time', index: 'new' })}
          />
          {errors.times && <FieldError message={errors.times} />}
        </Section>

        <Section title="복용 시작일">
          <Row
            first
            leading={<Icon name="calendar" size="md" color={colors.textSecondary} />}
            showChevron
            onPress={() => setPicker({ kind: 'date', field: 'start' })}
            accessibilityLabel={`복용 시작일 ${formatDate(startDate)}, 변경하려면 누르세요`}
          >
            <Text style={styles.dateText}>{formatDate(startDate)}</Text>
          </Row>
        </Section>

        <Section title="복용 기간">
          <View style={styles.segmented}>
            <Segment label="계속 복용" selected={!hasEndDate} onPress={() => setOngoing(true)} />
            <Segment label="기간 정하기" selected={hasEndDate} onPress={() => setOngoing(false)} />
          </View>

          {hasEndDate && endDate ? (
            <>
              <Row
                first
                leading={<Icon name="calendar" size="md" color={colors.textSecondary} />}
                showChevron
                onPress={() => setPicker({ kind: 'date', field: 'end' })}
                accessibilityLabel={`복용 종료일 ${formatDate(endDate)}, 변경하려면 누르세요`}
              >
                <Text style={styles.dateCaption}>마지막 복용일</Text>
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </Row>
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
              <Text style={styles.summary}>
                {startDate === endDate
                  ? '오늘 하루만 복용합니다.'
                  : `${dayCount(startDate, endDate)}일치입니다. 마지막 날이 지나면 알림이 저절로 멈춥니다.`}
              </Text>
            </>
          ) : (
            <Text style={styles.summary}>
              종료일 없이 계속 복용합니다. 나중에 언제든 기간을 정할 수 있습니다.
            </Text>
          )}
          {errors.endDate && <FieldError message={errors.endDate} />}
        </Section>

        {onDelete && (
          <Button label="이 약 삭제" icon="trash" variant="danger" onPress={onDelete} />
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <Button label={submitLabel} onPress={handleSubmit} loading={saving} disabled={saving} />
      </View>

      {picker && (
        <DateTimePicker
          value={pickerValue}
          mode={picker.kind}
          display="default"
          onChange={handlePickerChange}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function Segment({
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
  content: { padding: gutter, paddingBottom: spacing.xxl, gap: spacing.xl },

  suggestions: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bgAlt,
  },
  suggestHint: { ...type.caption, color: colors.textSecondary, paddingTop: spacing.md },
  suggestNone: { ...type.caption, color: colors.textSecondary, marginTop: spacing.md },
  suggestName: { ...type.bodyStrong, color: colors.text },
  suggestMaker: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  linked: { marginTop: spacing.sm },
  linkedText: { ...type.bodyStrong, color: colors.brand },

  timeText: { ...type.bodyStrong, color: colors.text },
  remove: {
    width: hitTarget - 8,
    height: hitTarget - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateText: { ...type.bodyStrong, color: colors.text },
  dateCaption: { ...type.caption, color: colors.textSecondary, marginBottom: 2 },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.bgAlt,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: hitTarget - 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  segmentActive: { backgroundColor: colors.bg },
  segmentText: { ...type.label, color: colors.textSecondary, textAlign: 'center' },
  segmentTextActive: { color: colors.brand },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preset: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.bgAlt,
  },
  presetActive: { backgroundColor: colors.brand },
  presetText: { ...type.label, color: colors.textSecondary },
  presetTextActive: { color: colors.textOnBrand },

  summary: { ...type.caption, color: colors.textSecondary, lineHeight: 19 },
  pressed: { opacity: 0.6 },

  footer: {
    paddingHorizontal: gutter,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
