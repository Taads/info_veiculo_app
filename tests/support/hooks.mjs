// Faz o Node entender os imports do app nos testes:
// - "@/..." aponta para src/
// - imports sem extensão ganham ".ts"
// - módulos nativos do celular viram stubs simples

import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stubs = {
  'expo-file-system/legacy': 'tests/support/stub-file-system.mjs',
  '@react-native-async-storage/async-storage': 'tests/support/stub-async-storage.mjs',
  'expo-notifications': 'tests/support/stub-notifications.mjs',
  'react-native': 'tests/support/stub-react-native.mjs',
};

function withExt(p) {
  const cands = /\.(m?js|tsx?)$/.test(p) ? [p] : [`${p}.ts`, `${p}.tsx`, path.join(p, 'index.ts')];
  return cands.find((c) => existsSync(c)) ?? null;
}

export async function resolve(specifier, context, next) {
  if (stubs[specifier]) {
    return { url: pathToFileURL(path.join(root, stubs[specifier])).href, shortCircuit: true };
  }
  let target = null;
  if (specifier.startsWith('@/')) target = path.join(root, 'src', specifier.slice(2));
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (target) {
    const found = withExt(target);
    if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
  }
  return next(specifier, context);
}
