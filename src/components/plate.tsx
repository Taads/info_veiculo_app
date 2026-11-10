import { StyleSheet, Text, View } from 'react-native';

import { F } from '@/theme';

/** Placa no padrão Mercosul. */
export function Plate({ plate, scale = 1 }: { plate: string; scale?: number }) {
  const text = formatPlate(plate) || 'SEM PLACA';
  return (
    <View style={[styles.plate, { transform: [{ scale }] }]}>
      <View style={styles.band}>
        <Text style={styles.bandText}>BRASIL</Text>
        <View style={styles.flag}>
          <View style={styles.flagDiamond} />
        </View>
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

export function formatPlate(p: string): string {
  const s = p.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (s.length <= 3) return s;
  // Placa antiga (ABC1234) ganha hífen; Mercosul (ABC1D23) não.
  if (/^[A-Z]{3}\d{4}$/.test(s)) return `${s.slice(0, 3)}-${s.slice(3)}`;
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

const styles = StyleSheet.create({
  plate: {
    width: 118,
    borderRadius: 6,
    backgroundColor: '#F7F7F2',
    borderWidth: 1.5,
    borderColor: '#1B1B1B',
    overflow: 'hidden',
  },
  band: {
    height: 12,
    backgroundColor: '#1F3F9E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bandText: { color: '#fff', fontSize: 7, fontFamily: F.bold, letterSpacing: 1.6 },
  flag: {
    position: 'absolute',
    right: 5,
    width: 11,
    height: 7,
    backgroundColor: '#1E9E4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagDiamond: { width: 5, height: 5, backgroundColor: '#FFD400', transform: [{ rotate: '45deg' }] },
  text: {
    textAlign: 'center',
    color: '#111',
    fontFamily: F.bold,
    fontSize: 17,
    letterSpacing: 1.8,
    paddingVertical: 2,
  },
});
