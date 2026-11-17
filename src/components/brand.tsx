import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { C, F, gradients } from '@/theme';

import { Icon } from './ui';

/** Marca do app: ícone + "GestCar". */
export function Brand({ size = 1 }: { size?: number }) {
  const box = 26 * size;
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: box, height: box, borderRadius: box * 0.32, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="car-sports" size={box * 0.62} color="#fff" />
      </LinearGradient>
      <Text style={[styles.word, { fontSize: 17 * size }]}>
        Gest<Text style={{ color: C.accent }}>Car</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: F.displayX, color: C.text, letterSpacing: -0.5 },
});
