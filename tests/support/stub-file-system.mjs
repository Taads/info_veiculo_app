// expo-file-system/legacy de mentira: registra o que foi copiado e apagado.
export const deleted = [];
export const copied = [];
export const written = [];
export async function writeAsStringAsync(to) {
  written.push({ to });
}

export function __addFile() {}

export const documentDirectory = 'file:///doc/';
export const EncodingType = { Base64: 'base64', UTF8: 'utf8' };

const name = (uri) => uri.split('/').pop();

export async function makeDirectoryAsync() {}
export async function getInfoAsync() {
  return { exists: true };
}
export async function copyAsync({ from, to }) {
  copied.push({ from, to });
}
export async function readAsStringAsync() {
  return '';
}
export function deleteAsync(uri) {
  deleted.push(name(uri));
  return Promise.resolve();
}
