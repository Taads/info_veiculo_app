import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, gradients, S } from '@/theme';

import { IconButton, T } from './ui';

export function Screen({
  title,
  overline,
  subtitle,
  back,
  right,
  children,
  footer,
  tabs,
  contentStyle,
}: {
  title?: string;
  overline?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  /** Conteúdo fixo no rodapé (ex.: botão salvar). */
  footer?: ReactNode;
  /** Tela dentro das abas: reserva espaço para a barra flutuante. */
  tabs?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const bottomPad = tabs ? insets.bottom + 120 : footer ? 24 : insets.bottom + 32;

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.glow} style={styles.glow} pointerEvents="none" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            { paddingTop: insets.top + S.md, paddingBottom: bottomPad, paddingHorizontal: S.xl },
            contentStyle,
          ]}>
          {back || right ? (
            <View style={styles.topBar}>
              {back ? <IconButton icon="chevron-left" onPress={() => router.back()} /> : <View />}
              {right ?? <View />}
            </View>
          ) : null}
          {title ? (
            <View style={{ marginBottom: S.xl, gap: 6 }}>
              {overline ? <T v="overline">{overline}</T> : null}
              <T v="title">{title}</T>
              {subtitle ? (
                <T v="body" color={C.textDim} style={{ fontSize: 14.5 }}>
                  {subtitle}
                </T>
              ) : null}
            </View>
          ) : null}
          {children}
        </ScrollView>
        {footer ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + S.md }]}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S.lg,
  },
  footer: {
    paddingHorizontal: S.xl,
    paddingTop: S.md,
    backgroundColor: C.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.borderStrong,
  },
});
