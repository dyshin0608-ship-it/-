import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlarmStatusCard } from '../src/components/AlarmStatusCard';
import { AppButton } from '../src/components/AppButton';
import { Card } from '../src/components/Card';
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
import { dosesForDate, type DayDose } from '../src/lib/schedule';
import { getMedications } from '../src/lib/storage';
import type { Medication } from '../src/lib/types';
import { colors, hitTarget, radius, spacing, type } from '../src/theme';

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

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.brand}>또박</Text>
          <Text style={styles.headerDate}>{formatDateWithWeekday(todayDate)}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/alarms')}
          accessibilityRole="button"
          accessibilityLabel="예약된 알림 보기"
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Text style={styles.headerButtonIcon}>🔔</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, isEmpty && styles.contentEmpty]}
        showsVerticalScrollIndicator={false}
      >
        <AlarmStatusCard
          permissions={alarm.permissions}
          schedule={alarm.schedule}
          onFixNotifications={alarm.fixNotifications}
          onFixExactAlarms={alarm.fixExactAlarms}
        />

        {isEmpty ? (
          <EmptyState />
        ) : (
          medications !== null && (
            <>
              <NextDoseCard
                next={alarm.schedule.next}
                scheduledCount={alarm.schedule.count}
                now={now}
                onOpenDiagnostics={() => router.push('/alarms')}
              />

              {todayDoses.length > 0 && <TodaySection doses={todayDoses} now={now} />}

              <Section title="내 약" count={medications.length}>
                <View style={styles.medicationList}>
                  {medications.map((medication) => (
                    <MedicationRow key={medication.id} medication={medication} />
                  ))}
                </View>
              </Section>
            </>
          )
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: spacing.lg + insets.bottom }]}>
        <AppButton
          label="약 추가"
          leading="＋"
          onPress={() => router.push('/medication/new')}
        />
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <Card style={styles.empty}>
      <Text style={styles.emptyIcon}>💊</Text>
      <Text style={styles.emptyTitle}>아직 등록된 약이 없어요</Text>
      <Text style={styles.emptyBody}>
        약과 복용 시각을 등록하면 그 시각에 또박이 알려 드립니다. 알림은 기기에 직접 예약되어
        인터넷이 끊겨도 울립니다.
      </Text>
      <View style={styles.emptyAction}>
        <AppButton label="첫 약 등록하기" onPress={() => router.push('/medication/new')} />
      </View>
    </Card>
  );
}

function NextDoseCard({
  next,
  scheduledCount,
  now,
  onOpenDiagnostics,
}: {
  next: { medicationName: string; date: string; time: string; at: Date } | null;
  scheduledCount: number;
  now: Date;
  onOpenDiagnostics: () => void;
}) {
  if (!next) {
    return (
      <Card tone="muted">
        <Text style={styles.nextLabel}>다음 복용</Text>
        <Text style={styles.nextEmpty}>예정된 복용이 없습니다.</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.nextLabel}>다음 복용</Text>
      <View style={styles.nextMain}>
        <Text style={styles.nextName} numberOfLines={2}>
          {next.medicationName}
        </Text>
        <Text style={styles.nextTime}>
          {formatRelativeDay(next.date)} {formatTime(next.time)}
        </Text>
      </View>
      <View style={styles.nextBadge}>
        <Text style={styles.nextBadgeText}>{formatCountdown(next.at, now)}</Text>
      </View>
      <Pressable
        onPress={onOpenDiagnostics}
        accessibilityRole="button"
        accessibilityLabel={`예약된 알림 ${scheduledCount}개 보기`}
        style={({ pressed }) => [styles.nextFooter, pressed && styles.pressed]}
      >
        <Text style={styles.nextFooterText}>알림 {scheduledCount}개 예약됨</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Card>
  );
}

