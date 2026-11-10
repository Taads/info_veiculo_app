import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, gradients } from '@/theme';

import { Icon } from './ui';

const TABS: Record<string, { label: string; icon: string; iconActive: string }> = {
  index: { label: 'Início', icon: 'home-variant-outline', iconActive: 'home-variant' },
  manutencao: { label: 'Manutenção', icon: 'wrench-outline', iconActive: 'wrench' },
  pagamentos: { label: 'Pagamentos', icon: 'credit-card-outline', iconActive: 'credit-card' },
  garagem: { label: 'Garagem', icon: 'garage-variant', iconActive: 'garage-variant' },
};

export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => TABS[r.name]);
  const half = Math.ceil(routes.length / 2);

  const renderTab = (route: (typeof state.routes)[number]) => {
    const meta = TABS[route.name];
    const focused = state.routes[state.index]?.key === route.key;
    return (
      <Pressable
        key={route.key}
        style={styles.tab}
        onPress={() => {
          Haptics.selectionAsync();
          const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigateToTab(route.key);
        }}>
        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
          <Icon name={focused ? meta.iconActive : meta.icon} size={22} color={focused ? C.accent : C.textMute} />
        </View>
        <Text style={[styles.label, { color: focused ? C.text : C.textMute }]} numberOfLines={1}>
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.barTint]} />
        {routes.slice(0, half).map(renderTab)}
        <View style={styles.centerSlot}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/km');
            }}
            style={({ pressed }) => [styles.fab, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabInner}>
              <Icon name="plus" size={28} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
        {routes.slice(half).map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 72,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borderStrong,
    paddingHorizontal: 6,
  },
  barTint: { backgroundColor: 'rgba(14,16,22,0.82)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%' },
  iconWrap: { width: 46, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: C.accentSoft },
  label: { fontFamily: F.semi, fontSize: 10.5 },
  centerSlot: { width: 70, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 20,
    shadowColor: C.accent,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fabInner: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
