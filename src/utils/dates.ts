// Datas guardadas como 'AAAA-MM-DD'. Convertidas para meio-dia local para evitar
// problemas de fuso horário.

export type DateStr = string;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function toDateStr(d: Date): DateStr {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function today(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

export function todayStr(): DateStr {
  return toDateStr(today());
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, last));
  return r;
}

/** Dias inteiros de `a` até `b` (positivo se b está no futuro). */
export function daysBetween(a: Date, b: Date): number {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((B - A) / 86400000);
}

export function fmtDate(s: DateStr | Date): string {
  const d = typeof s === 'string' ? parseDate(s) : s;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function fmtDateShort(s: DateStr | Date): string {
  const d = typeof s === 'string' ? parseDate(s) : s;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtDateLong(s: DateStr | Date): string {
  const d = typeof s === 'string' ? parseDate(s) : s;
  return `${d.getDate()} de ${MONTHS_FULL[d.getMonth()]} de ${d.getFullYear()}`;
}

export function fmtMonthYear(d: Date): string {
  const m = MONTHS_FULL[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}

export function weekdayShort(d: Date): string {
  return WEEKDAYS[d.getDay()];
}

export function monthShort(d: Date): string {
  return MONTHS[d.getMonth()];
}

/** "hoje", "amanhã", "em 5 dias", "há 3 dias" */
export function relativeDays(n: number): string {
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  if (n > 1) {
    if (n >= 60) return `em ${Math.round(n / 30)} meses`;
    return `em ${n} dias`;
  }
  const a = Math.abs(n);
  if (a >= 60) return `há ${Math.round(a / 30)} meses`;
  return `há ${a} dias`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
