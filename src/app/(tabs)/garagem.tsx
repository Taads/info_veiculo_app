import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Chips, SwitchRow } from '@/components/fields';
import { Plate } from '@/components/plate';
import { Screen } from '@/components/screen';
import { Button, Card, Icon, IconButton, Pill, Row, SectionHeader, T } from '@/components/ui';
import { ensurePermission, scheduledCount, sendTest } from '@/lib/notifications';
import { useActiveVehicle, useStore } from '@/store';
import { C, R, S } from '@/theme';
import { fmtDate } from '@/utils/dates';
import { fmtNumber } from '@/utils/format';

export default function Garage() {
  const active = useActiveVehicle();
  const vehicles = useStore((s) => s.vehicles);
  const kmLogs = useStore((s) => s.kmLogs);
  const settings = useStore((s) => s.settings);
  const { setActiveVehicle, updateSettings, removeKmLog } = useStore.getState();
  const [count, setCount] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => scheduledCount().then(setCount).catch(() => {}), 1200);
      return () => clearTimeout(t);
    }, []),
  );

  const logs = kmLogs.filter((l) => l.vehicleId === active?.id);

  const toggleNotifications = async (on: boolean) => {
    if (on) {
      const ok = await ensurePermission(true);
      if (!ok) {
        Alert.alert(
          'Permissão negada',
          'Ative as notificações do Expo Go nas configurações do Android para receber os lembretes.',
        );
        return;
      }
    }
    updateSettings({ notifications: on });
  };

  return (
    <Screen tabs overline="Configurações" title="Garagem">
      {/* Carros */}
      <View style={{ gap: S.md }}>
        {vehicles.map((v) => {
          const isActive = v.id === active?.id;
          return (
            <Pressable
              key={v.id}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveVehicle(v.id);
              }}
              style={[styles.car, isActive && styles.carActive]}>
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T v="h3">{v.nickname || `${v.brand} ${v.model}`}</T>
                  {isActive && vehicles.length > 1 ? <Pill label="Ativo" tone="accent" /> : null}
                </View>
                <T v="caption">
                  {v.brand} {v.model} {v.year} · {fmtNumber(v.km)} km
                </T>
                <Plate plate={v.plate} scale={0.9} />
              </View>
              <IconButton icon="pencil-outline" onPress={() => router.push({ pathname: '/carro', params: { id: v.id } })} />
            </Pressable>
          );
        })}
        <Button variant="secondary" size="md" icon="plus" label="Adicionar outro carro" onPress={() => router.push('/onboarding')} />
      </View>

      {/* Notificações */}
      <SectionHeader title="Notificações" />
      <Card style={{ paddingVertical: S.xs }}>
        <SwitchRow
          icon="bell-ring-outline"
          title="Lembretes no celular"
          subtitle="Óleo, revisões e vencimentos, mesmo com o app fechado"
          value={settings.notifications}
          onChange={toggleNotifications}
        />
        <View style={styles.sep} />
        <SwitchRow
          icon="road-variant"
          title="Perguntar os km do dia"
          subtitle={`Todo dia às ${settings.dailyHour}h`}
          value={settings.dailyKm}
          onChange={(dailyKm) => updateSettings({ dailyKm })}
        />
        {settings.dailyKm ? (
          <Chips
            style={{ paddingBottom: S.md, paddingLeft: 52 }}
            value={settings.dailyHour}
            onChange={(dailyHour) => updateSettings({ dailyHour })}
            options={[18, 19, 20, 21, 22].map((h) => ({ value: h, label: `${h}h` }))}
          />
        ) : null}
        <View style={styles.sep} />
        <View style={{ paddingVertical: S.md, gap: S.sm }}>
          <T v="caption" color={C.textDim}>
            Avisar dos vencimentos
          </T>
          <Chips
            value={settings.daysBefore.join(',')}
            onChange={(s) => updateSettings({ daysBefore: s.split(',').map(Number) })}
            options={[
              { value: '7,1,0', label: '7d, 1d e no dia' },
              { value: '3,0', label: '3d e no dia' },
              { value: '15,7,1,0', label: '15d, 7d, 1d e no dia' },
            ]}
          />
        </View>
      </Card>
      <View style={styles.notifyFoot}>
        <T v="caption" color={C.textMute} style={{ flex: 1 }}>
          {count == null ? ' ' : `${count} ${count === 1 ? 'lembrete agendado' : 'lembretes agendados'}`}
        </T>
        <Pressable
          hitSlop={8}
          onPress={async () => {
            const ok = await sendTest();
            Alert.alert(ok ? 'Teste enviado' : 'Sem permissão', ok ? 'Feche o app: a notificação chega em 5 segundos.' : 'Ative as notificações do Expo Go nas configurações do Android.');
          }}
          style={styles.testBtn}>
          <Icon name="send-outline" size={16} color={C.accent} />
          <T v="label" color={C.accent} style={{ fontSize: 13 }}>
            Testar notificação
          </T>
        </Pressable>
      </View>

      {/* Histórico de km */}
      <SectionHeader
        title="Registros de km"
        action={logs.length > 6 ? (showAll ? 'Mostrar menos' : 'Ver todos') : undefined}
        onAction={() => setShowAll((x) => !x)}
      />
      <Card style={{ paddingVertical: S.xs }}>
        {logs.length === 0 ? (
          <T v="caption" style={{ paddingVertical: S.lg, textAlign: 'center' }}>
            Nenhum registro ainda. Toque no + para lançar os km do dia.
          </T>
        ) : null}
        {(showAll ? logs : logs.slice(0, 6)).map((l, i, arr) => (
          <Row
            key={l.id}
            icon={l.delta > 0 ? 'arrow-up-right' : 'arrow-down-left'}
            tone={l.delta > 0 ? 'green' : 'neutral'}
            title={`${l.delta > 0 ? '+' : ''}${fmtNumber(l.delta)} km`}
            subtitle={`${fmtDate(l.date)} · painel ${fmtNumber(l.odometer)} km`}
            last={i === arr.length - 1}
            right={
              <IconButton
                icon="close"
                size={32}
                onPress={() =>
                  Alert.alert('Apagar registro?', 'O hodômetro volta ao valor anterior.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Apagar', style: 'destructive', onPress: () => removeKmLog(l.id) },
                  ])
                }
              />
            }
          />
        ))}
      </Card>

      <T v="caption" color={C.textMute} style={{ textAlign: 'center', marginTop: S.xxl }}>
        Garagem · v1.0 · seus dados ficam só neste celular
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  car: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.lg + 2,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  carActive: { borderColor: C.accentLine },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.borderStrong },
  notifyFoot: { flexDirection: 'row', alignItems: 'center', marginTop: S.md, paddingHorizontal: 4 },
  testBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
