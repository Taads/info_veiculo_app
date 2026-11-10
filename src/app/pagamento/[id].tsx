import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card, Icon, IconBadge, IconButton, Pill, ProgressBar, T } from '@/components/ui';
import { kindMeta, paymentProgress } from '@/lib/insights';
import { useStore } from '@/store';
import { C, F, R, S } from '@/theme';
import { daysBetween, fmtDate, parseDate, relativeDays, today } from '@/utils/dates';
import { fmtMoney, fmtPct } from '@/utils/format';

export default function PaymentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useStore((s) => s.payments.find((x) => x.id === id));
  const toggleParcel = useStore((s) => s.toggleParcel);
  const removePayment = useStore((s) => s.removePayment);
  if (!p) return null;

  const meta = kindMeta[p.kind];
  const prog = paymentProgress(p);
  const allPaid = prog.paidCount === p.installments;
  const now = today();

  const remove = () =>
    Alert.alert('Excluir pagamento?', `${p.title} e todos os lembretes dele serão apagados.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          router.back();
          removePayment(p.id);
        },
      },
    ]);

  return (
    <Screen back right={<IconButton icon="trash-can-outline" tone="red" onPress={remove} />}>
      <View style={styles.head}>
        <IconBadge icon={meta.icon} tone={meta.tone} size={56} />
        <View style={{ flex: 1, gap: 4 }}>
          <T v="overline">{meta.label}</T>
          <T v="title" style={{ fontSize: 26 }}>
            {p.title}
          </T>
        </View>
      </View>

      <Card style={{ gap: S.lg }}>
        <View style={styles.totals}>
          <View style={{ gap: 2 }}>
            <T v="caption">Total</T>
            <T v="title" style={{ fontSize: 30 }}>
              {fmtMoney(p.total)}
            </T>
          </View>
          {allPaid ? <Pill label="Quitado" tone="green" icon="check-circle" /> : <Pill label={`${prog.paidCount}/${p.installments} pagas`} tone="accent" />}
        </View>
        <ProgressBar value={prog.paidValue / Math.max(1, p.total)} color={allPaid ? C.green : C.accent} />
        <View style={styles.facts}>
          <Fact label="Pago" value={fmtMoney(prog.paidValue)} color={C.green} />
          <Fact label="Falta" value={fmtMoney(Math.max(0, prog.remaining))} />
          <Fact label="Plano" value={`${p.installments}x`} />
        </View>
        <View style={styles.meta}>
          <T v="caption">Valor original {fmtMoney(p.baseValue)}</T>
          {p.installments === 1 && p.discountPct > 0 ? <T v="caption">· desconto {fmtPct(p.discountPct, 1)}</T> : null}
          {p.installments > p.freeUntil && p.interestPct > 0 ? <T v="caption">· juros {fmtPct(p.interestPct)} a.m.</T> : null}
        </View>
      </Card>

      <T v="overline" style={{ marginTop: S.xxl, marginBottom: S.md }}>
        Parcelas · toque para marcar como paga
      </T>
      <View style={{ gap: 8 }}>
        {p.parcels.map((q) => {
          const days = daysBetween(now, parseDate(q.dueDate));
          const late = !q.paid && days < 0;
          const soon = !q.paid && days >= 0 && days <= 7;
          return (
            <Pressable
              key={q.n}
              onPress={() => {
                Haptics.impactAsync(q.paid ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
                toggleParcel(p.id, q.n);
              }}
              style={({ pressed }) => [
                styles.parcel,
                q.paid && styles.parcelPaid,
                late && styles.parcelLate,
                { transform: [{ scale: pressed ? 0.985 : 1 }] },
              ]}>
              <View style={[styles.check, q.paid && styles.checkOn]}>{q.paid ? <Icon name="check" size={16} color="#06281B" /> : null}</View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="label" color={q.paid ? C.textDim : C.text}>
                  {p.installments > 1 ? `Parcela ${q.n}` : 'Pagamento único'}
                </T>
                <T v="caption" color={late ? C.red : soon ? C.yellow : C.textDim}>
                  {q.paid ? `Pago em ${fmtDate(q.paidDate!)}` : `${fmtDate(q.dueDate)} · ${late ? 'atrasada' : relativeDays(days)}`}
                </T>
              </View>
              <T
                v="label"
                style={[{ fontFamily: F.display, fontSize: 15 }, q.paid && { textDecorationLine: 'line-through' }]}
                color={q.paid ? C.textMute : C.text}>
                {fmtMoney(q.value)}
              </T>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

function Fact({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <T v="caption" style={{ fontSize: 11.5 }}>
        {label}
      </T>
      <T v="label" color={color}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: S.lg, marginBottom: S.xl },
  totals: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  facts: { flexDirection: 'row', gap: S.md },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  parcel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.lg,
    borderRadius: R.md,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  parcelPaid: { backgroundColor: 'rgba(61,220,151,0.05)', borderColor: 'rgba(61,220,151,0.15)' },
  parcelLate: { borderColor: 'rgba(255,93,93,0.35)' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: C.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: C.green, borderColor: C.green },
});