function TodaySection({ doses, now }: { doses: DayDose[]; now: Date }) {
  return (
    <Section title="오늘 일정" count={doses.length}>
      <Card padded={false}>
        {doses.map((dose, index) => {
          const past = dose.at.getTime() <= now.getTime();
          return (
            <View
              key={`${dose.medicationId}-${dose.time}`}
              style={[styles.doseRow, index > 0 && styles.doseRowDivider]}
            >
              <Text style={[styles.doseTime, past && styles.doseTextPast]}>
                {formatTime(dose.time)}
              </Text>
              <Text
                style={[styles.doseName, past && styles.doseTextPast]}
                numberOfLines={1}
              >
                {dose.medicationName}
              </Text>
              <Text style={[styles.doseState, past && styles.doseStatePast]}>
                {past ? '지난 시각' : '예정'}
              </Text>
            </View>
          );
        })}
      </Card>
    </Section>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined && <Text style={styles.sectionCount}>{count}</Text>}
      </View>
      {children}
    </View>
  );
}

function MedicationRow({ medication }: { medication: Medication }) {
  const status = periodStatus(medication);

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/medication/[id]', params: { id: medication.id } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${medication.name}, ${status.period}. 수정하려면 누르세요`}
      style={({ pressed }) => [styles.medicationRow, pressed && styles.medicationRowPressed]}
    >
      <View style={styles.medicationMain}>
        <View style={styles.medicationHeader}>
          <Text style={styles.medicationName} numberOfLines={1}>
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
        <Text style={styles.medicationTimes}>
          {medication.times.map(formatTime).join(' · ')}
        </Text>
        <Text style={styles.medicationPeriod}>{status.period}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1 },
  brand: { ...type.display, color: colors.text, letterSpacing: -0.5 },
  headerDate: { ...type.caption, color: colors.textMuted, marginTop: 2 },
  headerButton: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerButtonIcon: { fontSize: 18 },

  content: { padding: spacing.lg, paddingTop: spacing.xs, gap: spacing.lg, paddingBottom: spacing.xl },
  contentEmpty: { flexGrow: 1, justifyContent: 'center' },

  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { ...type.title, color: colors.text, textAlign: 'center' },
  emptyBody: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyAction: { marginTop: spacing.xl, alignSelf: 'stretch' },

  nextLabel: { ...type.label, color: colors.textMuted },
  nextEmpty: { ...type.body, color: colors.textSecondary, marginTop: spacing.sm },
  nextMain: { marginTop: spacing.sm },
  nextName: { ...type.title, color: colors.text },
  nextTime: { ...type.body, color: colors.textSecondary, marginTop: 2 },
  nextBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  nextBadgeText: { ...type.label, color: colors.brand },
  nextFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    minHeight: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextFooterText: { ...type.caption, color: colors.textMuted, flex: 1 },

  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...type.heading, color: colors.text },
  sectionCount: { ...type.caption, color: colors.textMuted },

  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: hitTarget,
  },
  doseRowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  doseTime: { ...type.mono, color: colors.text, minWidth: 86 },
  doseName: { ...type.body, color: colors.textSecondary, flex: 1 },
  doseState: { ...type.caption, color: colors.brand },
  doseTextPast: { color: colors.textMuted },
  doseStatePast: { color: colors.textMuted },

  medicationList: { gap: spacing.sm },
  medicationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  medicationRowPressed: { backgroundColor: colors.surfaceAlt },
  medicationMain: { flex: 1 },
  medicationHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  medicationName: { ...type.bodyStrong, color: colors.text, flexShrink: 1 },
  medicationTimes: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs },
  medicationPeriod: { ...type.caption, color: colors.textMuted, marginTop: 2 },

  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
  },
  badgeMuted: { backgroundColor: colors.surfaceAlt },
  badgeText: { ...type.caption, color: colors.brand, fontWeight: '700' },
  badgeTextMuted: { color: colors.textMuted },

  chevron: { ...type.title, color: colors.textMuted, marginLeft: spacing.sm },
  pressed: { opacity: 0.7 },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
