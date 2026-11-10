import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Icon, T } from '@/components/ui';
import { VehicleForm, useVehicleForm } from '@/components/vehicle-form';
import { ensurePermission } from '@/lib/notifications';
import { useStore } from '@/store';
import { C, gradients, S } from '@/theme';

export default function Onboarding() {
  const [v, setV] = useVehicleForm();
  const [saving, setSaving] = useState(false);
  const addVehicle = useStore((s) => s.addVehicle);
  const canBack = useStore((s) => s.vehicles.length > 0);

  const save = async () => {
    setSaving(true);
    addVehicle({ ...v, oil: { ...v.oil, lastKm: v.oil.lastKm || v.km } });
    await ensurePermission(true).catch(() => false);
    setSaving(false);
    if (canBack) router.back();
    else router.replace('/');
  };

  return (
    <Screen
      back={canBack}
      footer={
        <Button
          label={canBack ? 'Adicionar carro' : 'Começar'}
          icon="arrow-right"
          onPress={save}
          loading={saving}
          disabled={!v.model.trim()}
        />
      }>
      <View style={styles.hero}>
        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
          <Icon name="car-sports" size={34} color="#fff" />
        </LinearGradient>
        <T v="overline" style={{ marginTop: S.xl }}>
          {canBack ? 'Novo carro' : 'Bem-vindo à Garagem'}
        </T>
        <T v="title" style={{ fontSize: 32, lineHeight: 38 }}>
          {canBack ? 'Cadastre outro carro' : 'Seu carro no controle,\nsem esquecer nada.'}
        </T>
        <T v="body" color={C.textDim} style={{ marginTop: S.sm }}>
          Óleo, revisões, IPVA e seguro com lembretes no celular, mesmo com o app fechado.
        </T>
      </View>
      <VehicleForm value={v} onChange={setV} isNew />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: S.xxl, marginTop: S.lg },
  logo: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
