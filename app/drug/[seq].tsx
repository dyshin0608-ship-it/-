import { useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BodyMap } from '../../src/components/BodyMap';
import { Button, Notice, Section } from '../../src/components/ui';
import {
  bodyPartsFor,
  bodyRegionsFor,
  getDrug,
  officialUrl,
  SOURCE_NAME,
  type DrugInfo,
} from '../../src/lib/drugs';
import { colors, gutter, radius, spacing, type } from '../../src/theme';

/**
 * 약 정보 화면.
 *
 * 여기 보이는 모든 문장은 식약처 e약은요 원문 그대로다. 앱이 요약하거나
 * 바꿔 쓰지 않는다. 복용량을 정해 주지도, 특정 제품을 권하지도 않는다.
 */
export default function DrugScreen() {
  const { seq } = useLocalSearchParams<{ seq: string }>();
  const drug = getDrug(seq);

  if (!drug) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>약 정보를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const bodyParts = bodyPartsFor(drug.efficacy);
  const bodyRegions = bodyRegionsFor(bodyParts);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.name}>{drug.name}</Text>
        <Text style={styles.maker}>{drug.maker}</Text>
      </View>

      <Notice
        tone="warning"
        title="먼저 읽어 주세요"
        body={
          '갑작스럽고 극심한 두통, 가슴 통증, 호흡곤란, 의식이 흐려짐 같은 증상이 있으면 ' +
          '약을 찾지 말고 즉시 진료를 받으세요.\n\n' +
          '이 화면은 식약처가 공개한 설명을 그대로 보여 줄 뿐입니다. ' +
          '얼마나, 언제 먹을지는 의사나 약사와 상의해 정하세요.'
        }
      />

      {bodyParts.length > 0 && (
        <Section title="이 약이 쓰이는 곳">
          {bodyRegions.length > 0 && <BodyMap regions={bodyRegions} />}
          <View style={styles.chips}>
            {bodyParts.map((part) => (
              <View key={part} style={styles.chip}>
                <Text style={styles.chipText}>{part}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chipNote}>
            아래 효능효과 문장에 적힌 부위를 뽑은 것입니다. 원문을 함께 확인하세요.
            열처럼 몸 전체에 해당하는 증상은 그림에 표시되지 않습니다.
          </Text>
        </Section>
      )}

      <Field title="어떨 때 먹는 약인가요" body={drug.efficacy} />
      <Field title="어떻게 먹나요" body={drug.usage} />
      <Field title="먹기 전 경고" body={drug.warning} tone="warning" />
      <Field title="같이 먹으면 안 되는 것" body={drug.interaction} />
      <Field title="보관법" body={drug.storage} />

      <Notice
        tone="info"
        title="전체 주의사항과 이상반응"
        body={
          '전체 주의사항과 생길 수 있는 이상반응은 분량이 많고 수시로 바뀌어, ' +
          '앱에 담아 두지 않고 식약처 원본으로 바로 연결합니다. ' +
          '복용 전에 아래에서 확인하세요.'
        }
      />

      <View style={styles.source}>
        <Text style={styles.sourceText}>출처 · {SOURCE_NAME}</Text>
        {drug.updated && <Text style={styles.sourceText}>자료 갱신일 · {drug.updated}</Text>}
        <Text style={styles.sourceText}>품목기준코드 · {drug.seq}</Text>
      </View>

      <Button
        label="의약품안전나라에서 전체 보기"
        variant="secondary"
        onPress={() => Linking.openURL(officialUrl(drug.seq))}
        accessibilityHint="식약처 공식 페이지를 브라우저에서 엽니다"
      />
    </ScrollView>
  );
}

function Field({
  title,
  body,
  tone,
}: {
  title: string;
  body: DrugInfo[keyof DrugInfo];
  tone?: 'warning';
}) {
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) return null;
  return (
    <Section title={title}>
      <Text style={[styles.body, tone === 'warning' && styles.bodyWarning]}>{text}</Text>
    </Section>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gutter, gap: spacing.xl, paddingBottom: spacing.xxl },

  name: { ...type.title, color: colors.text },
  maker: { ...type.caption, color: colors.textSecondary, marginTop: 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  chipText: { ...type.label, color: colors.brand },
  chipNote: { ...type.caption, color: colors.textSecondary },

  body: { ...type.body, color: colors.text, lineHeight: 24 },
  bodyWarning: { color: colors.warning },

  source: {
    gap: 2,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bgAlt,
  },
  sourceText: { ...type.caption, color: colors.textSecondary },

  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  missingText: { ...type.body, color: colors.textSecondary },
});
