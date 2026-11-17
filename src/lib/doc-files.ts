// Arquivos dos documentos ficam numa pasta própria do app, fora da galeria.
//
// Usa a API clássica do expo-file-system: a nova API recusa ler os arquivos
// temporários que a câmera, a galeria e o seletor de PDF devolvem no Expo Go
// ("Missing 'READ' permission"). A clássica copia esses caminhos sem problema.

import * as FS from 'expo-file-system/legacy';

import type { DocPage } from '@/store';

const DIR = `${FS.documentDirectory ?? ''}documentos/`;
let dirReady: Promise<void> | null = null;

function ensureDir() {
  if (!dirReady) {
    dirReady = FS.makeDirectoryAsync(DIR, { intermediates: true }).catch(async (e) => {
      // já existe = tudo certo
      const info = await FS.getInfoAsync(DIR);
      if (!info.exists) {
        dirReady = null;
        throw e;
      }
    });
  }
  return dirReady;
}

export function docUri(name: string): string {
  return DIR + name;
}

export function readDocBase64(name: string): Promise<string> {
  return FS.readAsStringAsync(docUri(name), { encoding: FS.EncodingType.Base64 });
}

/**
 * Salva um arquivo escolhido/fotografado dentro do app.
 *
 * No Expo Go o app só pode ler a própria pasta. Por isso:
 * - fotos chegam já em `base64` (a câmera/galeria entregam o conteúdo) e são gravadas direto;
 * - PDFs chegam como `content://` (endereço do Android, que pode ser lido) e são copiados.
 */
export async function importDocFile(
  uri: string,
  type: DocPage['type'],
  meta: { name?: string; width?: number; height?: number; base64?: string | null; mimeType?: string | null } = {},
): Promise<DocPage> {
  await ensureDir();
  const fromMime = meta.mimeType?.split('/')[1]?.replace('jpeg', 'jpg');
  const fromUri = uri.startsWith('content:') ? undefined : uri.split('?')[0].split('.').pop();
  const ext = type === 'pdf' ? 'pdf' : (fromMime || fromUri || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'jpg';
  const file = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  if (meta.base64) {
    await FS.writeAsStringAsync(docUri(file), meta.base64, { encoding: FS.EncodingType.Base64 });
  } else {
    await FS.copyAsync({ from: uri, to: docUri(file) });
  }
  return {
    file,
    type,
    name: meta.name || (type === 'pdf' ? 'Documento.pdf' : 'Foto'),
    width: meta.width,
    height: meta.height,
  };
}

export function deleteDocFiles(pages: DocPage[]) {
  for (const p of pages) {
    FS.deleteAsync(docUri(p.file), { idempotent: true }).catch(() => {});
  }
}
