// Proteção dos documentos com digital / desbloqueio do celular.
//
// Regra: toda vez que a pessoa ENTRA em Documentos, pede a digital.
// Enquanto navega dentro de Documentos, continua liberado.
// Ao sair de Documentos ou mandar o app para segundo plano, bloqueia de novo.

import * as LocalAuthentication from 'expo-local-authentication';
import { useSyncExternalStore } from 'react';

let unlocked = false;
let authenticating = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDocUnlocked(): boolean {
  return useSyncExternalStore(subscribe, () => unlocked, () => unlocked);
}

export function isUnlocked() {
  return unlocked;
}

export function lockNow() {
  if (!unlocked) return;
  unlocked = false;
  emit();
}

/** Libera sem pedir digital (ex.: logo depois de confirmar para ativar a proteção). */
export function markUnlocked() {
  unlocked = true;
  emit();
}

export async function biometricsAvailable(): Promise<boolean> {
  try {
    const [hw, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hw && enrolled;
  } catch {
    return false;
  }
}

// Câmera, galeria e seletor de PDF mandam o app para segundo plano.
// Nesses casos não queremos bloquear.
let suspended = 0;

export function autoLockSuspended() {
  return suspended > 0;
}

export async function withoutAutoLock<T>(fn: () => Promise<T>): Promise<T> {
  suspended++;
  try {
    return await fn();
  } finally {
    // dá tempo do app voltar para o primeiro plano antes de reativar
    setTimeout(() => {
      suspended = Math.max(0, suspended - 1);
    }, 1500);
  }
}

/** Abre o pedido de digital. Ignora chamadas repetidas enquanto o pedido está aberto. */
export async function authenticate(message = 'Desbloquear documentos'): Promise<boolean> {
  if (authenticating) return false;
  authenticating = true;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: message,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    if (res.success) markUnlocked();
    return res.success;
  } catch {
    return false;
  } finally {
    authenticating = false;
  }
}
