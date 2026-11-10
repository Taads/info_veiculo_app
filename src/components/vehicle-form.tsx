import { useState } from 'react';
import { View } from 'react-native';

import type { VehicleInput } from '@/store';
import { C, S } from '@/theme';
import { todayStr } from '@/utils/dates';
import { fmtNumber } from '@/utils/format';

import { Chips, DateField, IntField, TextField } from './fields';
import { Plate } from './plate';
import { Card, T } from './ui';

export const defaultVehicle = (): VehicleInput => ({
  brand: 'Chevrolet',
  model: 'Onix',
  year: 2027,
  plate: '',
  nickname: '',
  km: 0,
  fallbackAvgKm: 30,
  revisionKm: 10000,
  revisionMonths: 12,
  oil: { intervalKm: 10000, intervalMonths: 12, lastKm: 0, lastDate: todayStr(), oilType: '' },
});

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: S.xxl, gap: S.lg }}>
      <T v="overline">{title}</T>
      {children}
    </View>
  );
}

export function useVehicleForm(initial?: VehicleInput) {
  return useState<VehicleInput>(initial ?? defaultVehicle());
}

export function VehicleForm({
  value: v,
  onChange,
  isNew,
}: {
  value: VehicleInput;
  onChange: (v: VehicleInput) => void;
  isNew?: boolean;
}) {
  const set = (patch: Partial<VehicleInput>) => onChange({ ...v, ...patch });
  const setOil = (patch: Partial<VehicleInput['oil']>) => onChange({ ...v, oil: { ...v.oil, ...patch } });

  return (
    <View>
      <Card style={{ alignItems: 'center', gap: S.md, paddingVertical: S.xxl }}>
        <Plate plate={v.plate} scale={1.25} />
        <T v="h2" style={{ marginTop: S.md }}>
          {v.nickname || `${v.brand} ${v.model}`.trim() || 'Seu carro'}
        </T>
        <T v="caption">
          {v.year || '----'} · {fmtNumber(v.km)} km
        </T>
      </Card>

      <Group title="Carro">
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <TextField style={{ flex: 1 }} label="Marca" value={v.brand} onChangeText={(brand) => set({ brand })} autoCapitalize="words" />
          <TextField style={{ flex: 1 }} label="Modelo" value={v.model} onChangeText={(model) => set({ model })} autoCapitalize="words" />
        </View>
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <IntField
            style={{ flex: 1 }}
            label="Ano"
            suffix=""
            value={v.year}
            onChange={(year) => set({ year: Math.min(year, 2100) })}
          />
          <TextField
            style={{ flex: 1.3 }}
            label="Placa"
            value={v.plate}
            placeholder="ABC1D23"
            maxLength={8}
            autoCapitalize="characters"
            onChangeText={(plate) => set({ plate: plate.toUpperCase() })}
          />
        </View>
        <TextField
          label="Apelido (opcional)"
          value={v.nickname}
          placeholder="Ex.: Onix Prata"
          icon="tag-outline"
          onChangeText={(nickname) => set({ nickname })}
        />
      </Group>

      <Group title="Quilometragem">
        <IntField
          label="Km atual no painel"
          icon="speedometer"
          value={v.km}
          onChange={(km) => set(isNew ? { km, oil: { ...v.oil, lastKm: Math.min(v.oil.lastKm || km, km) } } : { km })}
        />
        <View style={{ gap: 8 }}>
          <T v="caption" color={C.textDim}>
            Quanto você roda por dia, mais ou menos?
          </T>
          <Chips
            value={v.fallbackAvgKm}
            onChange={(fallbackAvgKm) => set({ fallbackAvgKm })}
            options={[15, 30, 50, 80, 120].map((n) => ({ value: n, label: `${n} km` }))}
          />
          <T v="caption" color={C.textMute} style={{ fontSize: 12 }}>
            Usado só no começo. Depois o app calcula sozinho pelos km que você registrar.
          </T>
        </View>
      </Group>

      <Group title="Troca de óleo">
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <IntField style={{ flex: 1 }} label="Última troca (km)" value={v.oil.lastKm} onChange={(lastKm) => setOil({ lastKm })} />
          <DateField style={{ flex: 1 }} label="Data da última troca" value={v.oil.lastDate} onChange={(lastDate) => setOil({ lastDate })} />
        </View>
        <View style={{ gap: 8 }}>
          <T v="caption" color={C.textDim}>
            Trocar a cada
          </T>
          <Chips
            value={v.oil.intervalKm}
            onChange={(intervalKm) => setOil({ intervalKm })}
            options={[5000, 7500, 10000].map((n) => ({ value: n, label: `${fmtNumber(n)} km` }))}
          />
          <Chips
            value={v.oil.intervalMonths}
            onChange={(intervalMonths) => setOil({ intervalMonths })}
            options={[6, 12].map((n) => ({ value: n, label: `ou ${n} meses` }))}
          />
          <T v="caption" color={C.textMute} style={{ fontSize: 12 }}>
            O que vencer primeiro. Confira no manual: no uso severo (trânsito pesado, trajetos curtos) o intervalo costuma cair
            pela metade.
          </T>
        </View>
        <TextField
          label="Óleo usado (opcional)"
          value={v.oil.oilType}
          placeholder="Ex.: 0W-20 sintético"
          icon="oil"
          onChangeText={(oilType) => setOil({ oilType })}
        />
      </Group>

      <Group title="Revisões">
        <Chips
          value={v.revisionKm}
          onChange={(revisionKm) => set({ revisionKm })}
          options={[10000, 15000, 20000].map((n) => ({ value: n, label: `${fmtNumber(n)} km` }))}
        />
        <Chips
          value={v.revisionMonths}
          onChange={(revisionMonths) => set({ revisionMonths })}
          options={[6, 12].map((n) => ({ value: n, label: `ou ${n} meses` }))}
        />
        {isNew ? (
          <T v="caption" color={C.textMute} style={{ fontSize: 12 }}>
            Vamos montar o seu plano com as próximas 6 revisões. Você pode editar cada uma depois.
          </T>
        ) : null}
      </Group>
    </View>
  );
}
