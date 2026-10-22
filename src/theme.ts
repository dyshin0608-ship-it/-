import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * 또박 디자인 토큰.
 *
 * 흰색 카드 · 차분한 블루 · 밝은 회색 배경. 의료 앱의 신뢰감이 먼저고,
 * 장식은 뒤다. 글자 색은 모두 흰색/밝은 배경 위에서 WCAG AA(4.5:1) 이상을
 * 넘도록 골랐다. 약을 챙기는 사람이 어르신일 수 있어서 본문을 16 아래로
 * 내리지 않는다.
 */
export const colors = {
  // 배경과 면
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F4F9',
  border: '#E3E8EF',
  borderStrong: '#CFD8E3',

  // 글자
  text: '#111827',
  textSecondary: '#44506A',
  textMuted: '#67718A',
  onBrand: '#FFFFFF',

  // 브랜드
  brand: '#2563C9',
  brandPressed: '#1C4FA6',
  brandSoft: '#E9F0FC',
  brandBorder: '#C3D6F5',

  // 상태 (글자색은 전부 밝은 배경 위 AA 통과)
  success: '#146C43',
  successSoft: '#E7F3EC',
  successBorder: '#BFE0CD',
  warning: '#8A5300',
  warningSoft: '#FDF4E5',
  warningBorder: '#F0DBB2',
  danger: '#B3261E',
  dangerSoft: '#FCECEB',
  dangerBorder: '#F0C4C1',
} as const;

/**
 * 글자 단계. fontSize와 lineHeight를 함께 묶어, 시스템 글자 크기를 키워도
 * 줄이 겹치지 않게 한다. 높이를 고정하지 않는 것이 핵심이라 여기에 height는 없다.
 */
export const type = {
  display: { fontSize: 26, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  mono: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
} satisfies Record<string, TextStyle>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

/** 손가락이 닿는 모든 것의 최소 높이. 안드로이드 접근성 권장치가 48dp다. */
export const hitTarget = 48;

/** 카드에 쓰는 아주 옅은 그림자. 테두리를 두껍게 쓰는 대신 이것으로 면을 띄운다. */
export const elevation = Platform.select<ViewStyle>({
  android: { elevation: 1 },
  default: {
    shadowColor: '#0B1A33',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
}) as ViewStyle;
