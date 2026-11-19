import { DocGate } from '@/components/doc-gate';
import * as Clipboard from 'expo-clipboard';
import { Haptics } from '@/lib/haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Plate } from '@/components/plate';
import { Screen } from '@/components/screen';
import { Button, Card, Icon, IconBadge, Pill, Row, SectionHeader, T } from '@/components/ui';
import { docUri } from '@/lib/doc-files';
import { safe } from '@/lib/errors';
import { authenticate, biometricsAvailable } from '@/lib/doc-lock';
import { docInfoFilled, docKindMeta } from '@/lib/doc-meta';
import { useActiveVehicle, useStore, type VehicleDoc } from '@/store';
import { C, F, gradients, R, S } from '@/theme';
import { daysBetween, fmtDate, parseDate, today } from '@/utils/dates';

function Documents() {
  const v = useActiveVehicle();
  const allDocs = useStore((s) => s.docs);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  if (!v) return null;
  const docs = allDocs.filter((d) => d.vehicleId === v.id);
  const crlv = docs.find((d) => d.kind === 'crlv');
  const others = docs.filter((d) => d !== crlv);
  const info = v.docInfo;
  const filled = docInfoFilled(info);

  const enableLock = safe('Erro na digital', async () => {
    if (!(await biometricsAvailable())) {
      Alert.alert(
        'Nenhuma digital cadastrada',
        'Cadastre uma digital ou bloqueio de tela nas configurações do Android e tente de novo.',
      );
      return;
    }
    const ok = await authenticate('Confirme sua digital para ativar a proteção');
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateSettings({ docLock: true, docLockAsked: true });
    }
  });

  return (
    <Screen
      back
      overline={v.nickname || `${v.brand} ${v.model}`}
      title="Documentos"
      subtitle="Tudo salvo no app. Abre na hora, sem baixar nada.">
      {!settings.docLockAsked ? (
        <View style={styles.ask}>
          <View style={styles.askTop}>
            <IconBadge icon="fingerprint" size={46} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="label">Proteger com sua digital?</T>
              <T v="caption">Seus documentos só abrem depois de confirmar que é você.</T>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Button
              style={{ flex: 1 }}
              size="md"
              variant="secondary"
              label="Agora não"
              onPress={() => updateSettings({ docLockAsked: true })}
            />
            <Button style={{ flex: 1 }} size="md" label="Ativar" icon="fingerprint" onPress={enableLock} />
          </View>
        </View>
      ) : null}

      {/* CRLV */}
      <View style={styles.hero}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(255,122,26,0.18)', 'rgba(255,122,26,0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.2, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroTop}>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="overline" color={C.textDim}>
              CRLV · Documento do carro
            </T>
            <T v="h2">{info?.brandModel || `${v.brand} ${v.model}`}</T>
            {info?.exercicio ? <Pill label={`Exercício ${info.exercicio}`} tone="green" icon="check-decagram" /> : null}
          </View>
          <Plate plate={v.plate} scale={0.85} />
        </View>

        {filled > 0 && info ? (
          <View style={styles.fields}>
            <CopyField label="Renavam" value={info.renavam} wide />
            <CopyField label="Chassi" value={info.chassi} wide />
            <Field label="Ano fab./modelo" value={[info.yearFab, info.yearModel].filter(Boolean).join(' / ')} />
            <Field label="Cor" value={info.color} />
            <Field label="Combustível" value={info.fuel} />
            <Field label="Categoria" value={info.category} />
            <Field label="Município" value={[info.city, info.uf].filter(Boolean).join(' / ')} />
            <Field label="Proprietário" value={info.owner} />
          </View>
        ) : (
          <T v="caption" color={C.textDim} style={{ marginTop: S.lg }}>
            Preencha Renavam, chassi e os outros dados uma vez para consultar e copiar quando precisar.
          </T>
        )}

        <View style={styles.heroActions}>
          {crlv ? (
            <Button
              style={{ flex: 1 }}
              size="md"
              label="Ver CRLV"
              icon="eye-outline"
              onPress={() => router.push({ pathname: '/documentos/[id]', params: { id: crlv.id } })}
            />
          ) : (
            <Button
              style={{ flex: 1 }}
              size="md"
              label="Anexar CRLV"
              icon="paperclip"
              onPress={() => router.push({ pathname: '/documentos/novo', params: { tipo: 'crlv' } })}
            />
          )}
          <Button
            style={{ flex: 1 }}
            size="md"
            variant="secondary"
            label={filled > 0 ? 'Editar dados' : 'Preencher'}
            icon="pencil-outline"
            onPress={() => router.push('/documentos/ficha')}
          />
        </View>
      </View>

      {/* Outros */}
      <SectionHeader
        title="Outros documentos"
        action="Adicionar"
        onAction={() => router.push({ pathname: '/documentos/novo', params: { tipo: 'cnh' } })}
      />
      {others.length === 0 ? (
        <View style={styles.quickGrid}>
          {(['cnh', 'seguro', 'nota', 'outro'] as const).map((k) => (
            <Card
              key={k}
              style={styles.quick}
              onPress={() => router.push({ pathname: '/documentos/novo', params: { tipo: k } })}>
              <IconBadge icon={docKindMeta[k].icon} tone={docKindMeta[k].tone} size={40} />
              <T v="label" style={{ marginTop: S.md }}>
                {docKindMeta[k].short}
              </T>
              <T v="caption" color={C.accent}>
                + Anexar
              </T>
            </Card>
          ))}
        </View>
      ) : (
        <Card style={{ paddingVertical: S.xs }}>
          {others.map((d, i) => (
            <DocRow key={d.id} doc={d} last={i === others.length - 1} />
          ))}
        </Card>
      )}

      <View style={styles.footNote}>
        <Icon name={settings.docLock ? 'lock-outline' : 'lock-open-variant-outline'} size={16} color={C.textMute} />
        <T v="caption" color={C.textMute}>
          {settings.docLock ? 'Protegido com digital' : 'Sem proteção'} · os arquivos ficam só neste celular
        </T>
      </View>
    </Screen>
  );
}

