import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { levelColors, Ring } from '@/components/ring';
import { Screen } from '@/components/screen';
import { Button, Card, Icon, IconButton, Pill, Row, SectionHeader, T } from '@/components/ui';
import { avgKmPerDay, levelTone, nextRevision, oilStatus, revisionStatus } from '@/lib/insights';
import { useActiveVehicle, useStore } from '@/store';
import { C, F, S } from '@/theme';
import { fmtDate, fmtDateShort } from '@/utils/dates';
import { fmtKm, fmtMoney, fmtNumber } from '@/utils/format';

export default function Maintenance() {
  const v = useActiveVehicle();
  const kmLogs = useStore((s) => s.kmLogs);
  const allRevisions = useStore((s) => s.revisions);
  const allServices = useStore((s) => s.services);

  const data = useMemo(() => {
    if (!v) return null;
    const avg = avgKmPerDay(v, kmLogs).value;
    const revisions = allRevisions
      .filter((r) => r.vehicleId === v.id)
      .sort((a, b) => a.dueKm - b.dueKm || a.dueDate.localeCompare(b.dueDate));
    const services = allServices
      .filter((x) => x.vehicleId === v.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const spent = services.reduce((a, x) => a + (x.cost || 0), 0);
    return { avg, oil: oilStatus(v, avg), revisions, services, spent, next: nextRevision(v, allRevisions) };
  }, [v, kmLogs, allRevisions, allServices]);

  if (!v || !data) return null;
  const { avg, oil, revisions, services, spent, next } = data;

  return (
    <Screen
      tabs
      overline={`${v.brand} ${v.model} ${v.year}`}
      title="Manutenção"
      subtitle="Troca de óleo, revisões e o histórico do carro.">
      {/* Óleo */}
      <Card style={{ gap: S.xl }}>
        <View style={styles.oilTop}>
          <Ring value={oil.progress} size={128} stroke={11} colors={levelColors(oil.level)}>
            <T v="number">{Math.round(oil.progress * 100)}%</T>
            <T v="caption" style={{ fontSize: 11 }}>
              usado
            </T>
          </Ring>
          <View style={{ flex: 1, gap: 6 }}>
            <Pill
              icon="oil"
              label={oil.level === 'ok' ? 'Óleo em dia' : oil.level === 'soon' ? 'Troca em breve' : 'Troca vencida'}
              tone={levelTone(oil.level)}
            />
            <T v="h2" style={{ marginTop: 4 }}>
              {oil.kmLeft > 0 ? `${fmtNumber(oil.kmLeft)} km` : `+${fmtNumber(-oil.kmLeft)} km`}
            </T>
            <T v="caption">{oil.kmLeft > 0 ? 'até a próxima troca' : 'além do limite'}</T>
            <T v="caption" color={C.textDim}>
              Previsão: <T v="caption" color={C.text}>{fmtDateShort(oil.predictedDate)}</T> · por {oil.reason}
            </T>
          </View>
        </View>
        <View style={styles.facts}>
          <Fact label="Última troca" value={fmtDate(v.oil.lastDate)} sub={fmtKm(v.oil.lastKm)} />
          <Fact label="Intervalo" value={fmtKm(v.oil.intervalKm)} sub={`ou ${v.oil.intervalMonths} meses`} />
          <Fact label="Óleo" value={v.oil.oilType || '—'} sub={`~${fmtNumber(avg)} km/dia`} />
        </View>
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <Button
            style={{ flex: 1 }}
            size="md"
            label="Registrar troca"
            icon="check-circle-outline"
            onPress={() => router.push({ pathname: '/oleo', params: { modo: 'troca' } })}
          />
          <Button style={{ flex: 1 }} size="md" variant="secondary" label="Ajustar" icon="tune-variant" onPress={() => router.push('/oleo')} />
        </View>
      </Card>

      {/* Revisões */}
      <SectionHeader title="Plano de revisões" action="Nova" onAction={() => router.push({ pathname: '/revisao/[id]', params: { id: 'nova' } })} />
      <Card style={{ paddingVertical: S.sm }}>
        {revisions.length === 0 ? (
          <T v="caption" style={{ paddingVertical: S.lg, textAlign: 'center' }}>
            Nenhuma revisão cadastrada.
          </T>
        ) : null}
        {revisions.map((r, i) => {
          const isNext = next?.id === r.id;
          const st = !r.done ? revisionStatus(v, r, avg) : null;
          const last = i === revisions.length - 1;
          return (
            <Pressable
              key={r.id}
              onPress={() => router.push({ pathname: '/revisao/[id]', params: { id: r.id } })}
              style={({ pressed }) => [styles.tl, { opacity: pressed ? 0.6 : 1 }]}>
              <View style={styles.tlRail}>
                <View
                  style={[
                    styles.tlDot,
                    r.done && { backgroundColor: C.green, borderColor: C.green },
                    isNext && { borderColor: C.accent, backgroundColor: C.accentSoft },
                  ]}>
                  {r.done ? <Icon name="check" size={13} color="#06281B" /> : null}
                  {isNext ? <View style={styles.tlDotInner} /> : null}
                </View>
                {!last ? <View style={[styles.tlLine, r.done && { backgroundColor: 'rgba(61,220,151,0.4)' }]} /> : null}
              </View>
              <View style={[styles.tlBody, !last && styles.tlBodyBorder]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <T v="label" color={r.done ? C.textDim : C.text}>
                    {r.title}
                  </T>
                  <T v="caption">
                    {r.done
                      ? `Feita em ${fmtDate(r.doneDate!)}${r.cost ? ` · ${fmtMoney(r.cost)}` : ''}`
                      : `Até ${fmtKm(r.dueKm)} ou ${fmtDate(r.dueDate)}`}
                  </T>
                </View>
                {st && (isNext || st.level !== 'ok') ? (
                  <Pill
                    label={st.level === 'due' ? 'Vencida' : isNext ? `~${fmtDateShort(st.predictedDate)}` : 'Em breve'}
                    tone={st.level === 'ok' ? 'accent' : levelTone(st.level)}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </Card>

      {/* Histórico */}
      <SectionHeader title="Histórico de serviços" />
      {services.length === 0 ? (
        <Card style={styles.emptyHist}>
          <Icon name="history" size={22} color={C.textMute} />
          <T v="caption" style={{ flex: 1 }}>
            Quando você registrar uma troca de óleo ou concluir uma revisão, ela aparece aqui com o valor gasto.
          </T>
        </Card>
      ) : (
        <Card style={{ paddingVertical: S.xs }}>
          <View style={styles.spent}>
            <T v="caption">Total gasto em manutenção</T>
            <T v="h3" style={{ fontFamily: F.display }}>
              {fmtMoney(spent)}
            </T>
          </View>
          {services.map((x, i) => (
            <Row
              key={x.id}
              icon={x.kind === 'oil' ? 'oil' : 'wrench'}
              tone={x.kind === 'oil' ? 'accent' : 'blue'}
              title={x.title}
              subtitle={`${fmtDate(x.date)} · ${fmtKm(x.km)}${x.shop ? ` · ${x.shop}` : ''}`}
              last={i === services.length - 1}
              right={
                <T v="label" style={{ fontFamily: F.display }}>
                  {x.cost ? fmtMoney(x.cost) : '—'}
                </T>
              }
            />
          ))}
        </Card>
      )}
      <View style={{ alignItems: 'center', marginTop: S.xl }}>
        <IconButton icon="car-cog" onPress={() => router.push({ pathname: '/carro', params: { id: v.id } })} />
        <T v="caption" style={{ marginTop: 6 }}>
          Intervalos do carro
        </T>
      </View>
    </Screen>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <T v="caption" style={{ fontSize: 11.5 }}>
        {label}
      </T>
      <T v="label" numberOfLines={1}>
        {value}
      </T>
      <T v="caption" color={C.textMute} style={{ fontSize: 11.5 }} numberOfLines={1}>
        {sub}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  oilTop: { flexDirection: 'row', alignItems: 'center', gap: S.xl },
  facts: {
    flexDirection: 'row',
    gap: S.md,
    paddingTop: S.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.borderStrong,
  },
  tl: { flexDirection: 'row', gap: S.md },
  tlRail: { width: 22, alignItems: 'center', paddingTop: 18 },
  tlDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.surface3,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  tlLine: { flex: 1, width: 2, backgroundColor: C.surface3, marginTop: 4 },
  tlBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: S.lg },
  tlBodyBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  emptyHist: { flexDirection: 'row', gap: S.md, alignItems: 'center' },
  spent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.borderStrong,
  },
});
