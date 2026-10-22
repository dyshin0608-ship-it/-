import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlarmStatusCard } from '../src/components/AlarmStatusCard';
import { Icon, type IconName } from '../src/components/Icon';
import { Button, EmptyState, IconButton, Row, Section } from '../src/components/ui';
import { Pressable } from 'react-native';
import { useAlarmStatus } from '../src/hooks/useAlarmStatus';
import {
  doseKey,
  getDoseRecords,
  setDoseStatus,
  type DoseRecords,
  type DoseStatus,
} from '../src/lib/doses';
import {
  dayCount,
  formatCountdown,
  formatDateShort,
  formatDateWithWeekday,
  formatRelativeDay,
  formatTime,
  today,
} from '../src/lib/date';
import { syncSchedule } from '../src/lib/notifications';
import { dosesForDate, type DayDose, type DoseOccurrence } from '../src/lib/schedule';
import { getMedications } from '../src/lib/storage';
import type { Medication } from '../src/lib/types';
import { colors, gutter, radius, spacing, type } from '../src/theme';

export default function HomeScreen() {
  const [medications, setMedications] = useState<Medication[] | null>(null);
  const [records, setRecords] = useState<DoseRecords>({});
  const insets = useSafeAreaInsets();
  const alarm = useAlarmStatus();

  // 등록/수정 화면에서 돌아올 때마다 다시 읽는다.
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

  /** 표시를 바꾼다. 기록한 회차는 알림이 다시 오지 않도록 예약도 함께 고친다. */
  async function markDose(key: string, status: DoseStatus | null) {
    setRecords((prev) => {
      const next = { ...prev };
      if (status === null) delete next[key];
      else next[key] = { status, recordedAt: new Date().toISOString() };
      return next;
    });
    await setDoseStatus(key, status);
    await syncSchedule();
    await alarm.refresh();
  }

  const now = new Date();
  const todayDate = today();
  const todayDoses = medications ? dosesForDate(medications, todayDate) : [];
  const isEmpty = medications !== null && medications.length === 0;
  // 빈 화면에서는 안내 안에 버튼이 있으므로 하단 버튼을 띄우지 않는다 (같은 행동 중복 금지).
  const showFooter = medications !== null && !isEmpty;
  const footerSpace = showFooter ? 88 + insets.bottom : insets.bottom + spacing.lg;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.brand}>또박</Text>
          <Text style={styles.headerDate}>{formatDateWithWeekday(todayDate)}</Text>
        </View>
        <IconButton name="bell" label="예약된 알림 보기" onPress={() => router.push('/alarms')} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: footerSpace }]}
        showsVerticalScrollIndicator={false}
      >
        <AlarmStatusCard
          permissions={alarm.permissions}
          schedule={alarm.schedule}
          checkFailed={alarm.checkFailed}
          onFixNotifications={alarm.fixNotifications}
          onFixExactAlarms={alarm.fixExactAlarms}
          onRetry={alarm.refresh}
        />

        {isEmpty && (
          <EmptyState
            title="등록된 약이 없어요"
            body="약과 복용 시각을 등록하면 그 시각에 알려 드립니다."
            actionLabel="첫 약 등록하기"
            onAction={() => router.push('/medication/new')}
          />
        )}

        {medications !== null && !isEmpty && (
          <>
            <NextDose
              next={alarm.schedule.next}
              scheduledCount={alarm.scheduledCount}
              now={now}
            />

            {todayDoses.length > 0 && (
              <Section title="오늘 일정">
                <View>
                  {todayDoses.map((dose, index) => {
                    const key = doseKey(dose.medicationId, todayDate, dose.time);
                    return (
                      <TodayRow
                        key={key}
                        dose={dose}
                        now={now}
                        first={index === 0}
                        status={records[key]?.status ?? null}
                        onCycle={() => void markDose(key, nextStatus(records[key]?.status ?? null))}
                      />
                    );
                  })}
                </View>
              </Section>
            )}

            <Section title={`내 약 ${medications.length}`}>
              <View>
                {medications.map((medication, index) => (
                  <MedicationRow
                    key={medication.id}
                    medication={medication}
                    first={index === 0}
                  />
                ))}
              </View>
            </Section>
          </>
        )}
      </ScrollView>

      {showFooter && (
        <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
          <Button label="약 추가" icon="plus" onPress={() => router.push('/medication/new')} />
        </View>
      )}
    </View>
  );
}

function NextDose({
  next,
  scheduledCount,
  now,
}: {
  next: DoseOccurrence | null;
  scheduledCount: number | null;
  now: Date;
}) {
  if (!next) {
    return (
      <View style={styles.nextEmpty}>
        <Text style={styles.nextEmptyText}>예정된 복용이 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.next}>
      <Text style={styles.nextLabel}>다음 복용</Text>
      <Text style={styles.nextName} numberOfLines={2}>
        {next.medicationName}
      </Text>
      <View style={styles.nextWhen}>
        <Icon name="clock" size="md" color={colors.brand} />
        <Text style={styles.nextTime}>
          {formatRelativeDay(next.date)} {formatTime(next.time)}
        </Text>
        <Text style={styles.nextCountdown}>{formatCountdown(next.at, now)}</Text>
      </View>
      {/* 기기에 실제로 걸려 있는 개수만 보여 준다. 확인 못 했으면 숫자를 쓰지 않는다. */}
      <Text style={styles.nextMeta}>
        {scheduledCount === null
          ? '예약 상태를 확인하지 못했습니다'
          : `알림 ${scheduledCount}개 예약됨`}
      </Text>
    </View>
  );
}

