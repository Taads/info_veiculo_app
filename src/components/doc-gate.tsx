import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authenticate, autoLockSuspended, lockNow, useDocUnlocked } from '@/lib/doc-lock';
import { useStore } from '@/store';
import { C, gradients, S } from '@/theme';

import { Button, Icon, IconButton, T } from './ui';

/**
 * Envolve cada tela de Documentos. Se a proteção estiver ligada e bloqueada,
 * mostra o cadeado por cima. `root` é a lista de documentos: ao sair dela, bloqueia de novo.
 */
export function DocGate({ children, root }: { children: ReactNode; root?: boolean }) {
  const docLock = !!useStore((s) => s.settings.docLock);
  const unlocked = useDocUnlocked();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background' && !autoLockSuspended()) lockNow();
    });
    return () => {
      sub.remove();
      if (root) lockNow();
    };
  }, [root]);

  return (
    <View style={styles.fill}>
      {children}
      {docLock && !unlocked ? <LockScreen /> : null}
    </View>
  );
}

function LockScreen() {
  const insets = useSafeAreaInsets();
  const [failed, setFailed] = useState(false);

  const tryUnlock = async () => {
    const ok = await authenticate('Desbloquear documentos');
    if (!ok) setFailed(true);
  };

  // Mostra o cadeado primeiro e só então pede a digital. Em celular com leitor na tela,
  // o Android escurece tudo enquanto espera o dedo; assim fica claro o que está acontecendo.
  useEffect(() => {
    const t = setTimeout(tryUnlock, 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={[styles.lock, { paddingTop: insets.top + S.md, paddingBottom: insets.bottom + S.xl }]}>
      <LinearGradient colors={gradients.glow} style={styles.glow} pointerEvents="none" />
      <IconButton icon="chevron-left" onPress={() => router.dismissTo('/')} />
      <View style={styles.center}>
        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
          <Icon name="fingerprint" size={48} color="#fff" />
        </LinearGradient>
        <T v="title" style={{ textAlign: 'center', marginTop: S.xl }}>
          Documentos protegidos
        </T>
        <T v="body" color={C.textDim} style={{ textAlign: 'center' }}>
          {failed ? 'Não foi possível confirmar. Tente de novo.' : 'Use sua digital para ver os documentos do carro.'}
        </T>
      </View>
      <Button label="Desbloquear" icon="fingerprint" onPress={tryUnlock} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  lock: { ...StyleSheet.absoluteFill, backgroundColor: C.bg, paddingHorizontal: S.xl, zIndex: 10, elevation: 10 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.sm },
  badge: { width: 104, height: 104, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
});
