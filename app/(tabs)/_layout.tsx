import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../src/components/Icon';
import { colors, spacing, type } from '../../src/theme';

const TABS: { name: string; href: string; label: string; icon: IconName }[] = [
  { name: 'index', href: '/', label: '홈', icon: 'home' },
  { name: 'history', href: '/history', label: '기록', icon: 'history' },
  { name: 'settings', href: '/settings', label: '알림', icon: 'settings' },
];

/**
 * 아래쪽 탭. expo-router의 headless Tabs를 쓰기 때문에 탭 바를 직접 그린다.
 * 그래서 앱의 다른 화면과 같은 아이콘·색·글자 규칙을 그대로 따른다.
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot />
      <TabList style={[styles.bar, { paddingBottom: insets.bottom + spacing.xs }]} asChild>
        <View>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton label={tab.label} icon={tab.icon} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  label,
  icon,
  isFocused,
  ...rest
}: {
  label: string;
  icon: IconName;
  isFocused?: boolean;
}) {
  const tint = isFocused ? colors.brand : colors.textSecondary;
  return (
    <View
      {...rest}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={label}
      style={styles.tab}
    >
      <Icon name={icon} size="lg" color={tint} />
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.xs },
  label: { ...type.caption, fontSize: 11, fontWeight: '600' },
});
