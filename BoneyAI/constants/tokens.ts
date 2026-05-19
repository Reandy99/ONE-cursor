// Boney.AI Design System - Theme A (Bright Minimal)

export const Colors = {
  page: '#fdfaf5',
  surface: '#ffffff',
  surface2: '#f6f2eb',
  ink: '#1c1917',
  ink2: '#44403c',
  mute: '#78716c',
  primary: '#f43f5e',
  primary2: '#fb923c',
  secondary: '#7c3aed',
  secondary2: '#a855f7',
  accent: '#14b8a6',
  gradHero: ['#f43f5e', '#fb923c'],
  mood: {
    happy: '#f59e0b',
    calm: '#10b981',
    neutral: '#a78bfa',
    sad: '#60a5fa',
    anxious: '#c084fc',
    frustrated: '#fb923c',
    tired: '#38bdf8',
    angry: '#f87171',
  },
  hairline: 'rgba(28,25,23,0.07)',
  hairlineStrong: 'rgba(28,25,23,0.12)',
  shadowCard: {
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  shadowHero: {
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export const Typography = {
  fontDisplay: 'Outfit_700Bold',
  fontDisplayMedium: 'Outfit_500Medium',
  fontBody: 'Inter_400Regular',
  fontBodyMedium: 'Inter_500Medium',
  fontBodyBold: 'Inter_700Bold',
} as const;

export const Radius = {
  pill: 9999,
  cardLg: 32,
  card: 24,
  btn: 16,
  sm: 8,
} as const;

export const Spacing = {
  screenPaddingH: 22,
  screenPaddingTop: 64,
  cardPad: 18,
  gap: 12,
  tabBarHeight: 80,
} as const;
