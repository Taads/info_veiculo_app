import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chips } from '@/components/fields';
import { Screen } from '@/components/screen';
import { Card, Icon, IconBadge, IconButton, Pill, ProgressBar, SectionHeader, T } from '@/components/ui';
import { kindMeta, paymentProgress, upcomingParcels } from '@/lib/insights';
import { useActiveVehicle, useStore, type Payment, type PaymentKind } from '@/store';
import { C, F, S } from '@/theme';
import { fmtDateShort, relativeDays } from '@/utils/dates';
import { fmtMoney } from '@/utils/format';

type Filter = 'todos' | PaymentKind;

export default function Payments() {
  const v = useActiveVehicle();
  const all = useStore((s) => s.payments);
  const [filter, setFilter] = useState<Filter>('todos');

  const data = useMemo(() => {
    if (!v) return null;
    const mine = all.filter((p) => p.vehicleId === v.id);
    const list = mine.filter((p) => filter === 'todos' || p.kind === filter);
    let total = 0;
    let paid = 0;
    for (const p of mine) {
      const pr = paymentProgress(p);
      total += p.total;
      paid += pr.paidValue;
    }
    const next = upcomingParcels(mine)[0];
    return { mine, list, total, paid, next };
  }, [v, all, filter]);

  if (!v || !data) return null;
  const { mine, list, total, paid, next } = data;

  return (
    <Screen
      tabs
      overline="IPVA · Seguro · Taxas"
      title="Pagamentos"
      right={<IconButton icon="plus" tone="accent" onPress={() => router.push('/pagamento/novo')} />}>
      <View style={styles.quick}>
        {(['ipva', 'seguro'] as const).map((k) => (
          <QuickCard key={k} kind={k} payments={mine} />
        ))}
      </View>
      <Card
        onPress={() => router.push({ pathname: '/pagamento/novo', params: { tipo: 'licenciamento' } })}
        style={styles.otherRow}>
        <IconBadge icon="card-account-details-outline" tone="violet" size={38} />
        <View style={{ flex: 1 }}>
          <T v="label">Licenciamento e outros</T>
          <T v="caption">Taxas, multas ou qualquer conta do carro</T>
        </View>
        <Icon name="plus" size={20} color={C.textDim} />
      </Card>

      {mine.length === 0 ? (
        <T v="caption" color={C.textMute} style={{ textAlign: 'center', marginTop: S.xxl, lineHeight: 18 }}>
          Toque em IPVA ou Seguro, coloque o valor e compare{'\n'}de 1x a 12x. Cada parcela ganha um lembrete.
        </T>
      ) : (
        <>
          <SectionHeader title="Resumo" />
          <Card style={{ gap: S.lg }}>
            <View style={styles.summaryTop}>
              <View style={{ gap: 2 }}>
                <T v="caption">Falta pagar</T>
                <T v="title" style={{ fontSize: 30 }}>
                  {fmtMoney(Math.max(0, total - paid))}
                </T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <T v="caption">Já pago</T>
                <T v="label" color={C.green}>
                  {fmtMoney(paid)}
                </T>
              </View>
            </View>
            <ProgressBar value={paid / Math.max(1, total)} />
            {next ? (
              <View style={styles.next}>
                <T v="caption" color={C.textDim}>
                  Próximo: <T v="caption" color={C.text}>{next.payment.title}</T> · {fmtDateShort(next.dueDate)} ({relativeDays(next.days)})
                </T>
                <T v="label" style={{ fontFamily: F.display }} color={next.level === 'due' ? C.red : C.text}>
                  {fmtMoney(next.value)}
                </T>
              </View>
            ) : (
              <Pill label="Tudo quitado" tone="green" icon="check-circle" />
            )}
          </Card>

          <Chips
            scroll
            style={{ marginTop: S.xl }}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'todos' as Filter, label: 'Todos' },
              ...(Object.keys(kindMeta) as PaymentKind[])
                .filter((k) => mine.some((p) => p.kind === k))
                .map((k) => ({ value: k as Filter, label: kindMeta[k].label })),
            ]}
          />

          <SectionHeader title={`${list.length} ${list.length === 1 ? 'pagamento' : 'pagamentos'}`} style={{ marginTop: S.xl }} />
          <View style={{ gap: S.md }}>
            {list.map((p) => {
              const meta = kindMeta[p.kind];
              const pr = paymentProgress(p);
              const done = pr.paidCount === p.installments;
              return (
                <Card key={p.id} onPress={() => router.push({ pathname: '/pagamento/[id]', params: { id: p.id } })} style={{ gap: S.lg }}>
                  <View style={styles.itemTop}>
                    <IconBadge icon={meta.icon} tone={meta.tone} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <T v="label">{p.title}</T>
                      <T v="caption">
                        {p.installments === 1 ? 'À vista' : `${p.installments}x de ${fmtMoney(p.parcels[p.parcels.length - 1].value)}`}
                      </T>
                    </View>
                    <T v="h3" style={{ fontFamily: F.display }}>
                      {fmtMoney(p.total)}
                    </T>
                  </View>
                  <ProgressBar value={pr.paidCount / p.installments} color={done ? C.green : C.accent} height={6} />
                  <View style={styles.itemBottom}>
                    <T v="caption">
                      {pr.paidCount}/{p.installments} pagas
                    </T>
                    {done ? (
                      <Pill label="Quitado" tone="green" icon="check" />
                    ) : pr.next ? (
                      <T v="caption" color={C.textDim}>
                        Próxima {fmtDateShort(pr.next.dueDate)}
                      </T>
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

/** Atalho fixo para IPVA e Seguro: mostra o atual ou convida a adicionar. */
function QuickCard({ kind, payments }: { kind: 'ipva' | 'seguro'; payments: Payment[] }) {
  const meta = kindMeta[kind];
  const current = payments.find((p) => p.kind === kind && paymentProgress(p).paidCount < p.installments) ?? payments.find((p) => p.kind === kind);
  const pr = current ? paymentProgress(current) : null;
  const done = current && pr ? pr.paidCount === current.installments : false;

  return (
    <Card
      style={styles.quickCard}
      onPress={() =>
        current
          ? router.push({ pathname: '/pagamento/[id]', params: { id: current.id } })
          : router.push({ pathname: '/pagamento/novo', params: { tipo: kind } })
      }>
      <View style={styles.quickHead}>
        <IconBadge icon={meta.icon} tone={meta.tone} size={42} />
        {current ? (
          <Pressable
            hitSlop={10}
            onPress={() => router.push({ pathname: '/pagamento/novo', params: { tipo: kind } })}
            style={styles.quickAdd}>
            <Icon name="plus" size={16} color={C.textDim} />
          </Pressable>
        ) : null}
      </View>
      <T v="h3" style={{ marginTop: S.md }}>
        {meta.label}
      </T>
      {current && pr ? (
        <>
          <T v="label" style={{ fontFamily: F.display, marginTop: 2 }}>
            {fmtMoney(current.total)}
          </T>
          <T v="caption" color={done ? C.green : C.textDim} numberOfLines={1}>
            {done ? 'Quitado' : pr.next ? `${pr.paidCount}/${current.installments} · próx. ${fmtDateShort(pr.next.dueDate)}` : ''}
          </T>
          <View style={{ marginTop: S.sm }}>
            <ProgressBar value={pr.paidCount / current.installments} color={done ? C.green : C.accent} height={5} />
          </View>
        </>
      ) : (
        <>
          <T v="caption" style={{ marginTop: 2 }}>
            Não cadastrado
          </T>
          <View style={styles.quickCta}>
            <Icon name="plus" size={15} color={C.accent} />
            <T v="label" color={C.accent} style={{ fontSize: 13 }}>
              Adicionar
            </T>
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', gap: S.md },
  quickCard: { flex: 1, padding: S.lg },
  quickHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  quickAdd: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: S.md },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.md, padding: S.md + 2 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  next: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: S.md,
    paddingTop: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.borderStrong,
  },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