/** 빈칸 → 먹음 → 못 먹음 → 모름 → 빈칸. 누를 때마다 한 칸씩 넘어간다. */
function nextStatus(current: DoseStatus | null): DoseStatus | null {
  if (current === null) return 'taken';
  if (current === 'taken') return 'missed';
  if (current === 'missed') return 'unknown';
  return null;
}

const STATUS_VIEW: Record<DoseStatus, { icon: IconName; label: string; color: string }> = {
  taken: { icon: 'box-check', label: '먹었어요', color: colors.success },
  missed: { icon: 'box-x', label: '못 먹었어요', color: colors.danger },
  unknown: { icon: 'box-question', label: '모르겠어요', color: colors.warning },
};

function TodayRow({
  dose,
  now,
  first,
  status,
  onCycle,
}: {
  dose: DayDose;
  now: Date;
  first: boolean;
  status: DoseStatus | null;
  onCycle: () => void;
}) {
  const past = dose.at.getTime() <= now.getTime();
  const view = status ? STATUS_VIEW[status] : null;
  const dim = past && !view;

  return (
    <Row
      first={first}
      leading={<Icon name="clock" size="md" color={dim ? colors.textSecondary : colors.brand} />}
    >
      <View style={styles.todayRow}>
        <Text style={[styles.todayTime, dim && styles.todayPast]}>{formatTime(dose.time)}</Text>
        <Text style={[styles.todayName, dim && styles.todayPast]} numberOfLines={1}>
          {dose.medicationName}
        </Text>

        <Pressable
          onPress={onCycle}
          accessibilityRole="button"
          accessibilityLabel={
            view
              ? `${dose.medicationName} ${formatTime(dose.time)} ${view.label}. 바꾸려면 누르세요`
              : `${dose.medicationName} ${formatTime(dose.time)} 복용 표시하기`
          }
          hitSlop={8}
          style={({ pressed }) => [styles.mark, pressed && styles.markPressed]}
        >
          <Icon
            name={view ? view.icon : 'box'}
            size="lg"
            color={view ? view.color : colors.textSecondary}
          />
          <Text style={[styles.markLabel, { color: view ? view.color : colors.textSecondary }]}>
            {view ? view.label : past ? '지난 시각' : '예정'}
          </Text>
        </Pressable>
      </View>
    </Row>
  );
}

function MedicationRow({ medication, first }: { medication: Medication; first: boolean }) {
  const status = periodStatus(medication);

  return (
    <Row
      first={first}
      showChevron
      onPress={() => router.push({ pathname: '/medication/[id]', params: { id: medication.id } })}
      accessibilityLabel={`${medication.name}, ${status.period}. 수정하려면 누르세요`}
    >
      <View style={styles.medHeader}>
        <Text style={styles.medName} numberOfLines={1}>
          {medication.name}
        </Text>
        {status.badge && (
          <View style={[styles.badge, status.ended && styles.badgeMuted]}>
            <Text style={[styles.badgeText, status.ended && styles.badgeTextMuted]}>
              {status.badge}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.medTimes}>{medication.times.map(formatTime).join(' · ')}</Text>
      <Text style={styles.medPeriod}>{status.period}</Text>
    </Row>
  );
}

/** 목록에 보여 줄 복용 기간 문구와 상태 배지. */
function periodStatus(medication: Medication): {
  period: string;
  badge: string | null;
  ended: boolean;
} {
  const now = today();
  const { startDate, endDate } = medication;

  if (!endDate) {
    return {
      period: `${formatDateShort(startDate)}부터 계속`,
      badge: startDate > now ? '복용 예정' : null,
      ended: false,
    };
  }

  const period = `${formatDateShort(startDate)} ~ ${formatDateShort(endDate)} · ${dayCount(startDate, endDate)}일치`;
  if (endDate < now) return { period, badge: '복용 종료', ended: true };
  if (startDate > now) return { period, badge: '복용 예정', ended: false };
  return { period, badge: null, ended: false };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: gutter,
    paddingVertical: spacing.sm,
  },
  headerText: { flex: 1 },
  brand: { ...type.display, color: colors.text, letterSpacing: -0.4 },
  headerDate: { ...type.caption, color: colors.textSecondary },

  content: { paddingHorizontal: gutter, paddingTop: spacing.md, gap: spacing.xl },

  next: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  nextLabel: { ...type.section, color: colors.brand },
  nextName: { ...type.title, color: colors.text, marginTop: spacing.xs },
  nextWhen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  nextTime: { ...type.bodyStrong, color: colors.text },
  nextCountdown: { ...type.label, color: colors.brand },
  nextMeta: { ...type.caption, color: colors.textSecondary, marginTop: spacing.sm },
  nextEmpty: { backgroundColor: colors.bgAlt, borderRadius: radius.md, padding: spacing.lg },
  nextEmptyText: { ...type.body, color: colors.textSecondary },

  todayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  todayTime: { ...type.bodyStrong, color: colors.text, minWidth: 88 },
  todayName: { ...type.body, color: colors.textSecondary, flex: 1 },
  todayPast: { color: colors.textSecondary },
  mark: { alignItems: 'center', gap: 2, minWidth: 64 },
  markPressed: { opacity: 0.55 },
  markLabel: { ...type.caption, fontSize: 11, textAlign: 'center' },

  medHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  medName: { ...type.bodyStrong, color: colors.text, flexShrink: 1 },
  medTimes: { ...type.body, color: colors.textSecondary, marginTop: 2 },
  medPeriod: { ...type.caption, color: colors.textSecondary, marginTop: 2 },

  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
  },
  badgeMuted: { backgroundColor: colors.bgAlt },
  badgeText: { ...type.caption, color: colors.brand, fontWeight: '700' },
  badgeTextMuted: { color: colors.textSecondary },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: gutter,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
