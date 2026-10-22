import { usePathname } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../src/components/Icon';
import { colors, hitTarget, spacing, type } from '../../src/theme';

const TABS: { name: string; href: string; label: string; icon: IconName }[] = [
  { name: 'index', href: '/', label: '홈', icon: 'home' },
  { name: 'history', href: '/history', label: '기록', icon: 'history' },
  { name: 'settings', href: '/settings', label: '알림', icon: 'settings' },
];

/**
 * 아래쪽 탭. expo-router의 headless Tabs라 탭 바를 직접 그린다.
 *
 * asChild는 쓰지 않는다. 그 경로에서는 expo-router가 flexDirection: 'row'를
 * 얹어 아이콘과 글자가 가로로 붙어 버린다. asChild 없이 쓰면 TabTrigger가
 * 자기 스타일을 먼저 깔고 내 style을 뒤에 덮으므로 세로로 쌓인다.
 */
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // 선택 상태는 넘겨받은 값에 기대지 않고 지금 경로에서 직접 읽는다.
  const pathname = usePathname();

  return (
    <Tabs>
      <TabSlot />
      <TabList style={[styles.bar, { paddingBottom: insets.bottom + spacing.xs }]} asChild>
        <View>
          {TABS.map((tab) => {
            const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
            const tint = active ? colors.brand : colors.textSecondary;
            return (
              <TabTrigger
                key={tab.name}
                name={tab.name}
                href={tab.href}
                style={styles.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <Icon name={tab.icon} size="lg" color={tint} />
                <Text style={[styles.label, { color: tint }]}>{tab.label}</Text>
              </TabTrigger>
            );
          })}
        </View>
      </TabList>
    </Tabs>
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
  tab: {
    flex: 1,
    minHeight: hitTarget,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  label: { ...type.caption, fontSize: 11, fontWeight: '600' },
});
