// Tokens visuais do app. Toda cor, fonte, raio e espaçamento sai daqui.

export const C = {
  bg: '#07080B',
  bgElev: '#0D0F14',
  surface: '#12151C',
  surface2: '#191D26',
  surface3: '#222733',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.11)',

  text: '#F3F4F6',
  textDim: '#A0A6B3',
  textMute: '#626A7A',

  accent: '#FF7A1A',
  accentHi: '#FF9A3D',
  accentLo: '#F2541B',
  accentSoft: 'rgba(255,122,26,0.13)',
  accentLine: 'rgba(255,122,26,0.35)',

  green: '#3DDC97',
  greenSoft: 'rgba(61,220,151,0.13)',
  yellow: '#FFC145',
  yellowSoft: 'rgba(255,193,69,0.13)',
  red: '#FF5D5D',
  redSoft: 'rgba(255,93,93,0.13)',
  blue: '#5AA8FF',
  blueSoft: 'rgba(90,168,255,0.13)',
  violet: '#A98BFF',
  violetSoft: 'rgba(169,139,255,0.13)',
} as const;

export const gradients = {
  accent: ['#FF9A3D', '#FF6A1A', '#F2441B'] as const,
  hero: ['#1E1A17', '#13141A', '#0D0F14'] as const,
  glow: ['rgba(255,122,26,0.16)', 'rgba(255,122,26,0)'] as const,
};

export const F = {
  display: 'Sora_700Bold',
  displayX: 'Sora_800ExtraBold',
  displaySemi: 'Sora_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semi: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const R = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, huge: 40 } as const;

export type Tone = 'accent' | 'green' | 'yellow' | 'red' | 'blue' | 'violet' | 'neutral';

export function toneColors(tone: Tone) {
  switch (tone) {
    case 'accent':
      return { fg: C.accent, bg: C.accentSoft };
    case 'green':
      return { fg: C.green, bg: C.greenSoft };
    case 'yellow':
      return { fg: C.yellow, bg: C.yellowSoft };
    case 'red':
      return { fg: C.red, bg: C.redSoft };
    case 'blue':
      return { fg: C.blue, bg: C.blueSoft };
    case 'violet':
      return { fg: C.violet, bg: C.violetSoft };
    default:
      return { fg: C.textDim, bg: C.surface2 };
  }
}
