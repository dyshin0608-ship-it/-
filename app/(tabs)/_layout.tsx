import { usePathname } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
 * 그래서 앱의 다른 화면과 같은 아이콘·색·글자 규칙을 그대로 쓴다.
 *
 * 버튼은 반드시 Pressable이어야 한다. TabTrigger는 asChild로 onPress를
 * 자식에게 넘기는데, View는 onPress를 받지 못해 탭이 눌리지 않는다.
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
              <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={tab.label}
                  style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
                >
                  <Icon name={tab.icon} size="lg" color={tint} />
                  <Text style={[styles.label, { color: tint }]}>{tab.label}</Text>
                </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.xs,
  },
  pressed: { opacity: 0.6 },
  label: { ...type.caption, fontSize: 11, fontWeight: '600' },
});
