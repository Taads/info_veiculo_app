import { Asset } from 'expo-asset';
import * as FS from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { readDocBase64 } from '@/lib/doc-files';
import { C } from '@/theme';

import { Icon, T } from './ui';

// pdf.js vai junto no app (assets/pdfjs) para abrir PDFs sem internet.
let libCache: Promise<[string, string]> | null = null;

async function readAsset(mod: number): Promise<string> {
  const asset = Asset.fromModule(mod);
  try {
    await asset.downloadAsync();
    return await FS.readAsStringAsync(asset.localUri ?? asset.uri);
  } catch {
    // No Expo Go o arquivo pode ficar numa pasta que o app não lê: busca direto pela URL.
    const res = await fetch(asset.uri);
    if (!res.ok) throw new Error(`pdf.js indisponível (${res.status})`);
    return res.text();
  }
}

function loadPdfJs() {
  if (!libCache) {
    libCache = Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- asset do Metro
      readAsset(require('@/assets/pdfjs/pdf.min.txt')),
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- asset do Metro
      readAsset(require('@/assets/pdfjs/pdf.worker.min.txt')),
    ]).catch((e) => {
      libCache = null;
      throw e;
    });
  }
  return libCache;
}

function buildHtml(lib: string, worker: string, b64: string) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=6, user-scalable=yes">
<style>
html,body{margin:0;background:${C.bg};}
#pages{padding:12px 12px 40px;}
canvas{display:block;width:100%;height:auto;margin:0 0 14px;border-radius:10px;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.4)}
</style></head><body><div id="pages"></div>
<script>${worker}</script>
<script>${lib}</script>
<script>
(async function(){
  try{
    var raw=atob("${b64}");var bytes=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    var pdf=await pdfjsLib.getDocument({data:bytes}).promise;
    var box=document.getElementById('pages');
    var dpr=Math.min(window.devicePixelRatio||2,3);
    for(var n=1;n<=pdf.numPages;n++){
      var page=await pdf.getPage(n);
      var base=page.getViewport({scale:1});
      var vp=page.getViewport({scale:((window.innerWidth-24)/base.width)*dpr});
      var cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;box.appendChild(cv);
      await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      if(n===1)window.ReactNativeWebView.postMessage('ready');
    }
  }catch(e){window.ReactNativeWebView.postMessage('error:'+(e&&e.message));}
})();
</script></body></html>`;
}

/** Mostra um PDF salvo no app, página por página, sem sair do app. */
export function PdfView({ file }: { file: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [[lib, worker], b64] = await Promise.all([loadPdfJs(), readDocBase64(file)]);
        if (alive) setHtml(buildHtml(lib, worker, b64));
      } catch (e) {
        console.warn('[GestCar] abrir PDF:', e instanceof Error ? e.message : String(e));
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [file]);

  return (
    <View style={styles.root}>
      {html ? (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.web}
          onMessage={(e) => setState(e.nativeEvent.data.startsWith('error') ? 'error' : 'ready')}
          setBuiltInZoomControls
          setDisplayZoomControls={false}
          showsVerticalScrollIndicator={false}
        />
      ) : null}
      {state === 'loading' ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={C.accent} size="large" />
          <T v="caption">Abrindo PDF…</T>
        </View>
      ) : null}
      {state === 'error' ? (
        <View style={styles.overlay}>
          <Icon name="file-alert-outline" size={40} color={C.red} />
          <T v="label">Não consegui abrir este PDF</T>
          <T v="caption">O arquivo pode estar protegido por senha ou corrompido.</T>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  web: { flex: 1, backgroundColor: C.bg },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.bg,
    padding: 32,
  },
});
