// Testes dos lembretes agendados. Rodar com: npm test

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { buildItems, rescheduleAll, sendTest } from '@/lib/notifications';
import { useStore, type VehicleInput } from '@/store';
import { addDays, addMonths, toDateStr, today, todayStr } from '@/utils/dates';

import { __failNext, scheduled } from '../tests/support/stub-notifications.mjs';

const S = () => useStore.getState();

function vehicle(over: Partial<VehicleInput> = {}): VehicleInput {
  return {
    brand: 'Chevrolet', model: 'Onix', year: 2027, plate: '', nickname: '', km: 5000,
    fallbackAvgKm: 30, revisionKm: 10000, revisionMonths: 12,
    oil: { intervalKm: 10000, intervalMonths: 12, lastKm: 5000, lastDate: todayStr(), oilType: '' },
    ...over,
  };
}

beforeEach(() => {
  scheduled.length = 0;
  useStore.setState({
    vehicles: [], activeVehicleId: null, kmLogs: [], services: [], revisions: [], payments: [], docs: [],
    settings: { notifications: true, dailyKm: true, dailyHour: 21, daysBefore: [7, 1, 0] },
  });
});

describe('lembretes', () => {
  it('só agenda datas válidas e no futuro, às 9h', () => {
    const id = S().addVehicle(vehicle());
    S().addPayment({
      vehicleId: id, kind: 'ipva', title: 'IPVA 2027', baseValue: 3000, discountPct: 0, interestPct: 0,
      freeUntil: 1, installments: 3, total: 3000, firstDueDate: toDateStr(addDays(today(), 20)),
    });
    const items = buildItems(S());
    assert.ok(items.length > 0);
    const now = Date.now();
    for (const it of items) {
      assert.ok(!Number.isNaN(it.date.getTime()), `data inválida em "${it.title}"`);
      assert.ok(it.date.getTime() > now, `data no passado em "${it.title}"`);
      assert.equal(it.date.getHours(), 9);
    }
    // 3 parcelas x 3 avisos (7d, 1d, no dia)
    assert.equal(items.filter((i) => i.title.includes('IPVA')).length, 9);
  });

  it('documento com validade gera aviso 30d, 7d e no dia', () => {
    const id = S().addVehicle(vehicle());
    S().addDoc({ vehicleId: id, kind: 'cnh', title: 'CNH', notes: '', pages: [], expiresAt: toDateStr(addMonths(today(), 2)) });
    const docs = buildItems(S()).filter((i) => i.title.includes('CNH'));
    assert.equal(docs.length, 3);
  });

  it('óleo vencido avisa no próximo horário', () => {
    S().addVehicle(vehicle({ km: 5000 + 12000 }));
    const oil = buildItems(S()).filter((i) => i.title.includes('óleo'));
    assert.equal(oil.length, 1);
    assert.ok(oil[0].title.includes('vencida'));
  });

  it('carro antigo sem lista de documentos não quebra', () => {
    S().addVehicle(vehicle());
    // simula dados salvos por versões anteriores (sem "docs")
    const legacy = { ...S(), docs: undefined } as unknown as ReturnType<typeof S>;
    assert.doesNotThrow(() => buildItems(legacy));
  });

  it('limita a 60 lembretes', () => {
    const id = S().addVehicle(vehicle());
    for (let k = 0; k < 10; k++) {
      S().addPayment({
        vehicleId: id, kind: 'outro', title: `Conta ${k}`, baseValue: 1200, discountPct: 0, interestPct: 0,
        freeUntil: 1, installments: 12, total: 1200, firstDueDate: toDateStr(addDays(today(), 10)),
      });
    }
    assert.equal(buildItems(S()).length, 60);
  });

  it('reprogramar agenda tudo e não apaga a notificação de teste', async () => {
    S().addVehicle(vehicle());
    const test = await sendTest();
    assert.deepEqual(test, { ok: true });
    await rescheduleAll(S());
    const ids = scheduled.map((x: { identifier?: string }) => x.identifier);
    assert.ok(ids.includes(undefined), 'teste continua agendado');
    assert.ok(ids.includes('gc-daily-km'));
    await rescheduleAll(S());
    const daily = scheduled.filter((x: { identifier?: string }) => x.identifier === 'gc-daily-km');
    assert.equal(daily.length, 1, 'não duplica ao reprogramar');
  });

  it('se o canal falhar, agenda sem canal em vez de dar erro', async () => {
    __failNext(1);
    const res = await sendTest();
    assert.deepEqual(res, { ok: true });
    assert.equal(scheduled.length, 1);
  });
});
