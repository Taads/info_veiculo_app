import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AImage = Animated.createAnimatedComponent(Image);
const MAX = 5;

/** Imagem com zoom de pinça, arrastar e toque duplo. */
export function ZoomableImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const clamp = () => {
    'worklet';
    const maxX = (width * (scale.value - 1)) / 2;
    const maxY = (height * (scale.value - 1)) / 2;
    tx.value = withSpring(Math.max(-maxX, Math.min(maxX, tx.value)), { damping: 20 });
    ty.value = withSpring(Math.max(-maxY, Math.min(maxY, ty.value)), { damping: 20 });
  };

  const pinch = usePinchGesture({
    onUpdate: (e) => {
      'worklet';
      scale.value = Math.max(0.8, Math.min(MAX, saved.value * e.scale));
    },
    onDeactivate: () => {
      'worklet';
      if (scale.value < 1) {
        scale.value = withSpring(1);
        tx.value = withSpring(0);
        ty.value = withSpring(0);
      }
      saved.value = Math.max(1, scale.value);
      clamp();
    },
  });

  const pan = usePanGesture({
    minPointers: 1,
    onUpdate: (e) => {
      'worklet';
      if (scale.value <= 1) return;
      tx.value += e.changeX;
      ty.value += e.changeY;
    },
    onDeactivate: () => {
      'worklet';
      clamp();
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onDeactivate: () => {
      'worklet';
      if (scale.value > 1) {
        scale.value = withTiming(1);
        saved.value = 1;
        tx.value = withTiming(0);
        ty.value = withTiming(0);
      } else {
        scale.value = withTiming(2.5);
        saved.value = 2.5;
      }
    },
  });

  const gesture = useSimultaneousGestures(pinch, pan, doubleTap);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.wrap, { width, height }]} collapsable={false}>
        <AImage source={{ uri }} style={[{ width, height }, style]} contentFit="contain" />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
