import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../src/components/Icon';
import { Button, Notice, Row, Section } from '../src/components/ui';
import { buyExport, loadProduct, restoreExport, verifyEntitlement, type ExportProduct } from '../src/lib/billing';
import { addDays, formatDate, today } from '../src/lib/date';
import { getDoseRecords } from '../src/lib/doses';
import { exportReportPdf, printReport } from '../src/lib/export';
import { adherence, buildReport, type Report } from '../src/lib/report';
import { getMedications } from '../src/lib/storage';
import { colors, gutter, hitTarget, radius, spacing, type } from '../src/theme';

const PERIODS = [
  { days: 7, label: '최근 7일' },
  { days: 30, label: '최근 30일' },
  { days: 90, label: '최근 90일' },
] as const;

/**
 * 진료용 복약 기록 내보내기.
 *
 * 유료는 **내보내기만**이다. 기록을 보는 것은 기록 탭에서 계속 무료다.
 * 자기가 적은 복약 기록을 돈 내고 보게 만들지 않는다.
 */
export default function ExportScreen() {
  const [days, setDays] = useState<number>(30);
  const [report, setReport] = useState<Report | null>(null);
  const [owned, setOwned] = useState<boolean | null>(null);
  const [product, setProduct] = useState<ExportProduct | null>(null);
  const [busy, setBusy] = useState(false);

  const loadReport = useCallback(async (period: number) => {
    const [medications, records] = await Promise.all([getMedications(), getDoseRecords()]);
    const to = today();
    setReport(buildReport(medications, records, addDays(to, -(period - 1)), to, new Date()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await loadReport(days);
        const entitlement = await verifyEntitlement();
        setOwned(entitlement !== null);
        if (entitlement === null) setProduct(await loadProduct());
      })();
    }, [days, loadReport]),
  );

  async function handlePeriod(next: number) {
    setDays(next);
    await loadReport(next);
  }

  async function handleBuy() {
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await buyExport();
      if (outcome.kind === 'owned') {
        setOwned(true);
        Alert.alert('구매가 끝났습니다', '이제 복약 기록을 PDF로 내보낼 수 있습니다.');
      } else if (outcome.kind === 'pending') {
        Alert.alert('결제를 기다리는 중입니다', '승인되면 자동으로 쓸 수 있게 됩니다.');
      } else if (outcome.kind === 'unavailable') {
        Alert.alert(
          '지금은 구매할 수 없습니다',
          '구글 플레이에서 설치한 앱에서만 구매할 수 있습니다.',
        );
      } else if (outcome.kind === 'failed') {
        Alert.alert('구매하지 못했습니다', outcome.message || '잠시 후 다시 시도해 주세요.');
      }
      // 'cancelled'는 사용자가 닫은 것이므로 아무 말도 하지 않는다.
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (busy) return;
    setBusy(true);
    try {
      const entitlement = await restoreExport();
      setOwned(entitlement !== null);
      Alert.alert(
        entitlement ? '구매를 불러왔습니다' : '구매 기록이 없습니다',
        entitlement
          ? '이제 복약 기록을 PDF로 내보낼 수 있습니다.'
          : '구매할 때 쓴 구글 계정으로 로그인되어 있는지 확인해 주세요.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    if (busy || !report) return;
    setBusy(true);
    try {
      const result = await exportReportPdf(report);
      if (result.kind === 'saved') {
        Alert.alert('PDF를 만들었습니다', `공유 화면을 열지 못해 파일로 저장했습니다.\n${result.uri}`);
      } else if (result.kind === 'failed') {
        Alert.alert('내보내지 못했습니다', result.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handlePrint() {
    if (busy || !report) return;
    setBusy(true);
    try {
      await printReport(report);
    } finally {
      setBusy(false);
    }
  }

  const rate = report ? adherence(report.total) : null;
  const nothingToExport = report !== null && report.total.due === 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Section title="기간">
        <View style={styles.segmented}>
          {PERIODS.map((period) => {
            const active = period.days === days;
            return (
              <Pressable
                key={period.days}
                onPress={() => void handlePeriod(period.days)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.segment,
                  active && styles.segmentActive,
                  pressed && !active && styles.segmentPressed,
                ]}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {period.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {report && (
          <Text style={styles.footnote}>
            {formatDate(report.from)} ~ {formatDate(report.to)}
          </Text>
        )}
      </Section>

      <Section title="들어갈 내용">
        {report === null ? (
          <ActivityIndicator color={colors.brand} />
        ) : nothingToExport ? (
          <Text style={styles.empty}>이 기간에 복용할 약이 없었습니다. 기간을 넓혀 보세요.</Text>
        ) : (
          <>
            <View style={styles.cards}>
              <Stat label="예정" value={String(report.total.due)} />
              <Stat label="먹음" value={String(report.total.taken)} tint={colors.success} />
              <Stat label="못 먹음" value={String(report.total.missed)} tint={colors.danger} />
              <Stat label="모름" value={String(report.total.unknown)} tint={colors.warning} />
            </View>
            <View>
              <Row first leading={<Icon name="pill" size="md" color={colors.textSecondary} />}>
                <Text style={styles.rowLabel}>약 {report.medications.length}개</Text>
                <Text style={styles.rowHint} numberOfLines={2}>
                  {report.medications.map((medication) => medication.name).join(', ')}
                </Text>
              </Row>
              <Row leading={<Icon name="check-circle" size="md" color={colors.textSecondary} />}>
                <Text style={styles.rowLabel}>
                  복용률 {rate === null ? '기록 없음' : `${(rate * 100).toFixed(1)}%`}
                </Text>
                <Text style={styles.rowHint}>
                  표시한 회차만으로 계산합니다. 표시 없음 {report.total.unmarked}회는 빼고 셉니다.
                </Text>
              </Row>
              <Row leading={<Icon name="calendar" size="md" color={colors.textSecondary} />}>
                <Text style={styles.rowLabel}>날짜별 기록 {report.days.length}일</Text>
                <Text style={styles.rowHint}>언제 무엇을 먹었는지 하루씩 적힙니다.</Text>
              </Row>
            </View>
          </>
        )}
      </Section>

      {owned === null ? (
        <ActivityIndicator color={colors.brand} />
      ) : owned ? (
        <View style={styles.actions}>
          <Button
            label="PDF로 내보내기"
            icon="share"
            onPress={handleExport}
            disabled={busy || nothingToExport}
            loading={busy}
          />
          <Button
            label="인쇄하기"
            icon="document"
            variant="secondary"
            onPress={handlePrint}
            disabled={busy || nothingToExport}
          />
          <Text style={styles.footnote}>
            PDF는 이 폰 안에서 만들어집니다. 어디로도 올라가지 않습니다. 만든 뒤 카카오톡,
            메일, 파일 저장 중에 고르실 수 있습니다.
          </Text>
        </View>
      ) : (
        <Section title="내보내기 기능">
          <View style={styles.paywall}>
            <Icon name="document" size={32} color={colors.brand} />
            <Text style={styles.paywallTitle}>진료용 복약 기록 PDF</Text>
            <Text style={styles.paywallBody}>
              위에 보이는 내용을 그대로 A4 문서로 만들어, 진료 때 보여 드리거나 인쇄할 수
              있습니다. 한 번 사면 계속 쓸 수 있고, 매달 내는 돈은 없습니다.
            </Text>
            <Text style={styles.paywallNote}>
              기록을 보는 것은 지금처럼 계속 무료입니다. 알림, 복용 체크, 달력 기록은
              아무것도 잠기지 않습니다.
            </Text>
          </View>
          <Button
            label={product ? `${product.displayPrice} · 한 번만 결제` : '구매하기'}
            icon="lock"
            onPress={handleBuy}
            disabled={busy}
            loading={busy}
          />
          <Button
            label="이미 구매했어요"
            variant="quiet"
            onPress={handleRestore}
            disabled={busy}
          />
          {product === null && (
            <Notice
              tone="info"
              title="가격을 불러오지 못했습니다"
              body="구글 플레이에 연결하지 못했습니다. 인터넷 연결을 확인하거나, 플레이 스토어에서 설치한 앱인지 확인해 주세요."
            />
          )}
        </Section>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.cardValue, tint ? { color: tint } : null]}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gutter, gap: spacing.xl, paddingBottom: spacing.xl * 2 },

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

  cards: { flexDirection: 'row', gap: spacing.sm },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cardValue: { ...type.title, color: colors.text },
  cardLabel: { ...type.caption, color: colors.textSecondary, marginTop: 2 },

  rowLabel: { ...type.body, color: colors.text },
  rowHint: { ...type.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },

  paywall: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgAlt,
    borderRadius: radius.md,
    padding: gutter,
  },
  paywallTitle: { ...type.title, color: colors.text, textAlign: 'center' },
  paywallBody: { ...type.body, color: colors.text, textAlign: 'center', lineHeight: 22 },
  paywallNote: { ...type.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  actions: { gap: spacing.sm },
  footnote: { ...type.caption, color: colors.textSecondary, lineHeight: 19 },
  empty: { ...type.body, color: colors.textSecondary },
});
