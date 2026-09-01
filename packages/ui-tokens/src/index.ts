// 플랫폼 중립 디자인 토큰 — RN은 숫자 그대로, 웹은 px 변환해 소비 (design §0-4)
// 2층 구조: palette(원시) → color(시맨틱). 브랜드 확정 시 palette 값만 교체한다.

/** 원시 팔레트 — 브랜드 미확정 상태의 중립 기본값 */
export const palette = {
  gray0: '#ffffff',
  gray50: '#f7f7f8',
  gray100: '#ececee',
  gray300: '#c9c9ce',
  gray500: '#8e8e96',
  gray700: '#4b4b52',
  gray900: '#1a1a1e',
  brand300: '#7dd3a8',
  brand500: '#2fa872',
  brand700: '#1d7a50',
  red500: '#e5484d',
  amber500: '#f5a623',
  blue500: '#3b82f6',
} as const;

/** 시맨틱 색 — 화면 코드는 palette가 아닌 이 레이어만 참조한다 */
export const color = {
  textPrimary: palette.gray900,
  textSecondary: palette.gray500,
  textInverse: palette.gray0,
  bgBase: palette.gray0,
  bgSubtle: palette.gray50,
  border: palette.gray100,
  primary: palette.brand500,
  primaryPressed: palette.brand700,
  danger: palette.red500,
  warning: palette.amber500,
  info: palette.blue500,
} as const;

/** 간격 스케일 (4pt 그리드) */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const;
