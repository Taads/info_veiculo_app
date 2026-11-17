// Erros de recursos do celular (notificação, câmera, digital) viram um aviso
// amigável em vez de uma tela vermelha. O detalhe técnico vai para o log.

import { Alert } from 'react-native';

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export function reportError(title: string, e: unknown, hint?: string) {
  const msg = errorMessage(e);
  console.warn(`[GestCar] ${title}: ${msg}`);
  Alert.alert(title, [hint, `Detalhe: ${msg}`].filter(Boolean).join('\n\n'));
}

/** Para ações disparadas por botão: nunca deixa a promessa rejeitar sem tratamento. */
export function safe<A extends unknown[]>(title: string, fn: (...args: A) => Promise<unknown>, hint?: string) {
  return (...args: A) => {
    fn(...args).catch((e) => reportError(title, e, hint));
  };
}