function DocRow({ doc, last }: { doc: VehicleDoc; last: boolean }) {
  const meta = docKindMeta[doc.kind];
  const first = doc.pages[0];
  const days = doc.expiresAt ? daysBetween(today(), parseDate(doc.expiresAt)) : null;
  return (
    <Row
      icon={meta.icon}
      tone={meta.tone}
      title={doc.title}
      subtitle={[
        `${doc.pages.length} ${doc.pages.length === 1 ? 'arquivo' : 'arquivos'}`,
        doc.expiresAt ? `vence ${fmtDate(doc.expiresAt)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      last={last}
      onPress={() => router.push({ pathname: '/documentos/[id]', params: { id: doc.id } })}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          {days != null && days <= 30 ? <Pill label={days < 0 ? 'Vencido' : `${days}d`} tone={days < 0 ? 'red' : 'yellow'} /> : null}
          {first?.type === 'image' ? (
            <Image source={{ uri: docUri(first.file) }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.pdfThumb]}>
              <T v="caption" color={C.red} style={{ fontFamily: F.bold, fontSize: 10 }}>
                PDF
              </T>
            </View>
          )}
        </View>
      }
    />
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <T v="caption" style={{ fontSize: 11 }}>
        {label}
      </T>
      <T v="label" numberOfLines={1}>
        {value}
      </T>
    </View>
  );
}

function CopyField({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <Pressable
      onPress={async () => {
        try {
          await Clipboard.setStringAsync(value.replace(/\s/g, ''));
        } catch {
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      style={({ pressed }) => [styles.field, wide && styles.fieldWide, styles.copyField, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ flex: 1 }}>
        <T v="caption" style={{ fontSize: 11 }}>
          {label}
        </T>
        <T v="label" style={{ fontFamily: F.display, letterSpacing: 0.6 }} numberOfLines={1}>
          {value}
        </T>
      </View>
      <View style={styles.copyBtn}>
        <Icon name={copied ? 'check' : 'content-copy'} size={15} color={copied ? C.green : C.accent} />
        <T v="caption" color={copied ? C.green : C.accent} style={{ fontSize: 11.5, fontFamily: F.semi }}>
          {copied ? 'Copiado' : 'Copiar'}
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ask: {
    gap: S.lg,
    padding: S.lg,
    borderRadius: R.lg,
    backgroundColor: '#17130F',
    borderWidth: 1,
    borderColor: C.accentLine,
    marginBottom: S.xl,
  },
  askTop: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  hero: { borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: C.borderStrong, padding: S.xl },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  fields: { flexDirection: 'row', flexWrap: 'wrap', marginTop: S.xl, gap: S.sm },
  field: {
    width: '48.5%',
    padding: S.md,
    borderRadius: R.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: C.border,
    gap: 2,
  },
  fieldWide: { width: '100%' },
  copyField: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: R.pill,
    backgroundColor: C.accentSoft,
  },
  heroActions: { flexDirection: 'row', gap: S.md, marginTop: S.xl },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  quick: { width: '47.5%', padding: S.lg },
  thumb: { width: 42, height: 42, borderRadius: 10, backgroundColor: C.surface2 },
  pdfThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,93,93,0.3)' },
  footNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: S.xxl },
});

export default function DocumentsRoute() {
  return (
    <DocGate root>
      <Documents />
    </DocGate>
  );
}
