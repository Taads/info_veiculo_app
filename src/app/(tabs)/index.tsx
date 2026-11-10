import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Plate } from '@/components/plate';
import { levelColors, Ring } from '@/components/ring';
import { Screen } from '@/components/screen';
import { Card, Icon, IconBadge, IconButton, Pill, Row, SectionHeader, T } from '@/components/ui';
import { WeekChart } from '@/components/week-chart';
import {
  avgKmPerDay,
  kindMeta,
  lastDaysKm,
  levelTone,
  monthTotals,
  nextRevision,
  oilStatus,
  revisionStatus,
  upcomingParcels,
} from '@/lib/insights';
import { useActiveVehicle, useStore } from '@/store';
import { C, F, gradients, R, S } from '@/theme';
import { fmtDateShort, greeting, monthShort, relativeDays, today } from '@/utils/dates';
import { fmtKm, fmtMoney, fmtNumber } from '@/utils/format';

export default function Home() {
  const v = useActiveVehicle();
  const vehicles = useStore((s) => s.vehicles);
  const kmLogs = useStore((s) => s.kmLogs);
  const revisions = useStore((s) => s.revisions);
  const payments = useStore((s) => s.payments);
  const setActive = useStore((s) => s.setActiveVehicle);

  const data = useMemo(() => {
    if (!v) return null;
    const avg = avgKmPerDay(v, kmLogs);
    const oil = oilStatus(v, avg.value);
    const rev = nextRevision(v, revisions);
    const revSt = rev ? revisionStatus(v, rev, avg.value) : null;
    const upcoming = upcomingParcels(payments, v.id);
    const month = monthTotals(payments, v.id, today());
    const week = lastDaysKm(kmLogs, v.id, 7);
    const weekTotal = week.reduce((a, d) => a + d.km, 0);
    return { avg, oil, rev, revSt, upcoming, month, week, weekTotal };
  }, [v, kmLogs, revisions, payments]);

  if (!v || !data) return null;
  const { avg, oil, rev, revSt, upcoming, month, week, weekTotal } = data;
  const name = v.nickname || `${v.brand} ${v.model}`;

  const alerts: { icon: string; tone: 'red' | 'yellow'; title: string; text: string; go: () => void }[] = [];
  if (oil.level !== 'ok')
    alerts.push({
      icon: 'oil',
      tone: oil.level === 'due' ? 'red' : 'yellow',
      title: oil.level === 'due' ? 'Troca de óleo vencida' : 'Troca de óleo chegando',
      text:
        oil.kmLeft <= 0
          ? `Passou ${fmtKm(-oil.kmLeft)} do limite`
          : oil.daysByTime <= 0
            ? 'Prazo em meses venceu'
            : `Faltam ${fmtKm(oil.kmLeft)} · previsão ${fmtDateShort(oil.predictedDate)}`,
      go: () => router.push('/oleo'),
    });
  if (rev && revSt && revSt.level !== 'ok')
    alerts.push({
      icon: 'wrench',
      tone: revSt.level === 'due' ? 'red' : 'yellow',
      title: revSt.level === 'due' ? `${rev.title} vencida` : `${rev.title} se aproximando`,
      text: `Previsão ${fmtDateShort(revSt.predictedDate)}`,
      go: () => router.push({ pathname: '/revisao/[id]', params: { id: rev.id } }),
    });
  for (const p of upcoming.filter((x) => x.level !== 'ok').slice(0, 2))
    alerts.push({
      icon: kindMeta[p.payment.kind].icon,
      tone: p.level === 'due' ? 'red' : 'yellow',
      title: `${p.payment.title} ${p.days < 0 ? 'atrasado' : 'vence ' + relativeDays(p.days)}`,
      text: `${p.payment.installments > 1 ? `Parcela ${p.n}/${p.payment.installments} · ` : ''}${fmtMoney(p.value)}`,
      go: () => router.push({ pathname: '/pagamento/[id]', params: { id: p.payment.id } }),
    });

  const cycleVehicle = () => {
    const i = vehicles.findIndex((x) => x.id === v.id);
    setActive(vehicles[(i + 1) % vehicles.length].id);
  };

  return (
    <Screen tabs>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <T v="caption">{greeting()} 👋</T>
          <Pressable disabled={vehicles.length < 2} onPress={cycleVehicle} style={styles.nameRow}>
            <T v="title" numberOfLines={1} style={{ flexShrink: 1 }}>
              {name}
            </T>
            {vehicles.length > 1 ? <Icon name="swap-horizontal" size={20} color={C.textMute} /> : null}
          </Pressable>
        </View>
        <IconButton icon="cog-outline" onPress={() => router.push('/garagem')} />
      </View>

      {/* Hodômetro */}
      <View style={styles.hero}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(255,122,26,0.22)', 'rgba(255,122,26,0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.3, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroCar} pointerEvents="none">
          <Icon name="car-sports" size={190} color="rgba(255,255,255,0.045)" />
        </View>
        <View style={styles.heroTop}>
          <View>
            <T v="overline" color={C.textDim}>
              Hodômetro
            </T>
            <View style={styles.odoRow}>
              <T v="display" style={{ fontSize: 46 }}>
                {fmtNumber(v.km)}
              </T>
              <T v="h3" color={C.textDim} style={{ marginBottom: 9 }}>
                km
              </T>
            </View>
          </View>
          <Plate plate={v.plate} scale={0.85} />
        </View>
        <View style={styles.heroStats}>
          <HeroStat label="Média/dia" value={`${fmtNumber(avg.value, avg.value < 10 ? 1 : 0)} km`} hint={avg.estimated ? 'estimada' : '30 dias'} />
          <View style={styles.heroDivider} />
          <HeroStat label="Esta semana" value={fmtKm(weekTotal)} />
          <View style={styles.heroDivider} />
          <HeroStat label={`Pagar em ${monthShort(today())}`} value={fmtMoney(month.due).replace(',00', '')} />
        </View>
        <Pressable
          onPress={() => router.push('/km')}
          style={({ pressed }) => [styles.heroBtn, { opacity: pressed ? 0.85 : 1 }]}>
          <Icon name="road-variant" size={18} color={C.accent} />
          <T v="label" color={C.text}>
            Registrar km de hoje
          </T>
          <Icon name="arrow-right" size={18} color={C.textDim} />
        </Pressable>
      </View>

      {/* Alertas */}
      {alerts.length > 0 ? (
        <View style={{ gap: S.sm, marginTop: S.lg }}>
          {alerts.map((a, i) => (
            <Pressable key={i} onPress={a.go} style={({ pressed }) => [styles.alert, { opacity: pressed ? 0.85 : 1 }, a.tone === 'red' ? styles.alertRed : styles.alertYellow]}>
              <IconBadge icon={a.icon} tone={a.tone} size={38} />
              <View style={{ flex: 1 }}>
                <T v="label" numberOfLines={1}>
                  {a.title}
                </T>
                <T v="caption" numberOfLines={1}>
                  {a.text}
                </T>
              </View>
              <Icon name="chevron-right" size={20} color={C.textMute} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Manutenção */}
      <SectionHeader title="Manutenção" action="Ver tudo" onAction={() => router.push('/manutencao')} />
      <View style={styles.grid}>
        <Card style={styles.gridCard} onPress={() => router.push('/oleo')}>
          <View style={styles.gridHead}>
            <T v="label">Óleo</T>
            <Pill label={oil.level === 'ok' ? 'Em dia' : oil.level === 'soon' ? 'Em breve' : 'Vencido'} tone={levelTone(oil.level)} />
          </View>
          <View style={styles.ringWrap}>
            <Ring value={oil.progress} size={112} stroke={10} colors={levelColors(oil.level)}>
              <T v="number" style={{ fontSize: 20 }}>
                {fmtNumber(Math.max(0, oil.kmLeft))}
              </T>
              <T v="caption" style={{ fontSize: 11 }}>
                km restantes
              </T>
            </Ring>
          </View>
          <T v="caption" style={{ textAlign: 'center' }}>
            Previsão {fmtDateShort(oil.predictedDate)}
          </T>
        </Card>

        <Card
          style={styles.gridCard}
          onPress={() => (rev ? router.push({ pathname: '/revisao/[id]', params: { id: rev.id } }) : router.push('/manutencao'))}>
          <View style={styles.gridHead}>
            <T v="label">Revisão</T>
            {revSt ? (
              <Pill label={revSt.level === 'ok' ? 'Em dia' : revSt.level === 'soon' ? 'Em breve' : 'Vencida'} tone={levelTone(revSt.level)} />
            ) : null}
          </View>
          <View style={styles.ringWrap}>
            <Ring value={revSt?.progress ?? 0} size={112} stroke={10} colors={levelColors(revSt?.level ?? 'ok')}>
              <T v="number" style={{ fontSize: 20 }}>
                {revSt ? Math.max(0, revSt.daysLeft) : '—'}
              </T>
              <T v="caption" style={{ fontSize: 11 }}>
                {revSt ? 'dias' : 'sem revisão'}
              </T>
            </Ring>
          </View>
          <T v="caption" style={{ textAlign: 'center' }} numberOfLines={1}>
            {rev ? `${fmtNumber(rev.dueKm)} km` : 'Adicionar'}
          </T>
        </Card>
      </View>

      {/* Km da semana */}
      <SectionHeader title="Km da semana" action="Registrar" onAction={() => router.push('/km')} />
      <Card>
        <WeekChart days={week} />
      </Card>

      {/* Pagamentos */}
      <SectionHeader title="Próximos pagamentos" action="Ver todos" onAction={() => router.push('/pagamentos')} />
      {upcoming.length === 0 ? (
        <View style={styles.grid}>
          {(['ipva', 'seguro'] as const).map((k) => (
            <Card
              key={k}
              style={[styles.gridCard, { gap: S.sm }]}
              onPress={() => router.push({ pathname: '/pagamento/novo', params: { tipo: k } })}>
              <IconBadge icon={kindMeta[k].icon} tone={kindMeta[k].tone} size={42} />
              <T v="label" style={{ marginTop: S.xs }}>
                {kindMeta[k].label}
              </T>
              <T v="caption">Simular até 12x</T>
              <View style={styles.addRow}>
                <Icon name="plus" size={15} color={C.accent} />
                <T v="label" color={C.accent} style={{ fontSize: 13 }}>
                  Adicionar
                </T>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Card style={{ paddingVertical: S.xs }}>
          {upcoming.slice(0, 4).map((p, i, arr) => {
            const meta = kindMeta[p.payment.kind];
            return (
              <Row
                key={`${p.payment.id}-${p.n}`}
                icon={meta.icon}
                tone={meta.tone}
                title={p.payment.title}
                subtitle={`${p.payment.installments > 1 ? `${p.n}/${p.payment.installments} · ` : ''}${fmtDateShort(p.dueDate)} · ${relativeDays(p.days)}`}
                last={i === arr.length - 1}
                onPress={() => router.push({ pathname: '/pagamento/[id]', params: { id: p.payment.id } })}
                right={
                  <T v="label" style={{ fontFamily: F.display }} color={p.level === 'due' ? C.red : C.text}>
                    {fmtMoney(p.value)}
                  </T>
                }
              />
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <T v="caption" style={{ fontSize: 11.5 }} numberOfLines={1}>
        {label}
      </T>
      <T v="h3" numberOfLines={1} style={{ fontSize: 15 }}>
        {value}
      </T>
      {hint ? (
        <T v="caption" color={C.textMute} style={{ fontSize: 10.5 }}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginBottom: S.xl },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hero: {
    borderRadius: R.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borderStrong,
    padding: S.xl,
  },
  heroCar: { position: 'absolute', right: -34, bottom: 34 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  odoRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4 },
  heroStats: {
    flexDirection: 'row',
    marginTop: S.xl,
    paddingTop: S.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.borderStrong,
    gap: S.md,
  },
  heroDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.borderStrong },
  heroBtn: {
    marginTop: S.xl,
    height: 50,
    borderRadius: R.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: C.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    gap: 10,
    justifyContent: 'space-between',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.md,
    borderWidth: 1,
  },
  alertRed: { backgroundColor: 'rgba(255,93,93,0.07)', borderColor: 'rgba(255,93,93,0.22)' },
  alertYellow: { backgroundColor: 'rgba(255,193,69,0.06)', borderColor: 'rgba(255,193,69,0.2)' },
  grid: { flexDirection: 'row', gap: S.md },
  gridCard: { flex: 1, gap: S.md, padding: S.lg },
  gridHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  ringWrap: { alignItems: 'center', paddingVertical: S.xs },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: S.xs },
});
