import type { DateStr } from '@/utils/dates';

export type ID = string;

export type OilConfig = {
  intervalKm: number;
  intervalMonths: number;
  lastKm: number;
  lastDate: DateStr;
  oilType: string;
};

export type Vehicle = {
  id: ID;
  brand: string;
  model: string;
  year: number;
  plate: string;
  nickname: string;
  km: number;
  /** Usada para prever datas enquanto não há registros de km suficientes. */
  fallbackAvgKm: number;
  /** Intervalo padrão de revisões. */
  revisionKm: number;
  revisionMonths: number;
  oil: OilConfig;
  createdAt: string;
};

export type KmLog = {
  id: ID;
  vehicleId: ID;
  date: DateStr;
  delta: number;
  odometer: number;
  createdAt: string;
};

export type ServiceKind = 'oil' | 'revision';

export type ServiceRecord = {
  id: ID;
  vehicleId: ID;
  kind: ServiceKind;
  title: string;
  date: DateStr;
  km: number;
  cost: number;
  shop: string;
  notes: string;
};

export type Revision = {
  id: ID;
  vehicleId: ID;
  title: string;
  dueKm: number;
  dueDate: DateStr;
  done: boolean;
  doneDate?: DateStr;
  doneKm?: number;
  cost?: number;
  shop?: string;
  notes?: string;
};

export type PaymentKind = 'ipva' | 'seguro' | 'licenciamento' | 'outro';

export type Parcel = {
  n: number;
  value: number;
  dueDate: DateStr;
  paid: boolean;
  paidDate?: DateStr;
};

export type Payment = {
  id: ID;
  vehicleId: ID;
  kind: PaymentKind;
  title: string;
  baseValue: number;
  discountPct: number;
  interestPct: number;
  freeUntil: number;
  installments: number;
  total: number;
  parcels: Parcel[];
  createdAt: string;
};

export type Settings = {
  notifications: boolean;
  dailyKm: boolean;
  dailyHour: number;
  /** Quantos dias antes avisar de um vencimento. */
  daysBefore: number[];
};
