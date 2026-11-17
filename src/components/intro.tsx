// Vinheta de abertura do GestCar (~2,5 s). Toque para pular.
//
// Roteiro: brilho acende → carro entra deslizando com linhas de velocidade e "freia"
// → feixe de luz passa pelo logo → "GestCar" surge letra a letra → barra de
// velocímetro enche → tudo se dissolve para o app.

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Haptics } from '@/lib/haptics';
import { C, F, gradients } from '@/theme';

import { Icon } from './ui';

const LOGO = 112;
const WORD = ['G', 'e', 's', 't', 'C', 'a', 'r'];
const ease = Easing.bezier(0.16, 1, 0.3, 1); // desacelera forte, como um carro freando

export function Intro({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const finished = useRef(false);

  const glow = useSharedValue(0);
  const carX = useSharedValue(-width * 0.75);
  const tilt = useSharedValue(0);
  const lines = useSharedValue(0);
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const sweep = useSharedValue(0);
  const bar = useSharedValue(0);
  const exit = useSharedValue(0);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  const leave = () => {
    exit.value = withTiming(1, { duration: 420, easing: Easing.in(Easing.cubic) }, (ok) => {
      if (ok) scheduleOnRN(finish);
    });
  };

  useEffect(() => {
    glow.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });

    // carro entra e "freia" com um leve balanço
    lines.value = withSequence(withTiming(1, { duration: 250 }), withDelay(350, withTiming(0, { duration: 350 })));
    carX.value = withDelay(150, withTiming(0, { duration: 750, easing: ease }));
    tilt.value = withDelay(
      150,
      withSequence(
        withTiming(-4, { duration: 600 }),
        withSpring(3, { damping: 6, stiffness: 260 }),
        withSpring(0, { damping: 10, stiffness: 200 }),
      ),
    );

    // o quadrado do logo cresce atrás do carro
    logoOpacity.value = withDelay(650, withTiming(1, { duration: 300 }));
    logoScale.value = withDelay(650, withSpring(1, { damping: 12, stiffness: 160 }));

    // feixe de luz atravessa o logo
    sweep.value = withDelay(1150, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.cubic) }));

    // velocímetro
    bar.value = withDelay(1300, withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }));

    const brake = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 820);
    const out = setTimeout(leave, 2450);
    return () => {
      clearTimeout(brake);
      clearTimeout(out);
    };
    // roda uma vez na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ scale: 1 + exit.value * 0.06 }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.4, 1]) }],
  }));
  const carStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: carX.value }, { rotate: `${tilt.value}deg` }],
  }));
  const linesStyle = useAnimatedStyle(() => ({
    opacity: lines.value,
    transform: [{ translateX: interpolate(lines.value, [0, 1], [-30, 0]) }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-LOGO * 1.4, LOGO * 1.4]) }, { rotate: '20deg' }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  return (
    <Animated.View style={[styles.root, rootStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={leave}>
        {/* brilho de farol ao fundo */}
        <Animated.View style={[styles.glowWrap, glowStyle]} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="farol" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FF7A1A" stopOpacity={0.42} />
                <Stop offset="0.45" stopColor="#FF7A1A" stopOpacity={0.12} />
                <Stop offset="1" stopColor="#FF7A1A" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#farol)" />
          </Svg>
        </Animated.View>

        <View style={styles.center} pointerEvents="none">
          <View style={styles.stage}>
            {/* quadrado do logo */}
            <Animated.View style={[styles.logo, logoStyle]}>
              <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Animated.View style={[styles.sweep, sweepStyle]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </Animated.View>

            {/* carro + linhas de velocidade */}
            <Animated.View style={[styles.car, carStyle]}>
              <Animated.View style={[styles.lines, linesStyle]}>
                <View style={[styles.line, { width: 46, top: 18 }]} />
                <View style={[styles.line, { width: 70, top: 30 }]} />
                <View style={[styles.line, { width: 34, top: 42 }]} />
              </Animated.View>
              <Icon name="car-sports" size={68} color="#fff" />
            </Animated.View>
          </View>

          {/* nome letra a letra */}
          <View style={styles.wordRow}>
            {WORD.map((ch, i) => (
              <Animated.Text
                key={i}
                entering={FadeInDown.delay(1000 + i * 55)
                  .springify()
                  .damping(14)}
                style={[styles.word, i >= 4 && { color: C.accent }]}>
                {ch}
              </Animated.Text>
            ))}
          </View>
          <Animated.View entering={FadeIn.delay(1500).duration(500)}>
            <Text style={styles.tagline}>SEU CARRO NO CONTROLE</Text>
          </Animated.View>

          {/* velocímetro */}
          <View style={styles.track}>
            <Animated.View style={[styles.fill, barStyle]}>
              <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: C.bg, zIndex: 100, elevation: 100 },
  glowWrap: { position: 'absolute', top: '12%', alignSelf: 'center', width: 640, height: 640 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stage: { width: LOGO, height: LOGO, alignItems: 'center', justifyContent: 'center' },
  logo: {
    position: 'absolute',
    width: LOGO,
    height: LOGO,
    borderRadius: LOGO * 0.3,
    overflow: 'hidden',
  },
  sweep: { position: 'absolute', top: -LOGO * 0.5, width: 46, height: LOGO * 2, left: LOGO / 2 - 23 },
  car: { alignItems: 'center', justifyContent: 'center' },
  lines: { position: 'absolute', right: 66, top: 0, width: 80, height: 68 },
  line: { position: 'absolute', right: 0, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' },
  wordRow: { flexDirection: 'row', marginTop: 34 },
  word: { fontFamily: F.displayX, fontSize: 44, letterSpacing: -1.2, color: C.text },
  tagline: { fontFamily: F.bold, fontSize: 11.5, letterSpacing: 3.2, color: C.textMute, marginTop: 10 },
  track: {
    marginTop: 44,
    width: 132,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.surface3,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2, overflow: 'hidden' },
});
