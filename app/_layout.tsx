import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import {
  configureNotificationHandler,
  ensureNotificationChannel,
  requestNotificationPermission,
  syncSchedule,
} from '../src/lib/notifications';
import { colors, type } from '../src/theme';

// 알림이 도착하기 전에 정해져 있어야 하므로 모듈이 로드될 때 바로 설정한다.
configureNotificationHandler();

export default function RootLayout() {
  useEffect(() => {
    void (async () => {
      await ensureNotificationChannel();
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
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { ...type.heading, color: colors.text },
          headerTintColor: colors.brand,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* 홈은 브랜드 머리글을 화면 안에서 직접 그린다. */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="alarms" options={{ title: '예약된 알림' }} />
        <Stack.Screen name="medication/new" options={{ title: '약 등록' }} />
        <Stack.Screen name="medication/[id]" options={{ title: '약 수정' }} />
      </Stack>
    </>
  );
}
