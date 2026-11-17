import { DocGate } from '@/components/doc-gate';
import { Haptics } from '@/lib/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PdfView } from '@/components/pdf-view';
import { IconButton, Pill, T } from '@/components/ui';
import { ZoomableImage } from '@/components/zoomable-image';
import { docUri } from '@/lib/doc-files';
import { docKindMeta } from '@/lib/doc-meta';
import { useStore } from '@/store';
import { C, R, S } from '@/theme';
import { daysBetween, fmtDate, parseDate, today } from '@/utils/dates';

/** Visualizador: mostra a foto ou o PDF direto na tela, sem baixar. */
function DocViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = useStore((s) => s.docs.find((d) => d.id === id));
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });

  if (!doc) return null;
  const meta = docKindMeta[doc.kind];
  const page = doc.pages[Math.min(index, doc.pages.length - 1)];
  const days = doc.expiresAt ? daysBetween(today(), parseDate(doc.expiresAt)) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + S.sm }]}>
      <View style={styles.top}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <T v="caption">{meta.short}</T>
          <T v="h3" numberOfLines={1}>
            {doc.title}
          </T>
        </View>
        <IconButton icon="pencil-outline" onPress={() => router.push({ pathname: '/documentos/novo', params: { id: doc.id } })} />
      </View>

      {doc.expiresAt ? (
        <View style={{ alignItems: 'center', marginBottom: S.sm }}>
          <Pill
            icon="calendar-alert"
            label={days != null && days < 0 ? `Venceu em ${fmtDate(doc.expiresAt)}` : `Válido até ${fmtDate(doc.expiresAt)}`}
            tone={days != null && days < 0 ? 'red' : days != null && days <= 30 ? 'yellow' : 'green'}
          />
        </View>
      ) : null}

      <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {page && page.type === 'pdf' ? <PdfView key={page.file} file={page.file} /> : null}
        {page && page.type === 'image' && box.w > 0 ? (
          <ZoomableImage key={page.file} uri={docUri(page.file)} width={box.w} height={box.h} />
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + S.md }]}>
        {doc.pages.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {doc.pages.map((p, i) => {
              const active = i === index;
              return (
                <Pressable
                  key={p.file}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIndex(i);
                  }}
                  style={[styles.tab, active && styles.tabActive]}>
                  <T v="label" color={active ? C.accent : C.textDim} style={{ fontSize: 13 }}>
                    {p.type === 'pdf' ? 'PDF' : 'Foto'} {i + 1}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        <T v="caption" color={C.textMute} style={{ textAlign: 'center' }}>
          {page?.type === 'image' ? 'Pinça para dar zoom · toque duplo para aproximar' : 'Role para ver todas as páginas · pinça para zoom'}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, marginBottom: S.md },
  stage: { flex: 1, backgroundColor: C.bg, overflow: 'hidden' },
  bottom: { paddingTop: S.md, gap: S.sm, backgroundColor: '#000' },
  tabs: { gap: 8, paddingHorizontal: S.lg },
  tab: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: R.pill,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: C.accentSoft },
});

export default function DocViewerRoute() {
  return (
    <DocGate>
      <DocViewer />
    </DocGate>
  );
}
