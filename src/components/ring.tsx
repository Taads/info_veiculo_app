import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { C } from '@/theme';

/** Anel de progresso com degradê. `value` de 0 a 1. */
export function Ring({
  value,
  size = 96,
  stroke = 9,
  colors = [C.accentHi, C.accentLo],
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  colors?: [string, string];
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const id = `g${colors.join('').replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.surface3} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function levelColors(level: 'ok' | 'soon' | 'due'): [string, string] {
  if (level === 'due') return ['#FF8A7A', '#FF4D4D'];
  if (level === 'soon') return ['#FFD36B', '#FF9F1C'];
  return ['#6CF0B8', '#22C08A'];
}
