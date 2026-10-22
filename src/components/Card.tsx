import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, elevation, radius, spacing } from '../theme';

type Props = {
  children: ReactNode;
  /** 색이 있는 안내 카드. 기본은 흰 면. */
  tone?: 'default' | 'brand' | 'warning' | 'danger' | 'muted';
  style?: ViewStyle;
  /** 안쪽 여백을 직접 주고 싶을 때 (목록 행을 붙여 넣는 카드 등) */
  padded?: boolean;
};

export function Card({ children, tone = 'default', style, padded = true }: Props) {
  return (
    <View style={[styles.base, padded && styles.padded, tones[tone], style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: { padding: spacing.lg },
});

const tones = StyleSheet.create({
  default: { backgroundColor: colors.surface, borderColor: colors.border, ...elevation },
  brand: { backgroundColor: colors.brandSoft, borderColor: colors.brandBorder },
  warning: { backgroundColor: colors.warningSoft, borderColor: colors.warningBorder },
  danger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder },
  muted: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
});
