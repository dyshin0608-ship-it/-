import type { TextStyle } from 'react-native';

/**
 * 또박 디자인 토큰.
 *
 * 흰 바탕 · 네이비 글자 · 블루 강조 하나. 면을 카드로 겹쳐 쌓는 대신
 * 머리글과 1px 구분선으로 나눈다. 그림자는 쓰지 않는다.
 *
 * 글자색은 모두 쓰이는 배경 위에서 WCAG AA(4.5:1)를 넘는다.
 */
export const colors = {
  bg: '#FFFFFF',
  bgAlt: '#F3F6FA',
  border: '#E2E8F0',

  text: '#172033',
  textSecondary: '#64748B',
  textOnBrand: '#FFFFFF',

  brand: '#2563EB',
  brandPressed: '#1D4ED8',
  brandSoft: '#EFF4FE',

  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  success: '#15803D',
} as const;

/**
 * 글자 단계. fontSize와 lineHeight를 함께 두어 시스템 글자 크기를 키워도
 * 줄이 겹치지 않는다. 높이를 고정하는 토큰은 일부러 두지 않았다.
 */
export const type = {
  display: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  title: { fontSize: 19, lineHeight: 26, fontWeight: '700' },
  section: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.3 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} satisfies Record<string, TextStyle>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** 화면 좌우 공통 여백. 모든 화면이 같은 선에 맞는다. */
export const gutter = spacing.lg;

/** 손가락이 닿는 모든 것의 최소 높이 (안드로이드 접근성 권장치). */
export const hitTarget = 48;

/** 아이콘 크기 단계. 아이콘마다 제각각 크기를 주지 않는다. */
export const iconSize = { sm: 16, md: 20, lg: 24, xl: 32 } as const;
