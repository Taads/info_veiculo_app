// Testes das regras do GestCar. Rodar com: npm test

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  avgKmPerDay,
  lastDaysKm,
  monthTotals,
  nextRevision,
  oilStatus,
  paymentProgress,
  revisionStatus,
  upcomingParcels,
} from '@/lib/insights';
import { useStore, type Vehicle, type VehicleInput } from '@/store';
import { addDays, addMonths, daysBetween, fmtDate, parseDate, relativeDays, toDateStr, today, todayStr } from '@/utils/dates';
import { allPlans, planFor, splitParcels } from '@/utils/finance';
import { digits, fmtKm, fmtMoney, fmtNumber, parseDecimal } from '@/utils/format';

import { importDocFile } from '@/lib/doc-files';

import { __addFile, copied, deleted, written } from './support/stub-file-system.mjs';

const ago = (n: number) => toDateStr(addDays(today(), -n));

function vehicleInput(over: Partial<VehicleInput> = {}): VehicleInput {
  return {
    brand: 'Chevrolet',
    model: 'Onix',
    year: 2027,
    plate: 'URU9D58',
    nickname: '',
    km: 5000,
    fallbackAvgKm: 30,
    revisionKm: 10000,
    revisionMonths: 12,
    oil: { intervalKm: 10000, intervalMonths: 12, lastKm: 5000, lastDate: todayStr(), oilType: '' },
    ...over,
  };
}

function resetStore() {
  useStore.setState({
    vehicles: [],
    activeVehicleId: null,
    kmLogs: [],
    services: [],
    revisions: [],
    payments: [],
    docs: [],
    settings: { notifications: true, dailyKm: true, dailyHour: 21, daysBefore: [7, 1, 0] },
  });
}

const S = () => useStore.getState();
const V = (id: string) => S().vehicles.find((v) => v.id === id) as Vehicle;

// ---------------------------------------------------------------- formatação
describe('formatação brasileira', () => {
  it('formata dinheiro, km e números', () => {
    assert.equal(fmtMoney(1234.5), 'R$ 1.234,50');
    assert.equal(fmtMoney(0), 'R$ 0,00');
    assert.equal(fmtMoney(-12.3), 'R$ -12,30');
    assert.equal(fmtKm(12345.6), '12.346 km');
    assert.equal(fmtNumber(1000000), '1.000.000');
    assert.equal(fmtNumber(2.5, 1), '2,5');
  });
  it('lê decimais com vírgula ou ponto', () => {
    assert.equal(parseDecimal('2,49'), 2.49);
    assert.equal(parseDecimal('2.49'), 2.49);
    assert.equal(parseDecimal(''), 0);
    assert.equal(parseDecimal('abc'), 0);
    assert.equal(digits('R$ 1.234,56'), '123456');
  });
});

// ---------------------------------------------------------------- datas
describe('datas', () => {
  it('soma meses sem estourar o fim do mês', () => {
    assert.equal(toDateStr(addMonths(parseDate('2027-01-31'), 1)), '2027-02-28');
    assert.equal(toDateStr(addMonths(parseDate('2028-01-31'), 1)), '2028-02-29');
    assert.equal(toDateStr(addMonths(parseDate('2026-11-17'), 12)), '2027-11-17');
    assert.equal(toDateStr(addMonths(parseDate('2026-12-10'), 1)), '2027-01-10');
  });
  it('conta dias e descreve em português', () => {
    assert.equal(daysBetween(parseDate('2026-11-17'), parseDate('2026-11-27')), 10);
    assert.equal(daysBetween(parseDate('2026-11-17'), parseDate('2026-11-10')), -7);
    assert.equal(relativeDays(0), 'hoje');
    assert.equal(relativeDays(1), 'amanhã');
    assert.equal(relativeDays(-1), 'ontem');
    assert.equal(relativeDays(5), 'em 5 dias');
    assert.equal(relativeDays(-3), 'há 3 dias');
    assert.equal(fmtDate('2027-03-05'), '05/03/2027');
  });
  it('ida e volta de string de data é estável', () => {
    for (const s of ['2026-01-01', '2026-02-28', '2026-10-18', '2027-12-31']) {
      assert.equal(toDateStr(parseDate(s)), s);
    }
  });
});

