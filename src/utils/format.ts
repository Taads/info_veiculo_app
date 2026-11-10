// Formatação no padrão brasileiro, sem depender do Intl.

function groupThousands(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function fmtNumber(n: number, decimals = 0): string {
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [i, d] = fixed.split('.');
  const out = groupThousands(i) + (d ? `,${d}` : '');
  return neg ? `-${out}` : out;
}

export function fmtMoney(n: number): string {
  return `R$ ${fmtNumber(n, 2)}`;
}

/** R$ sem centavos quando é valor redondo grande, para cards. */
export function fmtMoneyCompact(n: number): string {
  if (Math.abs(n) >= 10000) return `R$ ${fmtNumber(n, 0)}`;
  return fmtMoney(n);
}

export function fmtKm(n: number): string {
  return `${fmtNumber(Math.round(n))} km`;
}

export function fmtPct(n: number, decimals = 2): string {
  return `${fmtNumber(n, decimals)}%`;
}

/** Só os dígitos de uma string. */
export function digits(s: string): string {
  return s.replace(/\D/g, '');
}

/** Converte "2,49" ou "2.49" em número. */
export function parseDecimal(s: string): number {
  const clean = s.replace(/[^\d,.-]/g, '').replace(/\.(?=.*[.,])/g, '').replace(',', '.');
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
