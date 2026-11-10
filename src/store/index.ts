import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { addMonths, parseDate, toDateStr, todayStr, type DateStr } from '@/utils/dates';
import { splitParcels } from '@/utils/finance';
import { fmtNumber } from '@/utils/format';

import type {
  ID,
  KmLog,
  Payment,
  PaymentKind,
  Revision,
  ServiceRecord,
  Settings,
  Vehicle,
} from './types';

export * from './types';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export type VehicleInput = Omit<Vehicle, 'id' | 'createdAt'>;

export type NewPaymentInput = {
  vehicleId: ID;
  kind: PaymentKind;
  title: string;
  baseValue: number;
  discountPct: number;
  interestPct: number;
  freeUntil: number;
  installments: number;
  total: number;
  firstDueDate: DateStr;
};

type State = {
  vehicles: Vehicle[];
  activeVehicleId: ID | null;
  kmLogs: KmLog[];
  services: ServiceRecord[];
  revisions: Revision[];
  payments: Payment[];
  settings: Settings;
};

type Actions = {
  addVehicle: (v: VehicleInput) => ID;
  updateVehicle: (id: ID, patch: Partial<VehicleInput>) => void;
  removeVehicle: (id: ID) => void;
  setActiveVehicle: (id: ID) => void;

  logKm: (vehicleId: ID, input: { date: DateStr; delta?: number; odometer?: number }) => void;
  removeKmLog: (id: ID) => void;

  registerOilChange: (
    vehicleId: ID,
    input: { date: DateStr; km: number; cost: number; shop: string; notes: string },
  ) => void;

  addRevision: (r: Omit<Revision, 'id' | 'done'>) => void;
  updateRevision: (id: ID, patch: Partial<Revision>) => void;
  completeRevision: (
    id: ID,
    input: { date: DateStr; km: number; cost: number; shop: string; notes: string },
  ) => void;
  reopenRevision: (id: ID) => void;
  removeRevision: (id: ID) => void;
  removeService: (id: ID) => void;

  addPayment: (input: NewPaymentInput) => ID;
  toggleParcel: (paymentId: ID, n: number) => void;
  removePayment: (id: ID) => void;

  updateSettings: (patch: Partial<Settings>) => void;
};

export type Store = State & Actions;

