import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import {
  configureNotificationHandler,
  requestNotificationPermission,
  syncSchedule,
} from '../src/lib/notifications';
import { colors, type } from '../src/theme';

// 알림이 도착하기 전에 정해져 있어야 하므로 모듈이 로드될 때 바로 설정한다.
configureNotificationHandler();

export default function RootLayout() {
  useEffect(() => {
    void (async () => {
      await requestNotificationPermission();
      await syncSchedule();
    })();

    // 앱으로 돌아올 때마다 예약을 앞으로 더 채워 둔다.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncSchedule();
    });
    return () => subscription.remove();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { ...type.title, color: colors.text },
          headerTintColor: colors.brand,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* 탭(홈·기록·알림)은 각 화면이 머리글을 직접 그린다. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="medication/new" options={{ title: '약 등록' }} />
        <Stack.Screen name="medication/[id]" options={{ title: '약 수정' }} />
        <Stack.Screen name="drug/[seq]" options={{ title: '약 정보' }} />
      </Stack>
    </>
  );
}
