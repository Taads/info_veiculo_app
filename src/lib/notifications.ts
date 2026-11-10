// Notificações locais: agendadas no próprio Android, disparam com o app fechado.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Store } from '@/store';
import { addDays, parseDate } from '@/utils/dates';
import { fmtKm, fmtMoney } from '@/utils/format';

import { avgKmPerDay, kindMeta, nextRevision, oilStatus, revisionStatus } from './insights';

const CHANNEL = 'lembretes';
const NOTIFY_HOUR = 9;
const MAX_SCHEDULED = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Lembretes do carro',
    // eslint-disable-next-line import/namespace -- exportado em runtime via `export *`
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#FF7A1A',
  });
}

export async function ensurePermission(ask = true): Promise<boolean> {
  await setupChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

type Item = { title: string; body: string; date: Date };

function at(d: Date, hour = NOTIFY_HOUR): Date {
  const r = new Date(d);
  r.setHours(hour, 0, 0, 0);
  return r;
}

/** Próximo horário válido de aviso para algo que já venceu. */
function nextSlot(): Date {
  const now = new Date();
  const slot = at(now);
  return slot > now ? slot : at(addDays(now, 1));
}

function buildItems(s: Store): Item[] {
  const now = new Date();
  const items: Item[] = [];
  const before = s.settings.daysBefore;

  for (const v of s.vehicles) {
    const name = v.nickname || `${v.brand} ${v.model}`.trim();
    const avg = avgKmPerDay(v, s.kmLogs).value;

    // Troca de óleo
    const oil = oilStatus(v, avg);
    if (oil.level === 'due') {
      items.push({
        title: '🛢️ Troca de óleo vencida',
        body: `${name}: passou ${oil.kmLeft <= 0 ? fmtKm(-oil.kmLeft) : 'do prazo'}. Agende a troca.`,
        date: nextSlot(),
      });
    } else {
      for (const d of [7, 1]) {
        items.push({
          title: '🛢️ Troca de óleo chegando',
          body: `${name}: pela sua média, a troca vence ${d === 1 ? 'amanhã' : `em ${d} dias`} (~${fmtKm(Math.max(0, oil.kmLeft - avg * (oil.daysLeft - d)))} restantes).`,
          date: at(addDays(oil.predictedDate, -d)),
        });
      }
    }

    // Revisão
    const rev = nextRevision(v, s.revisions);
    if (rev) {
      const st = revisionStatus(v, rev, avg);
      if (st.level === 'due') {
        items.push({
          title: '🔧 Revisão pendente',
          body: `${name}: ${rev.title} está vencida. Agende na concessionária.`,
          date: nextSlot(),
        });
      } else {
        for (const d of [15, 3]) {
          items.push({
            title: '🔧 Revisão se aproximando',
            body: `${name}: ${rev.title} prevista para ${d === 3 ? 'daqui 3 dias' : 'daqui 15 dias'}.`,
            date: at(addDays(st.predictedDate, -d)),
          });
        }
      }
    }

    // Parcelas
    for (const p of s.payments) {
      if (p.vehicleId !== v.id) continue;
      const label = kindMeta[p.kind].label;
      for (const q of p.parcels) {
        if (q.paid) continue;
        const due = parseDate(q.dueDate);
        const parcelLabel = p.installments > 1 ? ` (parcela ${q.n}/${p.installments})` : '';
        for (const d of before) {
          items.push({
            title:
              d === 0
                ? `💳 ${label} vence hoje`
                : `💳 ${label} vence ${d === 1 ? 'amanhã' : `em ${d} dias`}`,
            body: `${p.title}${parcelLabel}: ${fmtMoney(q.value)}`,
            date: at(addDays(due, -d)),
          });
        }
      }
    }
  }

  return items
    .filter((i) => i.date > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_SCHEDULED);
}

let running: Promise<void> | null = null;

export async function rescheduleAll(s: Store) {
  // Evita duas reprogramações ao mesmo tempo.
  if (running) await running.catch(() => {});
  running = (async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!s.settings.notifications) return;
    const ok = await ensurePermission(false);
    if (!ok) return;

    for (const item of buildItems(s)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: item.title, body: item.body, sound: 'default' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.date,
          channelId: CHANNEL,
        },
      });
    }

    if (s.settings.dailyKm && s.vehicles.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚗 Quantos km você rodou hoje?',
          body: 'Toque para registrar e manter suas previsões em dia.',
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: s.settings.dailyHour,
          minute: 0,
          channelId: CHANNEL,
        },
      });
    }
  })();
  return running;
}

export async function sendTest() {
  const ok = await ensurePermission(true);
  if (!ok) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Notificações funcionando',
      body: 'Você vai receber os lembretes do seu carro mesmo com o app fechado.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL,
    },
  });
  return true;
}

export async function scheduledCount() {
  const list = await Notifications.getAllScheduledNotificationsAsync();
  return list.length;
}
