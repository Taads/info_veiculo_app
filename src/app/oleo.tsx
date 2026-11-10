import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Chips, DateField, IntField, MoneyField, Segmented, TextField } from '@/components/fields';
import { Screen } from '@/components/screen';
import { Button, Card, T } from '@/components/ui';
import { useActiveVehicle, useStore } from '@/store';
import { C, S } from '@/theme';
import { todayStr } from '@/utils/dates';
import { fmtNumber } from '@/utils/format';

type Mode = 'troca' | 'ajustar';

export default function OilScreen() {
  const params = useLocalSearchParams<{ modo?: string }>();
  const v = useActiveVehicle();
  const registerOilChange = useStore((s) => s.registerOilChange);
  const updateVehicle = useStore((s) => s.updateVehicle);

  const [mode, setMode] = useState<Mode>(params.modo === 'troca' ? 'troca' : 'ajustar');
  const [date, setDate] = useState(todayStr());
  const [km, setKm] = useState(v?.km ?? 0);
  const [cost, setCost] = useState(0);
  const [shop, setShop] = useState('');
  const [notes, setNotes] = useState('');
  const [cfg, setCfg] = useState(v?.oil);

  if (!v || !cfg) return null;

  const save = () => {
    if (mode === 'troca') {
      registerOilChange(v.id, { date, km, cost, shop: shop.trim(), notes: notes.trim() });
      if (cfg.oilType !== v.oil.oilType) updateVehicle(v.id, { oil: { ...v.oil, oilType: cfg.oilType, lastKm: km, lastDate: date } });
    } else {
      updateVehicle(v.id, { oil: cfg });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <Screen
      back
      overline="Troca de óleo"
      title={mode === 'troca' ? 'Registrar troca' : 'Ajustar intervalo'}
      footer={<Button label={mode === 'troca' ? 'Salvar troca' : 'Salvar ajustes'} icon="check" onPress={save} disabled={mode === 'troca' && km <= 0} />}>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'troca', label: 'Fiz a troca' },
          { value: 'ajustar', label: 'Configurar' },
        ]}
        style={{ marginBottom: S.xl }}
      />

      {mode === 'troca' ? (
        <View style={{ gap: S.lg }}>
          <View style={{ flexDirection: 'row', gap: S.md }}>
            <DateField style={{ flex: 1 }} label="Data" value={date} onChange={setDate} />
            <IntField style={{ flex: 1 }} label="Km no painel" value={km} onChange={setKm} />
          </View>
          <MoneyField label="Quanto custou" value={cost} onChange={setCost} />
          <TextField label="Onde fez" value={shop} onChangeText={setShop} placeholder="Ex.: Concessionária, posto…" icon="store-outline" />
          <TextField
            label="Óleo usado"
            value={cfg.oilType}
            onChangeText={(oilType) => setCfg({ ...cfg, oilType })}
            placeholder="Ex.: 0W-20 sintético"
            icon="oil"
          />
          <TextField label="Observações" value={notes} onChangeText={setNotes} placeholder="Trocou filtro também?" icon="note-text-outline" />
          <Card style={{ backgroundColor: C.accentSoft, borderColor: C.accentLine }}>
            <T v="caption" color={C.text}>
              A próxima troca vai ficar para {fmtNumber(km + cfg.intervalKm)} km ou daqui {cfg.intervalMonths} meses, o que vier
              primeiro.
            </T>
          </Card>
        </View>
      ) : (
        <View style={{ gap: S.xl }}>
          <View style={{ gap: S.sm }}>
            <T v="caption" color={C.textDim}>
              Trocar a cada
            </T>
            <Chips
              value={cfg.intervalKm}
              onChange={(intervalKm) => setCfg({ ...cfg, intervalKm })}
              options={[5000, 7500, 10000, 15000].map((n) => ({ value: n, label: `${fmtNumber(n)} km` }))}
            />
            <IntField value={cfg.intervalKm} onChange={(intervalKm) => setCfg({ ...cfg, intervalKm })} hint="Ou digite outro valor" />
          </View>
          <View style={{ gap: S.sm }}>
            <T v="caption" color={C.textDim}>
              Ou a cada (meses)
            </T>
            <Chips
              value={cfg.intervalMonths}
              onChange={(intervalMonths) => setCfg({ ...cfg, intervalMonths })}
              options={[3, 6, 9, 12].map((n) => ({ value: n, label: `${n} meses` }))}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: S.md }}>
            <IntField style={{ flex: 1 }} label="Última troca (km)" value={cfg.lastKm} onChange={(lastKm) => setCfg({ ...cfg, lastKm })} />
            <DateField style={{ flex: 1 }} label="Data da última" value={cfg.lastDate} onChange={(lastDate) => setCfg({ ...cfg, lastDate })} />
          </View>
          <TextField label="Óleo usado" value={cfg.oilType} onChangeText={(oilType) => setCfg({ ...cfg, oilType })} placeholder="Ex.: 0W-20 sintético" icon="oil" />
        </View>
      )}
    </Screen>
  );
}
