import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, IconButton } from '@/components/ui';
import { VehicleForm, useVehicleForm } from '@/components/vehicle-form';
import { useStore } from '@/store';

export default function EditVehicle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vehicle = useStore((s) => s.vehicles.find((v) => v.id === id));
  const updateVehicle = useStore((s) => s.updateVehicle);
  const removeVehicle = useStore((s) => s.removeVehicle);
  const [v, setV] = useVehicleForm(vehicle);

  if (!vehicle) return null;

  const remove = () =>
    Alert.alert('Excluir carro?', 'Todos os registros, revisões e pagamentos deste carro serão apagados.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          router.back();
          removeVehicle(vehicle.id);
        },
      },
    ]);

  return (
    <Screen
      back
      title="Editar carro"
      right={<IconButton icon="trash-can-outline" tone="red" onPress={remove} />}
      footer={
        <Button
          label="Salvar alterações"
          icon="check"
          onPress={() => {
            updateVehicle(vehicle.id, v);
            router.back();
          }}
        />
      }>
      <VehicleForm value={v} onChange={setV} />
    </Screen>
  );
}