// ---------------------------------------------------------------- parcelamento
describe('simulação de parcelamento (IPVA/seguro)', () => {
  const base = { value: 3000, interestPct: 0, freeUntil: 1, discountPct: 0 };

  it('sem juros divide igual', () => {
    const p = planFor(base, 10);
    assert.equal(p.parcel, 300);
    assert.equal(p.total, 3000);
    assert.equal(p.diff, 0);
  });
  it('à vista aplica o desconto', () => {
    const p = planFor({ ...base, discountPct: 3 }, 1);
    assert.equal(p.total, 2910);
    assert.equal(p.diff, -90);
  });
  it('desconto não vale para parcelado', () => {
    assert.equal(planFor({ ...base, discountPct: 3 }, 2).total, 3000);
  });
  it('juros pela Tabela Price', () => {
    const p = planFor({ ...base, interestPct: 2 }, 10);
    assert.ok(Math.abs(p.parcel - 333.98) < 0.02, `parcela ${p.parcel}`);
    assert.ok(p.diff > 300 && p.diff < 350);
  });
  it('"sem juros até Nx" respeitado', () => {
    const input = { ...base, interestPct: 2, freeUntil: 3 };
    assert.equal(planFor(input, 3).total, 3000);
    assert.ok(planFor(input, 4).total > 3000);
  });
  it('sem juros o total é exato, sem "economia" de centavos', () => {
    for (const n of [3, 6, 7, 9, 11]) {
      const p = planFor({ value: 2950, interestPct: 0, freeUntil: 1, discountPct: 0 }, n);
      assert.equal(p.total, 2950, `${n}x`);
      assert.equal(p.diff, 0, `${n}x`);
    }
  });

  it('IPVA: até 5x sem juros, desconto só à vista', () => {
    const plans = allPlans({ value: 2950, interestPct: 0, freeUntil: 5, discountPct: 3 }, 5);
    assert.equal(plans.length, 5);
    assert.equal(plans[0].total, 2861.5);
    assert.ok(plans.slice(1).every((p) => p.total === 2950 && p.diff === 0));
  });

  it('gera 12 opções e valor zero não quebra', () => {
    assert.equal(allPlans(base).length, 12);
    assert.deepEqual(planFor({ ...base, value: 0 }, 5), { n: 5, parcel: 0, total: 0, diff: 0 });
  });
  it('parcelas somam exatamente o total (centavos)', () => {
    for (const [total, n] of [
      [1000, 3],
      [2910.01, 7],
      [3339.8, 10],
      [0.05, 2],
    ] as const) {
      const parts = splitParcels(total, n);
      const sum = Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100;
      assert.equal(sum, total, `${total} em ${n}x`);
      assert.ok(parts.every((x) => x >= 0));
    }
  });
});

// ---------------------------------------------------------------- loja: carro e km
describe('carro e km do dia', () => {
  beforeEach(resetStore);

  it('cadastrar carro cria plano de 6 revisões acima do km atual', () => {
    const id = S().addVehicle(vehicleInput({ km: 25300 }));
    const revs = S().revisions.filter((r) => r.vehicleId === id);
    assert.equal(revs.length, 6);
    assert.deepEqual(
      revs.map((r) => r.dueKm),
      [30000, 40000, 50000, 60000, 70000, 80000],
    );
    assert.equal(revs[0].title, 'Revisão 30 mil km');
    assert.equal(S().activeVehicleId, id);
  });

  it('km rodados soma no hodômetro e apagar desfaz', () => {
    const id = S().addVehicle(vehicleInput());
    S().logKm(id, { date: todayStr(), delta: 42 });
    assert.equal(V(id).km, 5042);
    S().logKm(id, { date: todayStr(), odometer: 5100 });
    assert.equal(V(id).km, 5100);
    assert.equal(S().kmLogs[0].delta, 58);
    S().removeKmLog(S().kmLogs[0].id);
    assert.equal(V(id).km, 5042);
  });

  it('ignora lançamento zerado', () => {
    const id = S().addVehicle(vehicleInput());
    S().logKm(id, { date: todayStr(), delta: 0 });
    S().logKm(id, { date: todayStr(), odometer: 5000 });
    assert.equal(S().kmLogs.length, 0);
  });

  it('média usa a estimada com poucos registros e a real depois', () => {
    const id = S().addVehicle(vehicleInput());
    assert.deepEqual(avgKmPerDay(V(id), S().kmLogs), { value: 30, estimated: true });
    for (let d = 9; d >= 0; d--) S().logKm(id, { date: ago(d), delta: 50 });
    const avg = avgKmPerDay(V(id), S().kmLogs);
    assert.equal(avg.estimated, false);
    assert.equal(avg.value, 50); // 500 km em 10 dias
  });

  it('gráfico da semana soma por dia', () => {
    const id = S().addVehicle(vehicleInput());
    S().logKm(id, { date: todayStr(), delta: 10 });
    S().logKm(id, { date: todayStr(), delta: 15 });
    S().logKm(id, { date: ago(2), delta: 40 });
    const week = lastDaysKm(S().kmLogs, id, 7);
    assert.equal(week.length, 7);
    assert.equal(week[6].km, 25);
    assert.equal(week[4].km, 40);
  });
});

