import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlarmStatusCard } from '../src/components/AlarmStatusCard';
import { AppButton } from '../src/components/AppButton';
import { dayCount, formatDate, formatDateShort, formatTime, today } from '../src/lib/date';
import { useAlarmStatus } from '../src/hooks/useAlarmStatus';
import { getMedications } from '../src/lib/storage';
import type { Medication } from '../src/lib/types';
import { colors, radius, spacing } from '../src/theme';

export default function MedicationListScreen() {
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

  const isEmpty = medications !== null && medications.length === 0;

  return (
    <View style={styles.container}>
      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyCardSlot}>
            <AlarmStatusCard
              permissions={alarm.permissions}
              schedule={alarm.schedule}
              onFixNotifications={alarm.fixNotifications}
              onFixExactAlarms={alarm.fixExactAlarms}
            />
          </View>
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>등록된 약이 없습니다</Text>
            <Text style={styles.emptyBody}>
              약을 등록하면 정해진 시각에 알림이 울립니다.{'\n'}
              알림은 기기에 직접 예약되므로 인터넷이 끊겨도 옵니다.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={medications ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <MedicationRow medication={item} />}
          ListHeaderComponent={
            <AlarmStatusCard
              permissions={alarm.permissions}
              schedule={alarm.schedule}
              onFixNotifications={alarm.fixNotifications}
              onFixExactAlarms={alarm.fixExactAlarms}
            />
          }
        />
      )}

      <View style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}>
        <AppButton label="약 추가" onPress={() => router.push('/medication/new')} />
      </View>
    </View>
  );
}

function MedicationRow({ medication }: { medication: Medication }) {
  const status = periodStatus(medication);

  return (
    <Link href={{ pathname: '/medication/[id]', params: { id: medication.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${medication.name} 수정`}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.rowHeader}>
          <Text style={styles.rowName} numberOfLines={1}>
            {medication.name}
          </Text>
          {status.badge && (
            <View style={[styles.badge, status.badge === '복용 종료' && styles.badgeMuted]}>
              <Text style={[styles.badgeText, status.badge === '복용 종료' && styles.badgeTextMuted]}>
                {status.badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.rowTimes}>{medication.times.map(formatTime).join(' · ')}</Text>
        <Text style={styles.rowPeriod}>{status.period}</Text>
      </Pressable>
    </Link>
  );
}

/** 목록에 보여 줄 복용 기간 문구와 상태 배지. */
function periodStatus(medication: Medication): { period: string; badge: string | null } {
  const now = today();
  const { startDate, endDate } = medication;

  if (!endDate) {
    const period = `${formatDate(startDate)}부터 계속`;
    return { period, badge: startDate > now ? '복용 예정' : null };
  }

  const period = `${formatDateShort(startDate)} ~ ${formatDateShort(endDate)} (${dayCount(startDate, endDate)}일치)`;
  if (endDate < now) return { period, badge: '복용 종료' };
  if (startDate > now) return { period, badge: '복용 예정' };
  return { period, badge: null };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  emptyWrap: { flex: 1 },
  emptyCardSlot: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  rowPressed: { backgroundColor: colors.surface },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  rowName: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text },
  badge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: '#E7F0FD',
  },
  badgeMuted: { backgroundColor: colors.surface },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  badgeTextMuted: { color: colors.muted },
  rowTimes: { marginTop: spacing.sm, fontSize: 17, fontWeight: '600', color: colors.text },
  rowPeriod: { marginTop: spacing.xs, fontSize: 14, color: colors.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyBody: {
    marginTop: spacing.sm,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
