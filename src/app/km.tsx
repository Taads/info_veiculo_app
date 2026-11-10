import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chips, Segmented } from '@/components/fields';
import { Button, Icon, T } from '@/components/ui';
import { useActiveVehicle, useStore } from '@/store';
import { C, F, R, S } from '@/theme';
import { addDays, toDateStr, today } from '@/utils/dates';
import { digits, fmtNumber } from '@/utils/format';

type Mode = 'dia' | 'painel';

export default function KmSheet() {
  const insets = useSafeAreaInsets();
  const v = useActiveVehicle();
  const logKm = useStore((s) => s.logKm);
  const [mode, setMode] = useState<Mode>('dia');
  const [value, setValue] = useState(0);
  const [day, setDay] = useState<'hoje' | 'ontem'>('hoje');

  if (!v) return null;

  const newOdo = mode === 'dia' ? v.km + value : value;
  const delta = mode === 'dia' ? value : value - v.km;
  const invalid = value <= 0 || (mode === 'painel' && value <= v.km);

  const save = () => {
    const date = toDateStr(day === 'hoje' ? today() : addDays(today(), -1));
    if (mode === 'dia') logKm(v.id, { date, delta: value });
    else logKm(v.id, { date, odometer: value });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />
      </Animated.View>
      <KeyboardAvoidingView behavior="padding" style={{ justifyContent: 'flex-end', flex: 1 }} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.springify().damping(22).stiffness(220)}
          style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <View>
              <T v="h2">Registrar quilometragem</T>
              <T v="caption">Atual: {fmtNumber(v.km)} km</T>
            </View>
            <Pressable hitSlop={10} onPress={() => router.back()} style={styles.close}>
              <Icon name="close" size={20} color={C.textDim} />
            </Pressable>
          </View>

          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              setValue(m === 'painel' ? v.km : 0);
            }}
            options={[
              { value: 'dia', label: 'Km rodados' },
              { value: 'painel', label: 'Km do painel' },
            ]}
          />

          <View style={styles.bigInput}>
            <TextInput
              autoFocus
              value={value > 0 ? fmtNumber(value) : ''}
              onChangeText={(s) => {
                const d = digits(s).slice(0, 7);
                setValue(d ? parseInt(d, 10) : 0);
              }}
              placeholder="0"
              placeholderTextColor={C.surface3}
              keyboardType="number-pad"
              selectionColor={C.accent}
              cursorColor={C.accent}
              style={styles.bigText}
            />
            <T v="h2" color={C.textMute}>
              km
            </T>
          </View>

          {mode === 'dia' ? (
            <Chips
              scroll
              value={-1}
              onChange={(n) => setValue((x) => x + n)}
              options={[5, 10, 25, 50, 100].map((n) => ({ value: n, label: `+${n}` }))}
            />
          ) : null}

          <View style={styles.preview}>
            <View style={{ flex: 1 }}>
              <T v="caption">Novo hodômetro</T>
              <T v="h3">{fmtNumber(Math.max(newOdo, 0))} km</T>
            </View>
            <View style={{ flex: 1 }}>
              <T v="caption">Rodados</T>
              <T v="h3" color={delta > 0 ? C.green : C.textMute}>
                {delta > 0 ? `+${fmtNumber(delta)}` : '0'} km
              </T>
            </View>
            <Chips
              value={day}
              onChange={setDay}
              options={[
                { value: 'hoje', label: 'Hoje' },
                { value: 'ontem', label: 'Ontem' },
              ]}
            />
          </View>
          {mode === 'painel' && value > 0 && value <= v.km ? (
            <T v="caption" color={C.yellow}>
              O valor do painel precisa ser maior que {fmtNumber(v.km)} km.
            </T>
          ) : null}

          <Button label="Salvar" icon="check" onPress={save} disabled={invalid} />
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  sheet: {
    backgroundColor: C.bgElev,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    borderWidth: 1,
    borderColor: C.borderStrong,
    paddingHorizontal: S.xl,
    paddingTop: S.md,
    gap: S.lg,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.surface3 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigInput: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, paddingVertical: S.sm },
  bigText: {
    fontFamily: F.displayX,
    fontSize: 60,
    letterSpacing: -2,
    color: C.text,
    minWidth: 60,
    textAlign: 'center',
    padding: 0,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.lg,
    borderRadius: R.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
});