/** Plano de revisões a partir do km atual: as próximas 6 revisões. */
function buildRevisionPlan(v: Vehicle): Revision[] {
  const out: Revision[] = [];
  const step = v.revisionKm;
  const first = Math.floor(v.km / step) + 1;
  const start = parseDate(todayStr());
  for (let k = 0; k < 6; k++) {
    const n = first + k;
    const dueKm = n * step;
    out.push({
      id: uid(),
      vehicleId: v.id,
      title: `Revisão ${fmtNumber(dueKm / 1000, dueKm % 1000 ? 1 : 0)} mil km`,
      dueKm,
      dueDate: toDateStr(addMonths(start, v.revisionMonths * (k + 1))),
      done: false,
    });
  }
  return out;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      vehicles: [],
      activeVehicleId: null,
      kmLogs: [],
      services: [],
      revisions: [],
      payments: [],
      settings: {
        notifications: true,
        dailyKm: true,
        dailyHour: 21,
        daysBefore: [7, 1, 0],
      },

      addVehicle: (input) => {
        const v: Vehicle = { ...input, id: uid(), createdAt: new Date().toISOString() };
        set((s) => ({
          vehicles: [...s.vehicles, v],
          activeVehicleId: v.id,
          revisions: [...s.revisions, ...buildRevisionPlan(v)],
        }));
        return v.id;
      },

      updateVehicle: (id, patch) =>
        set((s) => ({
          vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)),
        })),

      removeVehicle: (id) =>
        set((s) => {
          const vehicles = s.vehicles.filter((v) => v.id !== id);
          return {
            vehicles,
            activeVehicleId:
              s.activeVehicleId === id ? (vehicles[0]?.id ?? null) : s.activeVehicleId,
            kmLogs: s.kmLogs.filter((l) => l.vehicleId !== id),
            services: s.services.filter((x) => x.vehicleId !== id),
            revisions: s.revisions.filter((x) => x.vehicleId !== id),
            payments: s.payments.filter((x) => x.vehicleId !== id),
          };
        }),

      setActiveVehicle: (id) => set({ activeVehicleId: id }),

      logKm: (vehicleId, { date, delta, odometer }) => {
        const v = get().vehicles.find((x) => x.id === vehicleId);
        if (!v) return;
        let d = delta ?? 0;
        let odo = v.km + d;
        if (odometer != null) {
          d = odometer - v.km;
          odo = odometer;
        }
        if (!Number.isFinite(d) || d === 0) return;
        const log: KmLog = {
          id: uid(),
          vehicleId,
          date,
          delta: d,
          odometer: odo,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          kmLogs: [log, ...s.kmLogs],
          vehicles: s.vehicles.map((x) => (x.id === vehicleId ? { ...x, km: odo } : x)),
        }));
      },

      removeKmLog: (id) =>
        set((s) => {
          const log = s.kmLogs.find((l) => l.id === id);
          if (!log) return {};
          return {
            kmLogs: s.kmLogs.filter((l) => l.id !== id),
            vehicles: s.vehicles.map((v) =>
              v.id === log.vehicleId ? { ...v, km: Math.max(0, v.km - log.delta) } : v,
            ),
          };
        }),

      registerOilChange: (vehicleId, { date, km, cost, shop, notes }) =>
        set((s) => ({
          vehicles: s.vehicles.map((v) =>
            v.id === vehicleId
              ? { ...v, km: Math.max(v.km, km), oil: { ...v.oil, lastKm: km, lastDate: date } }
              : v,
          ),
          services: [
            {
              id: uid(),
              vehicleId,
              kind: 'oil',
              title: 'Troca de óleo',
              date,
              km,
              cost,
              shop,
              notes,
            },
            ...s.services,
          ],
        })),

      addRevision: (r) => set((s) => ({ revisions: [...s.revisions, { ...r, id: uid(), done: false }] })),

      updateRevision: (id, patch) =>
        set((s) => ({ revisions: s.revisions.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),

      completeRevision: (id, { date, km, cost, shop, notes }) =>
        set((s) => {
          const r = s.revisions.find((x) => x.id === id);
          if (!r) return {};
          return {
            revisions: s.revisions.map((x) =>
              x.id === id
                ? { ...x, done: true, doneDate: date, doneKm: km, cost, shop, notes }
                : x,
            ),
            vehicles: s.vehicles.map((v) =>
              v.id === r.vehicleId ? { ...v, km: Math.max(v.km, km) } : v,
            ),
            services: [
              {
                id: `rev-${id}`,
                vehicleId: r.vehicleId,
                kind: 'revision',
                title: r.title,
                date,
                km,
                cost,
                shop,
                notes,
              },
              ...s.services.filter((x) => x.id !== `rev-${id}`),
            ],
          };
        }),

      reopenRevision: (id) =>
        set((s) => ({
          revisions: s.revisions.map((r) =>
            r.id === id
              ? { ...r, done: false, doneDate: undefined, doneKm: undefined, cost: undefined }
              : r,
          ),
          services: s.services.filter((x) => x.id !== `rev-${id}`),
        })),

      removeRevision: (id) =>
        set((s) => ({
          revisions: s.revisions.filter((r) => r.id !== id),
          services: s.services.filter((x) => x.id !== `rev-${id}`),
        })),

      removeService: (id) => set((s) => ({ services: s.services.filter((x) => x.id !== id) })),

      addPayment: (input) => {
        const id = uid();
        const values = splitParcels(input.total, input.installments);
        const first = parseDate(input.firstDueDate);
        const payment: Payment = {
          id,
          vehicleId: input.vehicleId,
          kind: input.kind,
          title: input.title,
          baseValue: input.baseValue,
          discountPct: input.discountPct,
          interestPct: input.interestPct,
          freeUntil: input.freeUntil,
          installments: input.installments,
          total: input.total,
          createdAt: new Date().toISOString(),
          parcels: values.map((value, i) => ({
            n: i + 1,
            value,
            dueDate: toDateStr(addMonths(first, i)),
            paid: false,
          })),
        };
        set((s) => ({ payments: [payment, ...s.payments] }));
        return id;
      },

      toggleParcel: (paymentId, n) =>
        set((s) => ({
          payments: s.payments.map((p) =>
            p.id !== paymentId
              ? p
              : {
                  ...p,
                  parcels: p.parcels.map((q) =>
                    q.n === n
                      ? { ...q, paid: !q.paid, paidDate: !q.paid ? todayStr() : undefined }
                      : q,
                  ),
                },
          ),
        })),

      removePayment: (id) => set((s) => ({ payments: s.payments.filter((p) => p.id !== id) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'garagem-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

export function useActiveVehicle(): Vehicle | undefined {
  return useStore((s) => s.vehicles.find((v) => v.id === s.activeVehicleId) ?? s.vehicles[0]);
}
