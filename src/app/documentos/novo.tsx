import { DocGate } from '@/components/doc-gate';
import * as DocumentPicker from 'expo-document-picker';
import { Haptics } from '@/lib/haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Chips, DateField, SwitchRow, TextField } from '@/components/fields';
import { Screen } from '@/components/screen';
import { Button, Icon, IconButton, T } from '@/components/ui';
import { deleteDocFiles, docUri, importDocFile } from '@/lib/doc-files';
import { withoutAutoLock } from '@/lib/doc-lock';
import { docKindMeta } from '@/lib/doc-meta';
import { reportError } from '@/lib/errors';
import { useActiveVehicle, useStore, type DocKind, type DocPage } from '@/store';
import { C, F, R, S } from '@/theme';
import { addMonths, toDateStr, today } from '@/utils/dates';

const KINDS = Object.keys(docKindMeta) as DocKind[];

function defaultTitle(kind: DocKind) {
  if (kind === 'crlv') return `CRLV ${new Date().getFullYear()}`;
  if (kind === 'seguro') return 'Apólice do seguro';
  if (kind === 'nota') return 'Nota fiscal';
  if (kind === 'cnh') return 'CNH';
  return '';
}

function NewDocument() {
  const params = useLocalSearchParams<{ tipo?: string; id?: string }>();
  const v = useActiveVehicle();
  const existing = useStore((s) => s.docs.find((d) => d.id === params.id));
  const { addDoc, updateDoc, removeDoc } = useStore.getState();

  const initialKind: DocKind = existing?.kind ?? (KINDS.includes(params.tipo as DocKind) ? (params.tipo as DocKind) : 'crlv');
  const [kind, setKind] = useState<DocKind>(initialKind);
  const [title, setTitle] = useState(existing?.title ?? defaultTitle(initialKind));
  const [touched, setTouched] = useState(!!existing);
  const [pages, setPages] = useState<DocPage[]>(existing?.pages ?? []);
  const [added, setAdded] = useState<DocPage[]>([]);
  const [hasExpiry, setHasExpiry] = useState(!!existing?.expiresAt);
  const [expiresAt, setExpiresAt] = useState(existing?.expiresAt ?? toDateStr(addMonths(today(), 12)));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [busy, setBusy] = useState(false);

  if (!v) return null;

  const addPages = (list: DocPage[]) => {
    setPages((p) => [...p, ...list]);
    setAdded((a) => [...a, ...list]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  /** Roda uma ação de anexo mostrando erro amigável e sem bloquear a tela ao voltar da câmera/galeria. */
  const attach = async (action: () => Promise<DocPage[] | null>) => {
    try {
      const list = await withoutAutoLock(action);
      if (list && list.length) addPages(list);
    } catch (e) {
      reportError('Não foi possível anexar o arquivo', e);
    } finally {
      setBusy(false);
    }
  };

  const fromCamera = () =>
    attach(async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Sem acesso à câmera', 'Permita o uso da câmera nas configurações do Android.');
        return null;
      }
      // base64: a foto chega pronta para gravar (no Expo Go o app não lê a pasta da câmera)
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      if (res.canceled) return null;
      setBusy(true);
      const a = res.assets[0];
      return [
        await importDocFile(a.uri, 'image', {
          name: 'Foto',
          width: a.width,
          height: a.height,
          base64: a.base64,
          mimeType: a.mimeType,
        }),
      ];
    });

  const fromGallery = () =>
    attach(async () => {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
        allowsMultipleSelection: true,
        selectionLimit: 6,
      });
      if (res.canceled) return null;
      setBusy(true);
      const out: DocPage[] = [];
      // uma de cada vez para não pesar a memória com várias fotos em base64
      for (const a of res.assets) {
        out.push(
          await importDocFile(a.uri, 'image', {
            name: a.fileName ?? 'Foto',
            width: a.width,
            height: a.height,
            base64: a.base64,
            mimeType: a.mimeType,
          }),
        );
      }
      return out;
    });

  const fromPdf = () =>
    attach(async () => {
      // Sem copiar para o cache do Expo Go: o endereço content:// do Android pode ser lido pelo app.
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: false });
      if (res.canceled) return null;
      setBusy(true);
      const a = res.assets[0];
      return [await importDocFile(a.uri, 'pdf', { name: a.name, mimeType: a.mimeType })];
    });

  const removePage = (p: DocPage) => {
    setPages((list) => list.filter((x) => x.file !== p.file));
    if (added.some((x) => x.file === p.file)) {
      deleteDocFiles([p]);
      setAdded((a) => a.filter((x) => x.file !== p.file));
    }
  };

  const cancel = () => {
    deleteDocFiles(added);
    router.back();
  };

  const save = () => {
    const data = {
      vehicleId: v.id,
      kind,
      title: title.trim() || docKindMeta[kind].short,
      pages,
      notes: notes.trim(),
      expiresAt: hasExpiry ? expiresAt : undefined,
    };
    if (existing) {
      updateDoc(existing.id, data);
      router.back();
    } else {
      const id = addDoc(data);
      router.replace({ pathname: '/documentos/[id]', params: { id } });
    }
  };

  const remove = () =>
    Alert.alert('Excluir documento?', 'Os arquivos anexados serão apagados do app.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteDocFiles(added);
          removeDoc(existing!.id);
          router.dismissTo('/documentos');
        },
      },
    ]);

  return (
    <Screen
      overline={existing ? 'Editar documento' : 'Novo documento'}
      title={docKindMeta[kind].label}
      right={
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {existing ? <IconButton icon="trash-can-outline" tone="red" onPress={remove} /> : null}
          <IconButton icon="close" onPress={cancel} />
        </View>
      }
      footer={<Button label={existing ? 'Salvar' : 'Salvar documento'} icon="check" onPress={save} disabled={pages.length === 0 || busy} />}>
      {!existing ? (
        <Chips
          scroll
          value={kind}
          onChange={(k) => {
            setKind(k);
            if (!touched) setTitle(defaultTitle(k));
          }}
          options={KINDS.map((k) => ({ value: k, label: docKindMeta[k].short, icon: docKindMeta[k].icon }))}
          style={{ marginBottom: S.xl }}
        />
      ) : null}

      {/* Anexos */}
      <T v="overline" style={{ marginBottom: S.md }}>
        Arquivos
      </T>
      <View style={styles.sources}>
        <Source icon="camera-outline" label="Tirar foto" onPress={fromCamera} />
        <Source icon="image-multiple-outline" label="Galeria" onPress={fromGallery} />
        <Source icon="file-pdf-box" label="PDF" onPress={fromPdf} />
      </View>
      {kind === 'crlv' ? (
        <T v="caption" color={C.textMute} style={{ marginTop: S.sm, fontSize: 12 }}>
          Dica: o CRLV digital em PDF fica no app Carteira Digital de Trânsito, em “Compartilhar”. Se for papel, tire foto da frente.
        </T>
      ) : null}

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={C.accent} />
          <T v="caption">Salvando arquivo…</T>
        </View>
      ) : null}

      {pages.length > 0 ? (
        <View style={styles.pages}>
          {pages.map((p, i) => (
            <View key={p.file} style={styles.page}>
              {p.type === 'image' ? (
                <Image source={{ uri: docUri(p.file) }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={styles.pdf}>
                  <Icon name="file-pdf-box" size={40} color={C.red} />
                  <T v="caption" numberOfLines={2} style={{ textAlign: 'center', fontSize: 11 }}>
                    {p.name}
                  </T>
                </View>
              )}
              <View style={styles.pageNum}>
                <T v="caption" color="#fff" style={{ fontFamily: F.bold, fontSize: 11 }}>
                  {i + 1}
                </T>
              </View>
              <Pressable hitSlop={8} onPress={() => removePage(p)} style={styles.pageDel}>
                <Icon name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/* Detalhes */}
      <View style={{ gap: S.lg, marginTop: S.xxl }}>
        <T v="overline">Detalhes</T>
        <TextField
          label="Nome"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setTouched(true);
          }}
          icon="text-short"
        />
        <View>
          <SwitchRow
            icon="calendar-alert"
            title="Tem data de validade"
            subtitle="Você recebe um aviso antes de vencer"
            value={hasExpiry}
            onChange={setHasExpiry}
          />
          {hasExpiry ? <DateField label="Vence em" value={expiresAt} onChange={setExpiresAt} /> : null}
        </View>
        <TextField label="Observações" value={notes} onChangeText={setNotes} icon="note-text-outline" placeholder="Opcional" />
      </View>
    </Screen>
  );
}

function Source({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.source, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <View style={styles.sourceIcon}>
        <Icon name={icon} size={24} color={C.accent} />
      </View>
      <T v="label" style={{ fontSize: 13 }}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sources: { flexDirection: 'row', gap: S.md },
  source: {
    flex: 1,
    alignItems: 'center',
    gap: S.sm,
    paddingVertical: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busy: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.lg },
  pages: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginTop: S.lg },
  page: {
    width: '30.5%',
    aspectRatio: 0.75,
    borderRadius: R.md,
    overflow: 'hidden',
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  pdf: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 },
  pageNum: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageDel: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function NewDocumentRoute() {
  return (
    <DocGate>
      <NewDocument />
    </DocGate>
  );
}
