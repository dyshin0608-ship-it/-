import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, gutter, hitTarget, radius, spacing, type } from '../theme';
import { Icon, type IconName } from './Icon';

/* ------------------------------------------------------------------ 버튼 */

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  fullWidth = true,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
}) {
  const isDisabled = disabled || loading;
  const tint = buttonTints[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        buttonStyles.base,
        !fullWidth && buttonStyles.auto,
        buttonSurfaces[variant],
        pressed && !isDisabled && buttonPressed[variant],
        isDisabled && buttonStyles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <View style={buttonStyles.inner}>
          {icon && <Icon name={icon} size="md" color={tint} />}
          <Text style={[buttonStyles.label, { color: tint }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const buttonTints: Record<ButtonVariant, string> = {
  primary: colors.textOnBrand,
  secondary: colors.text,
  quiet: colors.brand,
  danger: colors.danger,
};

const buttonStyles = StyleSheet.create({
  // 높이를 고정하지 않는다. 시스템 글자를 키우면 버튼이 같이 커진다.
  base: {
    minHeight: hitTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  auto: { alignSelf: 'flex-start' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...type.bodyStrong, textAlign: 'center' },
  disabled: { opacity: 0.45 },
});

const buttonSurfaces = StyleSheet.create({
  primary: { backgroundColor: colors.brand, borderColor: colors.brand },
  secondary: { backgroundColor: colors.bg, borderColor: colors.border },
  quiet: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: colors.bg, borderColor: colors.border },
});

const buttonPressed = StyleSheet.create({
  primary: { backgroundColor: colors.brandPressed, borderColor: colors.brandPressed },
  secondary: { backgroundColor: colors.bgAlt },
  quiet: { backgroundColor: colors.bgAlt },
  danger: { backgroundColor: colors.dangerSoft },
});

/* ------------------------------------------------- 아이콘만 있는 버튼 */

export function IconButton({
  name,
  label,
  onPress,
}: {
  name: IconName;
  /** 화면에 글자가 없으므로 스크린 리더를 위해 반드시 받는다. */
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [iconButtonStyles.base, pressed && iconButtonStyles.pressed]}
    >
      <Icon name={name} size="lg" color={colors.text} />
    </Pressable>
  );
}

const iconButtonStyles = StyleSheet.create({
  base: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.bgAlt },
});

/* ------------------------------------------------------------------ 입력 */

export function TextField({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={label}
        style={[fieldStyles.input, !!error && fieldStyles.inputError]}
      />
      {error && <FieldError message={error} />}
    </View>
  );
}

export function FieldError({ message }: { message: string }) {
  return (
    <View style={fieldStyles.errorRow} accessibilityLiveRegion="polite">
      <Icon name="alert" size="sm" color={colors.danger} />
      <Text style={fieldStyles.errorText}>{message}</Text>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: { ...type.label, color: colors.text, marginBottom: spacing.sm },
  input: {
    minHeight: hitTarget,
    borderRadius: radius.md,
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...type.body,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: { ...type.caption, color: colors.danger, flex: 1 },
});

/* -------------------------------------------------------------- 구역·행 */

export function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={sectionStyles.wrap}>
      <View style={sectionStyles.header}>
        <Text style={sectionStyles.title}>{title}</Text>
        {trailing}
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrap: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...type.section, color: colors.textSecondary, flex: 1 },
});

/** 목록 한 줄. 누를 수 있으면 오른쪽에 화살표가 붙는다. */
export function Row({
  onPress,
  accessibilityLabel,
  leading,
  children,
  trailing,
  showChevron,
  first,
  style,
}: {
  onPress?: () => void;
  accessibilityLabel?: string;
  leading?: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  /** 첫 줄에는 위 구분선을 그리지 않는다. */
  first?: boolean;
  style?: ViewStyle;
}) {
  const content = (
    <>
      {leading && <View style={rowStyles.leading}>{leading}</View>}
      <View style={rowStyles.body}>{children}</View>
      {trailing}
      {showChevron && <Icon name="chevron-right" size="md" color={colors.textSecondary} />}
    </>
  );

  if (!onPress) {
    return <View style={[rowStyles.base, !first && rowStyles.divider, style]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        rowStyles.base,
        !first && rowStyles.divider,
        pressed && rowStyles.pressed,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: hitTarget + 8,
    paddingVertical: spacing.md,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  leading: { width: 28, alignItems: 'center' },
  body: { flex: 1 },
  pressed: { backgroundColor: colors.bgAlt },
});

/* ------------------------------------------------------------ 빈 상태 */

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={emptyStyles.wrap}>
      <Icon name="pill" size={40} color={colors.brand} />
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.body}>{body}</Text>
      <View style={emptyStyles.action}>
        <Button label={actionLabel} icon="plus" onPress={onAction} />
      </View>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  title: { ...type.title, color: colors.text, textAlign: 'center' },
  body: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  action: { alignSelf: 'stretch', marginTop: spacing.sm, paddingHorizontal: gutter },
});

/* ----------------------------------------------------------- 안내 상자 */

export type NoticeTone = 'danger' | 'warning' | 'info';

export function Notice({
  tone,
  title,
  body,
  actionLabel,
  onAction,
}: {
  tone: NoticeTone;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const tint = noticeTints[tone];
  return (
    <View style={[noticeStyles.wrap, noticeSurfaces[tone]]}>
      <View style={noticeStyles.header}>
        <Icon name={tone === 'info' ? 'help' : 'alert'} size="md" color={tint} />
        <Text style={[noticeStyles.title, { color: tint }]}>{title}</Text>
      </View>
      <Text style={noticeStyles.body}>{body}</Text>
      {actionLabel && onAction && (
        <View style={noticeStyles.action}>
          <Button label={actionLabel} variant="secondary" onPress={onAction} fullWidth={false} />
        </View>
      )}
    </View>
  );
}

const noticeTints: Record<NoticeTone, string> = {
  danger: colors.danger,
  warning: colors.warning,
  info: colors.textSecondary,
};

const noticeStyles = StyleSheet.create({
  wrap: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...type.bodyStrong, flexShrink: 1 },
  body: { ...type.caption, color: colors.textSecondary, lineHeight: 20 },
  action: { marginTop: spacing.sm, alignItems: 'flex-start' },
});

const noticeSurfaces = StyleSheet.create({
  danger: { backgroundColor: colors.dangerSoft },
  warning: { backgroundColor: colors.warningSoft },
  info: { backgroundColor: colors.bgAlt },
});
