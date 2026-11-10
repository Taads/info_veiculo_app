import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chips, DateField, DecimalField, MoneyField, Stepper, TextField } from '@/components/fields';
import { Screen } from '@/components/screen';
import { Button, Card, Icon, T } from '@/components/ui';
import { kindMeta } from '@/lib/insights';
import { useActiveVehicle, useStore, type PaymentKind } from '@/store';
import { C, F, R, S } from '@/theme';
import { addMonths, fmtDateShort, parseDate, todayStr } from '@/utils/dates';
import { allPlans } from '@/utils/finance';
import { fmtMoney, parseDecimal } from '@/utils/format';

const YEAR = new Date().getFullYear();

function defaultTitle(kind: PaymentKind) {
  if (kind === 'ipva') return `IPVA ${YEAR + (new Date().getMonth() >= 9 ? 1 : 0)}`;
  if (kind === 'seguro') return `Seguro ${YEAR}/${String(YEAR + 1).slice(2)}`;
  if (kind === 'licenciamento') return `Licenciamento ${YEAR + (new Date().getMonth() >= 9 ? 1 : 0)}`;
  return '';
}

export default function NewPayment() {
  const v = useActiveVehicle();
  const addPayment = useStore((s) => s.addPayment);

  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const initialKind: PaymentKind = tipo && tipo in kindMeta ? (tipo as PaymentKind) : 'ipva';
  const [kind, setKind] = useState<PaymentKind>(initialKind);
  const [title, setTitle] = useState(defaultTitle(initialKind));
  const [titleTouched, setTitleTouched] = useState(false);
  const [value, setValue] = useState(0);
  const [interest, setInterest] = useState('');
  const [discount, setDiscount] = useState('');
  const [freeUntil, setFreeUntil] = useState(1);
  const [firstDue, setFirstDue] = useState(todayStr());
  const [chosen, setChosen] = useState(1);

  const input = useMemo(
    () => ({
      value,
      interestPct: parseDecimal(interest),
      discountPct: parseDecimal(discount),
      freeUntil,
    }),
    [value, interest, discount, freeUntil],
  );
  const plans = useMemo(() => allPlans(input, 12), [input]);
  const plan = plans[chosen - 1];
  const cheapest = plans.reduce((a, b) => (b.total < a.total ? b : a), plans[0]);

  if (!v) return null;

  const save = () => {
    const id = addPayment({
      vehicleId: v.id,
      kind,
      title: title.trim() || kindMeta[kind].label,
      baseValue: value,
      discountPct: input.discountPct,
      interestPct: input.interestPct,
      freeUntil,
      installments: chosen,
      total: plan.total,
      firstDueDate: firstDue,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({ pathname: '/pagamento/[id]', params: { id } });
  };

  const lastDue = addMonths(parseDate(firstDue), chosen - 1);

  return (
    <Screen
      back
      overline="Novo pagamento"
      title={kind === 'seguro' ? 'Seguro do carro' : kind === 'ipva' ? 'IPVA' : 'Simular e parcelar'}
      subtitle="Coloque o valor e veja quanto fica de 1x a 12x."
      footer={
        <View style={{ gap: S.sm }}>
          {value > 0 ? (
            <View style={styles.summary}>
              <T v="caption">
                {chosen}x de <T v="label">{fmtMoney(plan.parcel)}</T>
              </T>
              <T v="caption">
                Total <T v="label">{fmtMoney(plan.total)}</T>
              </T>
            </View>
          ) : null}
          <Button label="Salvar e criar lembretes" icon="bell-ring-outline" onPress={save} disabled={value <= 0} />
        </View>
      }>
      <Chips
        value={kind}
        onChange={(k) => {
          setKind(k);
          if (!titleTouched) setTitle(defaultTitle(k));
        }}
        options={(Object.keys(kindMeta) as PaymentKind[]).map((k) => ({ value: k, label: kindMeta[k].label, icon: kindMeta[k].icon }))}
      />

      <View style={{ gap: S.lg, marginTop: S.xl }}>
        <TextField
          label="Nome"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setTitleTouched(true);
          }}
          placeholder="Ex.: IPVA 2027"
          icon="text-short"
        />
        <MoneyField label="Valor total" value={value} onChange={setValue} big />
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <DecimalField style={{ flex: 1 }} label="Juros ao mês" text={interest} onChangeText={setInterest} hint="0 = sem juros" />
          <DecimalField style={{ flex: 1 }} label="Desconto à vista" text={discount} onChangeText={setDiscount} hint="Só no 1x" />
        </View>
        <Stepper label="Sem juros até" value={freeUntil} onChange={setFreeUntil} min={1} max={12} format={(n) => `${n}x`} />
        <DateField label="Vencimento da 1ª parcela" value={firstDue} onChange={setFirstDue} />
      </View>

      <View style={styles.tableHead}>
        <T v="h3">Opções de parcelamento</T>
        {value > 0 && cheapest ? (
          <T v="caption" color={C.green}>
            Mais barato: {cheapest.n}x
          </T>
        ) : null}
      </View>

      {value <= 0 ? (
        <Card style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.xxl }}>
          <Icon name="calculator-variant-outline" size={30} color={C.textMute} />
          <T v="caption" style={{ textAlign: 'center' }}>
            Digite o valor total para ver a simulação.
          </T>
        </Card>
      ) : (
        <View style={styles.table}>
          {plans.map((p) => {
            const active = p.n === chosen;
            const diffLabel =
              Math.abs(p.diff) < 0.01 ? 'sem juros' : p.diff < 0 ? `economia ${fmtMoney(-p.diff)}` : `+${fmtMoney(p.diff)} juros`;
            const diffColor = Math.abs(p.diff) < 0.01 ? C.textDim : p.diff < 0 ? C.green : C.red;
            return (
              <Pressable
                key={p.n}
                onPress={() => {
                  Haptics.selectionAsync();
                  setChosen(p.n);
                }}
                style={[styles.planRow, active && styles.planRowActive]}>
                <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
                <T v="h3" style={{ width: 38 }} color={active ? C.accent : C.text}>
                  {p.n}x
                </T>
                <View style={{ flex: 1 }}>
                  <T v="label" style={{ fontFamily: F.display, fontSize: 15.5 }}>
                    {fmtMoney(p.parcel)}
                  </T>
                  <T v="caption" color={diffColor} style={{ fontSize: 11.5 }}>
                    {diffLabel}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T v="caption" style={{ fontSize: 11 }}>
                    total
                  </T>
                  <T v="label">{fmtMoney(p.total)}</T>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {value > 0 ? (
        <Card style={{ marginTop: S.lg, flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
          <Icon name="bell-ring-outline" size={22} color={C.accent} />
          <T v="caption" style={{ flex: 1 }} color={C.textDim}>
            {chosen === 1
              ? `Vamos te lembrar 7 dias antes, 1 dia antes e no dia ${fmtDateShort(firstDue)}.`
              : `${chosen} parcelas de ${fmtDateShort(firstDue)} até ${fmtDateShort(lastDue)}. Lembrete 7 dias antes, 1 dia antes e no dia de cada uma.`}
          </T>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  tableHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: S.xxl,
    marginBottom: S.md,
  },
  table: { gap: 8 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderRadius: R.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  planRowActive: { borderColor: C.accentLine, backgroundColor: '#1A1612' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: C.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
});
