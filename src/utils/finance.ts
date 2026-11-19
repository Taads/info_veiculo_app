// Cálculo de parcelamento (Tabela Price) para IPVA, seguro e afins.

export type PlanInput = {
  /** Valor total cobrado (sem desconto). */
  value: number;
  /** Juros ao mês, em %. 0 = sem juros. */
  interestPct: number;
  /** Parcelas sem juros até N vezes. */
  freeUntil: number;
  /** Desconto para pagamento à vista (1x), em %. */
  discountPct: number;
};

export type Plan = {
  n: number;
  parcel: number;
  total: number;
  /** total - valor. Negativo = economia, positivo = juros. */
  diff: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function planFor(input: PlanInput, n: number): Plan {
  const { value, interestPct, freeUntil, discountPct } = input;
  if (value <= 0) return { n, parcel: 0, total: 0, diff: 0 };

  if (n === 1) {
    const total = round2(value * (1 - Math.max(0, discountPct) / 100));
    return { n, parcel: total, total, diff: round2(total - value) };
  }

  const i = Math.max(0, interestPct) / 100;
  if (i === 0 || n <= freeUntil) {
    // Sem juros o total é exatamente o valor; os centavos que sobram vão
    // para a 1ª parcela ao salvar (splitParcels). Ex.: 2.950 em 3x ≠ 2.949,99.
    return { n, parcel: round2(value / n), total: round2(value), diff: 0 };
  }
  const parcel = round2((value * i) / (1 - Math.pow(1 + i, -n)));
  const total = round2(parcel * n);
  return { n, parcel, total, diff: round2(total - value) };
}

export function allPlans(input: PlanInput, max = 12): Plan[] {
  return Array.from({ length: max }, (_, k) => planFor(input, k + 1));
}

/** Divide o total em parcelas, jogando a diferença de centavos na primeira. */
export function splitParcels(total: number, n: number): number[] {
  const base = Math.floor((total / n) * 100) / 100;
  const parts = Array.from({ length: n }, () => base);
  parts[0] = round2(total - base * (n - 1));
  return parts;
}
