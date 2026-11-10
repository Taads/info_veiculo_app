import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { DateField, IntField, MoneyField, TextField } from '@/components/fields';
import { levelColors, Ring } from '@/components/ring';
import { Screen } from '@/components/screen';
import { Button, Card, IconButton, Pill, T } from '@/components/ui';
import { avgKmPerDay, levelTone, revisionStatus } from '@/lib/insights';
import { useActiveVehicle, useStore } from '@/store';
import { C, S } from '@/theme';
import { addMonths, fmtDate, fmtDateShort, toDateStr, today, todayStr } from '@/utils/dates';
import { fmtKm, fmtMoney, fmtNumber } from '@/utils/format';

export default function RevisionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'nova';
  const v = useActiveVehicle();
  const r = useStore((s) => s.revisions.find((x) => x.id === id));
  const kmLogs = useStore((s) => s.kmLogs);
  const { addRevision, updateRevision, completeRevision, reopenRevision, removeRevision } = useStore.getState();

  const [title, setTitle] = useState(r?.title ?? '');
  const [dueKm, setDueKm] = useState(r?.dueKm ?? (v ? Math.ceil((v.km + 1) / 10000) * 10000 : 0));
  const [dueDate, setDueDate] = useState(r?.dueDate ?? toDateStr(addMonths(today(), 12)));
  const [doneDate, setDoneDate] = useState(r?.doneDate ?? todayStr());
  const [doneKm, setDoneKm] = useState(r?.doneKm ?? v?.km ?? 0);
  const [cost, setCost] = useState(r?.cost ?? 0);
  const [shop, setShop] = useState(r?.shop ?? '');
  const [notes, setNotes] = useState(r?.notes ?? '');

  if (!v || (!isNew && !r)) return null;

  const done = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  if (isNew) {
    return (
      <Screen
        back
        overline="Manutenção"
        title="Nova revisão"
        footer={
          <Button
            label="Adicionar revisão"
            icon="plus"
            disabled={dueKm <= 0}
            onPress={() => {
              addRevision({
                vehicleId: v.id,
                title: title.trim() || `Revisão ${fmtNumber(dueKm / 1000)} mil km`,
                dueKm,
                dueDate,
              });
              done();
              router.back();
            }}
          />
        }>
        <View style={{ gap: S.lg }}>
          <TextField label="Nome" value={title} onChangeText={setTitle} placeholder={`Revisão ${fmtNumber(dueKm / 1000)} mil km`} icon="wrench-outline" />
          <View style={{ flexDirection: 'row', gap: S.md }}>
            <IntField style={{ flex: 1 }} label="Fazer até (km)" value={dueKm} onChange={setDueKm} />
            <DateField style={{ flex: 1 }} label="Ou até a data" value={dueDate} onChange={setDueDate} />
          </View>
        </View>
      </Screen>
    );
  }

  const rev = r!;
  const st = revisionStatus(v, rev, avgKmPerDay(v, kmLogs).value);

  const remove = () =>
    Alert.alert('Excluir revisão?', rev.title, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          router.back();
          removeRevision(rev.id);
        },
      },
    ]);

  return (
    <Screen
      back
      right={<IconButton icon="trash-can-outline" tone="red" onPress={remove} />}
      footer={
        rev.done ? (
          <Button
            variant="secondary"
            label="Desfazer conclusão"
            icon="undo-variant"
            onPress={() => {
              reopenRevision(rev.id);
              router.back();
            }}
          />
        ) : (
          <Button
            label="Marcar como feita"
            icon="check-decagram"
            onPress={() => {
              updateRevision(rev.id, { title: title.trim() || rev.title, dueKm, dueDate });
              completeRevision(rev.id, { date: doneDate, km: doneKm, cost, shop: shop.trim(), notes: notes.trim() });
              done();
              router.back();
            }}
          />
        )
      }>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: S.xl }}>
        <Ring value={rev.done ? 1 : st.progress} size={104} stroke={10} colors={rev.done ? levelColors('ok') : levelColors(st.level)}>
          <T v="number" style={{ fontSize: 19 }}>
            {rev.done ? '✓' : Math.max(0, st.daysLeft)}
          </T>
          <T v="caption" style={{ fontSize: 11 }}>
            {rev.done ? 'feita' : 'dias'}
          </T>
        </Ring>
        <View style={{ flex: 1, gap: 6 }}>
          <Pill
            label={rev.done ? 'Concluída' : st.level === 'due' ? 'Vencida' : st.level === 'soon' ? 'Em breve' : 'Programada'}
            tone={rev.done ? 'green' : levelTone(st.level)}
          />
          <T v="h2">{rev.title}</T>
          <T v="caption">
            {rev.done
              ? `Feita em ${fmtDate(rev.doneDate!)} com ${fmtKm(rev.doneKm ?? 0)}${rev.cost ? ` · ${fmtMoney(rev.cost)}` : ''}`
              : st.kmLeft > 0
                ? `Faltam ${fmtKm(st.kmLeft)} · previsão ${fmtDateShort(st.predictedDate)}`
                : `Passou ${fmtKm(-st.kmLeft)} do limite`}
          </T>
        </View>
      </Card>

      {!rev.done ? (
        <>
          <T v="overline" style={{ marginTop: S.xxl, marginBottom: S.lg }}>
            Prazo
          </T>
          <View style={{ gap: S.lg }}>
            <TextField label="Nome" value={title} onChangeText={setTitle} icon="wrench-outline" />
            <View style={{ flexDirection: 'row', gap: S.md }}>
              <IntField style={{ flex: 1 }} label="Até (km)" value={dueKm} onChange={setDueKm} />
              <DateField style={{ flex: 1 }} label="Ou até" value={dueDate} onChange={setDueDate} />
            </View>
            <Button
              variant="secondary"
              size="md"
              label="Salvar prazo"
              icon="content-save-outline"
              onPress={() => {
                updateRevision(rev.id, { title: title.trim() || rev.title, dueKm, dueDate });
                done();
              }}
            />
          </View>

          <T v="overline" style={{ marginTop: S.xxl, marginBottom: S.lg }}>
            Quando fizer
          </T>
          <View style={{ gap: S.lg }}>
            <View style={{ flexDirection: 'row', gap: S.md }}>
              <DateField style={{ flex: 1 }} label="Data" value={doneDate} onChange={setDoneDate} />
              <IntField style={{ flex: 1 }} label="Km no painel" value={doneKm} onChange={setDoneKm} />
            </View>
            <MoneyField label="Valor pago" value={cost} onChange={setCost} />
            <TextField label="Oficina / concessionária" value={shop} onChangeText={setShop} icon="store-outline" />
            <TextField label="O que foi feito" value={notes} onChangeText={setNotes} icon="note-text-outline" placeholder="Filtros, fluidos, pastilhas…" />
          </View>
        </>
      ) : rev.shop || rev.notes ? (
        <Card style={{ marginTop: S.lg, gap: S.sm }}>
          {rev.shop ? <T v="label">{rev.shop}</T> : null}
          {rev.notes ? <T v="caption" color={C.textDim}>{rev.notes}</T> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