// ---------------------------------------------------------------- óleo e revisão
describe('óleo e revisões', () => {
  beforeEach(resetStore);

  it('troca recém-feita fica em dia e prevê pela média', () => {
    const id = S().addVehicle(vehicleInput());
    const st = oilStatus(V(id), 50);
    assert.equal(st.kmLeft, 10000);
    assert.equal(st.level, 'ok');
    assert.equal(st.reason, 'km'); // 10.000 km / 50 = 200 dias < 12 meses
    assert.equal(st.daysLeft, 200);
  });

  it('fica "em breve" perto do limite e "vencida" depois', () => {
    const id = S().addVehicle(vehicleInput());
    S().updateVehicle(id, { km: 5000 + 9500 });
    assert.equal(oilStatus(V(id), 30).level, 'soon');
    S().updateVehicle(id, { km: 5000 + 10200 });
    const st = oilStatus(V(id), 30);
    assert.equal(st.level, 'due');
    assert.equal(st.kmLeft, -200);
  });

  it('vence pelo tempo mesmo rodando pouco', () => {
    const id = S().addVehicle(
      vehicleInput({ oil: { intervalKm: 10000, intervalMonths: 12, lastKm: 5000, lastDate: toDateStr(addMonths(today(), -13)), oilType: '' } }),
    );
    const st = oilStatus(V(id), 1);
    assert.equal(st.level, 'due');
    assert.ok(st.daysByTime < 0);
  });

  it('registrar troca zera o contador e entra no histórico', () => {
    const id = S().addVehicle(vehicleInput());
    S().updateVehicle(id, { km: 15200 });
    S().registerOilChange(id, { date: todayStr(), km: 15200, cost: 289.9, shop: 'Concessionária', notes: '' });
    assert.equal(V(id).oil.lastKm, 15200);
    assert.equal(oilStatus(V(id), 30).kmLeft, 10000);
    assert.equal(S().services[0].cost, 289.9);
  });

  it('concluir revisão passa para a próxima e desfazer volta', () => {
    const id = S().addVehicle(vehicleInput());
    const first = nextRevision(V(id), S().revisions)!;
    assert.equal(first.dueKm, 10000);
    S().completeRevision(first.id, { date: todayStr(), km: 9800, cost: 450, shop: '', notes: '' });
    assert.equal(nextRevision(V(id), S().revisions)!.dueKm, 20000);
    assert.equal(S().services.length, 1);
    S().reopenRevision(first.id);
    assert.equal(nextRevision(V(id), S().revisions)!.dueKm, 10000);
    assert.equal(S().services.length, 0);
  });

  it('status da revisão calcula km restantes', () => {
    const id = S().addVehicle(vehicleInput());
    const r = nextRevision(V(id), S().revisions)!;
    const st = revisionStatus(V(id), r, 30);
    assert.equal(st.kmLeft, 5000);
    assert.equal(st.level, 'ok');
  });
});

// ---------------------------------------------------------------- pagamentos
describe('pagamentos', () => {
  beforeEach(resetStore);

  it('cria parcelas mensais e marca como paga', () => {
    const id = S().addVehicle(vehicleInput());
    const pid = S().addPayment({
      vehicleId: id,
      kind: 'seguro',
      title: 'Seguro 2026/27',
      baseValue: 3000,
      discountPct: 0,
      interestPct: 0,
      freeUntil: 1,
      installments: 3,
      total: 3000,
      firstDueDate: '2027-01-31',
    });
    const p = S().payments.find((x) => x.id === pid)!;
    assert.deepEqual(
      p.parcels.map((q) => q.dueDate),
      ['2027-01-31', '2027-02-28', '2027-03-31'],
    );
    S().toggleParcel(pid, 1);
    const pr = paymentProgress(S().payments[0]);
    assert.equal(pr.paidCount, 1);
    assert.equal(pr.paidValue, 1000);
    assert.equal(pr.next?.n, 2);
    S().toggleParcel(pid, 1);
    assert.equal(paymentProgress(S().payments[0]).paidCount, 0);
  });

  it('próximos vencimentos ordenados e com atraso marcado', () => {
    const id = S().addVehicle(vehicleInput());
    S().addPayment({
      vehicleId: id, kind: 'ipva', title: 'IPVA', baseValue: 900, discountPct: 0, interestPct: 0,
      freeUntil: 1, installments: 3, total: 900, firstDueDate: ago(40),
    });
    const up = upcomingParcels(S().payments, id);
    assert.equal(up.length, 3);
    assert.equal(up[0].level, 'due');
    assert.ok(up[0].dueDate <= up[1].dueDate);
  });

  it('total do mês separa pago e a pagar', () => {
    const id = S().addVehicle(vehicleInput());
    const pid = S().addPayment({
      vehicleId: id, kind: 'ipva', title: 'IPVA', baseValue: 600, discountPct: 0, interestPct: 0,
      freeUntil: 1, installments: 2, total: 600, firstDueDate: todayStr(),
    });
    assert.deepEqual(monthTotals(S().payments, id, today()), { due: 300, paid: 0 });
    S().toggleParcel(pid, 1);
    assert.deepEqual(monthTotals(S().payments, id, today()), { due: 0, paid: 300 });
  });
});

