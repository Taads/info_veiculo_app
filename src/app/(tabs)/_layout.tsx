import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useStore } from '@/store';
import { C } from '@/theme';

export default function TabsLayout() {
  const hasVehicle = useStore((s) => s.vehicles.length > 0);
  if (!hasVehicle) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="manutencao" />
      <Tabs.Screen name="pagamentos" />
      <Tabs.Screen name="garagem" />
    </Tabs>
  );
}
