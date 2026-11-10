// Regras do app: média de km, previsão de troca de óleo, revisões e vencimentos.

import type { KmLog, Parcel, Payment, Revision, Vehicle } from '@/store';
import {
  addDays,
  addMonths,
  daysBetween,
  parseDate,
  toDateStr,
  today,
  type DateStr,
} from '@/utils/dates';

export type Level = 'ok' | 'soon' | 'due';

export function avgKmPerDay(v: Vehicle, logs: KmLog[]): { value: number; estimated: boolean } {
  const now = today();
  const cutoff = addDays(now, -30);
  const recent = logs.filter(
    (l) => l.vehicleId === v.id && l.delta > 0 && parseDate(l.date) >= cutoff,
  );
  if (recent.length < 3) return { value: v.fallbackAvgKm, estimated: true };
  const first = recent.reduce((min, l) => (l.date < min ? l.date : min), recent[0].date);
  const days = Math.max(7, daysBetween(parseDate(first), now) + 1);
  const sum = recent.reduce((acc, l) => acc + l.delta, 0);
  return { value: sum / days, estimated: false };
}

export type DueInfo = {
  kmLeft: number;
  daysByTime: number;
  daysByKm: number;
  daysLeft: number;
  predictedDate: Date;
  reason: 'km' | 'tempo';
  progress: number;
  level: Level;
};

function dueInfo(opts: {
  kmLeft: number;
  kmTotal: number;
  limitDate: Date;
  startDate: Date;
  avg: number;
  soonKm: number;
  soonDays: number;
}): DueInfo {
  const now = today();
  const { kmLeft, kmTotal, limitDate, startDate, avg, soonKm, soonDays } = opts;
  const daysByTime = daysBetween(now, limitDate);
  const daysByKm = avg > 0 ? Math.floor(kmLeft / avg) : 9999;
  const daysLeft = Math.min(daysByTime, daysByKm);
  const totalDays = Math.max(1, daysBetween(startDate, limitDate));
  const elapsed = daysBetween(startDate, now);
  const progress = Math.max(
    0,
    Math.min(1, Math.max((kmTotal - kmLeft) / Math.max(1, kmTotal), elapsed / totalDays)),
  );
  const level: Level =
    kmLeft <= 0 || daysByTime <= 0
      ? 'due'
      : kmLeft <= soonKm || daysLeft <= soonDays
        ? 'soon'
        : 'ok';
  return {
    kmLeft,
    daysByTime,
    daysByKm,
    daysLeft,
    predictedDate: addDays(now, Math.max(0, daysLeft)),
    reason: daysByKm < daysByTime ? 'km' : 'tempo',
    progress,
    level,
  };
}

export function oilStatus(v: Vehicle, avg: number): DueInfo {
  const used = v.km - v.oil.lastKm;
  const start = parseDate(v.oil.lastDate);
  return dueInfo({
    kmLeft: v.oil.intervalKm - used,
    kmTotal: v.oil.intervalKm,
    startDate: start,
    limitDate: addMonths(start, v.oil.intervalMonths),
    avg,
    soonKm: Math.min(1000, v.oil.intervalKm * 0.1),
    soonDays: 21,
  });
}

export function nextRevision(v: Vehicle, revisions: Revision[]): Revision | undefined {
  return revisions
    .filter((r) => r.vehicleId === v.id && !r.done)
    .sort((a, b) => a.dueKm - b.dueKm || a.dueDate.localeCompare(b.dueDate))[0];
}

export function revisionStatus(v: Vehicle, r: Revision, avg: number): DueInfo {
  const limit = parseDate(r.dueDate);
  const start = addMonths(limit, -v.revisionMonths);
  return dueInfo({
    kmLeft: r.dueKm - v.km,
    kmTotal: v.revisionKm,
    startDate: start,
    limitDate: limit,
    avg,
    soonKm: 1000,
    soonDays: 30,
  });
}

export type UpcomingParcel = Parcel & { payment: Payment; days: number; level: Level };

export function upcomingParcels(payments: Payment[], vehicleId?: string): UpcomingParcel[] {
  const now = today();
  const out: UpcomingParcel[] = [];
  for (const p of payments) {
    if (vehicleId && p.vehicleId !== vehicleId) continue;
    for (const q of p.parcels) {
      if (q.paid) continue;
      const days = daysBetween(now, parseDate(q.dueDate));
      out.push({ ...q, payment: p, days, level: days < 0 ? 'due' : days <= 7 ? 'soon' : 'ok' });
    }
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function paymentProgress(p: Payment) {
  const paid = p.parcels.filter((q) => q.paid);
  const paidValue = paid.reduce((a, q) => a + q.value, 0);
  const next = p.parcels.find((q) => !q.paid);
  return { paidCount: paid.length, paidValue, remaining: p.total - paidValue, next };
}

export function monthTotals(payments: Payment[], vehicleId: string, ref: Date) {
  const key = toDateStr(ref).slice(0, 7);
  let due = 0;
  let paid = 0;
  for (const p of payments) {
    if (p.vehicleId !== vehicleId) continue;
    for (const q of p.parcels) {
      if (q.dueDate.slice(0, 7) !== key) continue;
      if (q.paid) paid += q.value;
      else due += q.value;
    }
  }
  return { due, paid };
}

/** Km por dia nos últimos N dias (mais antigo primeiro). */
export function lastDaysKm(logs: KmLog[], vehicleId: string, n = 7) {
  const now = today();
  const days: { date: DateStr; km: number; d: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(now, -i);
    days.push({ date: toDateStr(d), km: 0, d });
  }
  const idx = new Map(days.map((x, i) => [x.date, i]));
  for (const l of logs) {
    if (l.vehicleId !== vehicleId || l.delta <= 0) continue;
    const i = idx.get(l.date);
    if (i != null) days[i].km += l.delta;
  }
  return days;
}

export const levelTone = (l: Level) => (l === 'due' ? 'red' : l === 'soon' ? 'yellow' : 'green');

export const kindMeta: Record<
  Payment['kind'],
  { label: string; icon: string; tone: 'accent' | 'blue' | 'violet' | 'green' }
> = {
  ipva: { label: 'IPVA', icon: 'bank-outline', tone: 'accent' },
  seguro: { label: 'Seguro', icon: 'shield-car', tone: 'blue' },
  licenciamento: { label: 'Licenciamento', icon: 'card-account-details-outline', tone: 'violet' },
  outro: { label: 'Outro', icon: 'receipt-text-outline', tone: 'green' },
};
