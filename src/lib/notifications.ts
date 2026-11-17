// Notificações locais: agendadas no próprio Android, disparam com o app fechado.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Store } from '@/store';
import { addDays, fmtDate, parseDate } from '@/utils/dates';
import { fmtKm, fmtMoney } from '@/utils/format';

import { errorMessage } from './errors';
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

/** Último erro ao agendar (mostrado na tela Garagem para diagnóstico). */
export let lastScheduleError: string | null = null;

let channelReady = false;

/**
 * Cria o canal de notificações. No Expo Go alguns aparelhos recusam opções extras,
 * então tenta do mais completo ao mais simples. Se nada der certo, os lembretes
 * são agendados sem canal (caem no canal padrão do Expo Go) e continuam funcionando.
 */
export async function setupChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  // eslint-disable-next-line import/namespace -- exportado em runtime via `export *`
  const HIGH = Notifications.AndroidImportance?.HIGH ?? 4;
  const attempts: Notifications.NotificationChannelInput[] = [
    { name: 'Lembretes do carro', importance: HIGH, vibrationPattern: [0, 200, 120, 200], sound: 'default' },
    { name: 'Lembretes do carro', importance: HIGH },
  ];
  let last: unknown;
  for (const opts of attempts) {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL, opts);
      channelReady = true;
      return;
    } catch (e) {
      last = e;
    }
  }
  // O Android às vezes cria o canal e só falha ao responder: confere se ele existe.
  try {
    if (await Notifications.getNotificationChannelAsync(CHANNEL)) {
      channelReady = true;
      return;
    }
  } catch {
    // segue sem canal
  }
  throw last;
}

export async function ensurePermission(ask = true): Promise<boolean> {
  try {
    await setupChannel();
  } catch (e) {
    console.warn('[GestCar] canal de notificação:', errorMessage(e));
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync();
  return res.granted;
}

/** Agenda uma notificação; se o canal der problema, tenta de novo sem canal. */
function withoutChannel(req: Notifications.NotificationRequestInput): Notifications.NotificationRequestInput {
  const trigger = req.trigger as { channelId?: string } | null;
  if (!trigger || !trigger.channelId) return req;
  const { channelId: _drop, ...rest } = trigger;
  void _drop;
  return { ...req, trigger: rest as Notifications.NotificationTriggerInput };
}

async function scheduleSafe(req: Notifications.NotificationRequestInput) {
  // Canal que não existe = Android aceita, mas não mostra. Sem canal, usa o padrão.
  const first = channelReady ? req : withoutChannel(req);
  try {
    return await Notifications.scheduleNotificationAsync(first);
  } catch (e) {
    if (first !== req) throw e;
    return Notifications.scheduleNotificationAsync(withoutChannel(req));
  }
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

export function buildItems(s: Store): Item[] {
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

    // Documentos com validade (CNH, apólice…)
    for (const d of s.docs ?? []) {
      if (d.vehicleId !== v.id || !d.expiresAt) continue;
      const due = parseDate(d.expiresAt);
      for (const days of [30, 7, 0]) {
        items.push({
          title: days === 0 ? `📄 ${d.title} vence hoje` : `📄 ${d.title} vence em ${days} dias`,
          body: `Validade: ${fmtDate(d.expiresAt)}. Hora de renovar.`,
          date: at(addDays(due, -days)),
        });
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

/** Prefixo dos lembretes do app. A notificação de teste não usa, para não ser cancelada. */
const PREFIX = 'gc-';

async function cancelOurs() {
  const list = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    list
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
  );
}

export async function rescheduleAll(s: Store) {
  // Evita duas reprogramações ao mesmo tempo.
  if (running) await running.catch(() => {});
  running = (async () => {
    await cancelOurs();
    if (!s.settings.notifications) return;
    const ok = await ensurePermission(false);
    if (!ok) return;

    let failures = 0;
    let lastErr = '';
    const items = buildItems(s);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        await scheduleSafe({
          identifier: `${PREFIX}${i}`,
          content: { title: item.title, body: item.body },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: item.date.getTime(),
            channelId: CHANNEL,
          },
        });
      } catch (e) {
        failures++;
        lastErr = errorMessage(e);
      }
    }

    if (s.settings.dailyKm && s.vehicles.length > 0) {
      try {
        await scheduleSafe({
          identifier: `${PREFIX}daily-km`,
          content: {
            title: '🚗 Quantos km você rodou hoje?',
            body: 'Toque para registrar e manter suas previsões em dia.',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: s.settings.dailyHour,
            minute: 0,
            channelId: CHANNEL,
          },
        });
      } catch (e) {
        failures++;
        lastErr = errorMessage(e);
      }
    }

    lastScheduleError = failures ? `${failures} lembrete(s) falharam: ${lastErr}` : null;
    if (failures) console.warn('[GestCar]', lastScheduleError);
  })();
  return running;
}

export type TestResult = { ok: true } | { ok: false; reason: 'permission' | 'error'; detail?: string };

export async function sendTest(): Promise<TestResult> {
  try {
    const ok = await ensurePermission(true);
    if (!ok) return { ok: false, reason: 'permission' };
    await scheduleSafe({
      content: {
        title: '✅ Notificações funcionando',
        body: 'Você vai receber os lembretes do seu carro mesmo com o app fechado.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: CHANNEL,
      },
    });
    return { ok: true };
  } catch (e) {
    const detail = errorMessage(e);
    console.warn('[GestCar] teste de notificação:', detail);
    return { ok: false, reason: 'error', detail };
  }
}

export async function scheduledCount() {
  const list = await Notifications.getAllScheduledNotificationsAsync();
  return list.filter((n) => n.identifier.startsWith(PREFIX)).length;
}
