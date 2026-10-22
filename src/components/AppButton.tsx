import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, hitTarget, radius, spacing, type } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  /** 아이콘 자리에 넣을 짧은 기호. 글자와 같은 색을 따라간다. */
  leading?: string;
  accessibilityHint?: string;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  leading,
  accessibilityHint,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sizeSm : styles.sizeMd,
        surfaces[variant],
        pressed && !isDisabled && pressedSurfaces[variant],
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onBrand : colors.brand} />
      ) : (
        <View style={styles.row}>
          {leading && <Text style={[styles.leading, labels[variant]]}>{leading}</Text>}
          <Text style={[size === 'sm' ? styles.labelSm : styles.label, labels[variant]]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  // 높이를 고정하지 않고 최소 높이 + 여백으로 잡는다. 시스템 글자를 키워도 글자가 잘리지 않는다.
  sizeMd: { minHeight: hitTarget + 4, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  sizeSm: { minHeight: 40, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  leading: { ...type.bodyStrong },
  label: { ...type.bodyStrong, textAlign: 'center' },
  labelSm: { ...type.label, textAlign: 'center' },
  disabled: { opacity: 0.45 },
});

const surfaces = StyleSheet.create({
  primary: { backgroundColor: colors.brand, borderColor: colors.brand },
  secondary: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: colors.surface, borderColor: colors.dangerBorder },
});

const pressedSurfaces = StyleSheet.create({
  primary: { backgroundColor: colors.brandPressed, borderColor: colors.brandPressed },
  secondary: { backgroundColor: colors.surfaceAlt },
  ghost: { backgroundColor: colors.surfaceAlt },
  danger: { backgroundColor: colors.dangerSoft },
});

const labels = StyleSheet.create({
  primary: { color: colors.onBrand },
  secondary: { color: colors.text },
  ghost: { color: colors.brand },
  danger: { color: colors.danger },
});
