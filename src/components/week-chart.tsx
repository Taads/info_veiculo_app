import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { C, gradients } from '@/theme';
import { weekdayShort } from '@/utils/dates';
import { fmtNumber } from '@/utils/format';

import { T } from './ui';

/** Barras de km por dia. */
export function WeekChart({ days, height = 110 }: { days: { km: number; d: Date }[]; height?: number }) {
  const max = Math.max(1, ...days.map((d) => d.km));
  const lastIdx = days.length - 1;
  return (
    <View style={[styles.row, { height: height + 40 }]}>
      {days.map((day, i) => {
        const h = day.km > 0 ? Math.max(8, (day.km / max) * height) : 4;
        const isToday = i === lastIdx;
        return (
          <View key={i} style={styles.col}>
            <T v="caption" style={styles.value} color={day.km > 0 ? C.textDim : 'transparent'}>
              {fmtNumber(day.km)}
            </T>
            <View style={{ height, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
              {day.km > 0 ? (
                <LinearGradient
                  colors={isToday ? gradients.accent : [C.surface3, C.surface3]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[styles.bar, { height: h }]}
                />
              ) : (
                <View style={[styles.bar, { height: h, backgroundColor: C.surface2 }]} />
              )}
            </View>
            <T v="caption" color={isToday ? C.accent : C.textMute} style={styles.day}>
              {isToday ? 'hoje' : weekdayShort(day.d)}
            </T>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '72%', maxWidth: 30, borderRadius: 8 },
  value: { fontSize: 10.5 },
  day: { fontSize: 11 },
});
