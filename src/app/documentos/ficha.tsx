import { DocGate } from '@/components/doc-gate';
import { Haptics } from '@/lib/haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Chips, TextField } from '@/components/fields';
import { Screen } from '@/components/screen';
import { Button, Card, Icon, T } from '@/components/ui';
import { emptyDocInfo } from '@/lib/doc-meta';
import { useActiveVehicle, useStore, type DocInfo } from '@/store';
import { C, S } from '@/theme';

const FUELS = ['Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido'];

function DocInfoScreen() {
  const v = useActiveVehicle();
  const setDocInfo = useStore((s) => s.setDocInfo);
  const [info, setInfo] = useState<DocInfo>(() => ({
    ...emptyDocInfo(),
    brandModel: v ? `${v.brand.toUpperCase()}/${v.model.toUpperCase()}` : '',
    yearModel: v ? String(v.year) : '',
    ...v?.docInfo,
  }));

  if (!v) return null;
  const set = (patch: Partial<DocInfo>) => setInfo((x) => ({ ...x, ...patch }));

  return (
    <Screen
      back
      overline="CRLV"
      title="Dados do documento"
      subtitle="Copie do seu CRLV. Você só precisa fazer isso uma vez."
      footer={
        <Button
          label="Salvar dados"
          icon="check"
          onPress={() => {
            const clean = Object.fromEntries(Object.entries(info).map(([k, val]) => [k, val.trim()])) as DocInfo;
            setDocInfo(v.id, clean);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          }}
        />
      }>
      <Card style={{ flexDirection: 'row', gap: S.md, alignItems: 'center', marginBottom: S.xl }}>
        <Icon name="shield-lock-outline" size={22} color={C.accent} />
        <T v="caption" style={{ flex: 1 }} color={C.textDim}>
          Esses dados ficam só no seu celular. Renavam e chassi ganham botão de copiar para pagar IPVA e licenciamento.
        </T>
      </Card>

      <View style={{ gap: S.lg }}>
        <T v="overline">Identificação</T>
        <TextField
          label="Renavam"
          value={info.renavam}
          onChangeText={(renavam) => set({ renavam: renavam.replace(/\D/g, '').slice(0, 11) })}
          keyboardType="number-pad"
          placeholder="11 dígitos"
          icon="identifier"
        />
        <TextField
          label="Chassi"
          value={info.chassi}
          onChangeText={(chassi) => set({ chassi: chassi.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17) })}
          autoCapitalize="characters"
          placeholder="17 caracteres"
          icon="barcode"
        />
        <TextField
          label="Proprietário"
          value={info.owner}
          onChangeText={(owner) => set({ owner })}
          autoCapitalize="characters"
          icon="account-outline"
        />

        <T v="overline" style={{ marginTop: S.lg }}>
          Veículo
        </T>
        <TextField
          label="Marca / Modelo / Versão"
          value={info.brandModel}
          onChangeText={(brandModel) => set({ brandModel })}
          autoCapitalize="characters"
          icon="car-outline"
        />
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <TextField
            style={{ flex: 1 }}
            label="Ano fabricação"
            value={info.yearFab}
            onChangeText={(yearFab) => set({ yearFab: yearFab.replace(/\D/g, '').slice(0, 4) })}
            keyboardType="number-pad"
          />
          <TextField
            style={{ flex: 1 }}
            label="Ano modelo"
            value={info.yearModel}
            onChangeText={(yearModel) => set({ yearModel: yearModel.replace(/\D/g, '').slice(0, 4) })}
            keyboardType="number-pad"
          />
        </View>
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <TextField style={{ flex: 1 }} label="Cor" value={info.color} onChangeText={(color) => set({ color })} autoCapitalize="words" />
          <TextField
            style={{ flex: 1 }}
            label="Categoria"
            value={info.category}
            onChangeText={(category) => set({ category })}
            placeholder="Particular"
            autoCapitalize="words"
          />
        </View>
        <View style={{ gap: 8 }}>
          <T v="caption" color={C.textDim}>
            Combustível
          </T>
          <Chips value={info.fuel} onChange={(fuel) => set({ fuel })} options={FUELS.map((f) => ({ value: f, label: f }))} />
        </View>

        <T v="overline" style={{ marginTop: S.lg }}>
          Registro
        </T>
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <TextField style={{ flex: 2 }} label="Município" value={info.city} onChangeText={(city) => set({ city })} autoCapitalize="words" />
          <TextField
            style={{ flex: 1 }}
            label="UF"
            value={info.uf}
            onChangeText={(uf) => set({ uf: uf.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) })}
            autoCapitalize="characters"
            placeholder="SP"
          />
        </View>
        <TextField
          label="Exercício (ano do licenciamento)"
          value={info.exercicio}
          onChangeText={(exercicio) => set({ exercicio: exercicio.replace(/\D/g, '').slice(0, 4) })}
          keyboardType="number-pad"
          placeholder={String(new Date().getFullYear())}
          icon="calendar-check-outline"
        />
      </View>
    </Screen>
  );
}

export default function DocInfoScreenRoute() {
  return (
    <DocGate>
      <DocInfoScreen />
    </DocGate>
  );
}