// ---------------------------------------------------------------- documentos
describe('documentos', () => {
  beforeEach(resetStore);

  it('excluir documento apaga os arquivos do celular', () => {
    const id = S().addVehicle(vehicleInput());
    __addFile('a.jpg');
    __addFile('b.pdf');
    const did = S().addDoc({
      vehicleId: id, kind: 'crlv', title: 'CRLV', notes: '',
      pages: [{ file: 'a.jpg', type: 'image', name: 'Foto' }, { file: 'b.pdf', type: 'pdf', name: 'x.pdf' }],
    });
    S().removeDoc(did);
    assert.ok(deleted.includes('a.jpg') && deleted.includes('b.pdf'));
    assert.equal(S().docs.length, 0);
  });

  it('editar e tirar uma página apaga só aquele arquivo', () => {
    const id = S().addVehicle(vehicleInput());
    __addFile('c.jpg');
    __addFile('d.jpg');
    const did = S().addDoc({
      vehicleId: id, kind: 'cnh', title: 'CNH', notes: '',
      pages: [{ file: 'c.jpg', type: 'image', name: 'f' }, { file: 'd.jpg', type: 'image', name: 'v' }],
    });
    S().updateDoc(did, { pages: [{ file: 'd.jpg', type: 'image', name: 'v' }] });
    assert.ok(deleted.includes('c.jpg'));
    assert.ok(!deleted.includes('d.jpg'));
  });

  it('anexar copia o arquivo temporário para a pasta do app', async () => {
    const page = await importDocFile('file:///cache/ImagePicker/abc.JPG', 'image', { width: 10, height: 20 });
    assert.match(page.file, /\.jpg$/);
    assert.equal(copied.at(-1).from, 'file:///cache/ImagePicker/abc.JPG');
    assert.equal(copied.at(-1).to, `file:///doc/documentos/${page.file}`);
    const pdf = await importDocFile('content://com.android.providers.downloads/document/42', 'pdf', { name: 'crlv.pdf' });
    assert.match(pdf.file, /\.pdf$/);
    assert.equal(pdf.name, 'crlv.pdf');
    assert.equal(copied.at(-1).from, 'content://com.android.providers.downloads/document/42');
  });

  it('foto com base64 é gravada direto, sem ler a pasta da câmera', async () => {
    const before = copied.length;
    const page = await importDocFile('file:///data/host.exp.exponent/cache/ImagePicker/x.jpeg', 'image', {
      base64: 'AAAA',
      mimeType: 'image/jpeg',
    });
    assert.equal(copied.length, before, 'não pode tentar copiar da pasta da câmera');
    assert.equal(written.at(-1).to, `file:///doc/documentos/${page.file}`);
    assert.match(page.file, /\.jpg$/);
  });

  it('excluir o carro leva junto documentos, pagamentos e revisões', () => {
    const id = S().addVehicle(vehicleInput());
    const other = S().addVehicle(vehicleInput({ model: 'Tracker' }));
    S().addDoc({ vehicleId: id, kind: 'crlv', title: 'CRLV', notes: '', pages: [] });
    S().setDocInfo(id, {
      renavam: '12345678901', chassi: '', brandModel: '', yearFab: '', yearModel: '', color: '',
      fuel: '', category: '', city: '', uf: '', exercicio: '', owner: '',
    });
    S().removeVehicle(id);
    assert.equal(S().vehicles.length, 1);
    assert.equal(S().activeVehicleId, other);
    assert.equal(S().docs.length, 0);
    assert.ok(S().revisions.every((r) => r.vehicleId === other));
  });
});
