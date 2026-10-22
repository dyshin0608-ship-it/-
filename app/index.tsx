import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlarmStatusCard } from '../src/components/AlarmStatusCard';
import { Icon } from '../src/components/Icon';
import { Button, EmptyState, IconButton, Row, Section } from '../src/components/ui';
import { useAlarmStatus } from '../src/hooks/useAlarmStatus';
import {
  dayCount,
  formatCountdown,
  formatDateShort,
  formatDateWithWeekday,
  formatRelativeDay,
  formatTime,
  today,
} from '../src/lib/date';
import { dosesForDate, type DayDose, type DoseOccurrence } from '../src/lib/schedule';
import { getMedications } from '../src/lib/storage';
import type { Medication } from '../src/lib/types';
import { colors, gutter, radius, spacing, type } from '../src/theme';

export default function HomeScreen() {
  const [medications, setMedications] = useState<Medication[] | null>(null);
  const insets = useSafeAreaInsets();
  const alarm = useAlarmStatus();

  // 등록/수정 화면에서 돌아올 때마다 다시 읽는다.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getMedications().then((list) => {
        if (!cancelled) setMedications(list);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

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
                  {todayDoses.map((dose, index) => (
                    <TodayRow
                      key={`${dose.medicationId}-${dose.time}`}
                      dose={dose}
                      now={now}
                      first={index === 0}
                    />
                  ))}
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

function TodayRow({ dose, now, first }: { dose: DayDose; now: Date; first: boolean }) {
  const past = dose.at.getTime() <= now.getTime();
  return (
    <Row first={first} leading={<Icon name="clock" size="md" color={past ? colors.textSecondary : colors.brand} />}>
      <View style={styles.todayRow}>
        <Text style={[styles.todayTime, past && styles.todayPast]}>{formatTime(dose.time)}</Text>
        <Text style={[styles.todayName, past && styles.todayPast]} numberOfLines={1}>
          {dose.medicationName}
        </Text>
        {/* 복용 완료 기능이 없으므로 "먹었다"가 아니라 시계가 지났는지만 말한다. */}
        <Text style={[styles.todayState, past && styles.todayPast]}>
          {past ? '지난 시각' : '예정'}
        </Text>
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
  todayState: { ...type.caption, color: colors.brand },
  todayPast: { color: colors.textSecondary },

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
