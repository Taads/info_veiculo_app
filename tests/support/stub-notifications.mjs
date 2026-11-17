// expo-notifications de mentira: guarda o que seria agendado.
export const scheduled = [];
export let failNext = 0;
export function __failNext(n) {
  failNext = n;
}

export const AndroidImportance = { HIGH: 4 };
export const SchedulableTriggerInputTypes = { DATE: 'date', DAILY: 'daily', TIME_INTERVAL: 'timeInterval' };
export function setNotificationHandler() {}
export let channelFails = false;
export function __channelFails(v) {
  channelFails = v;
}
export async function setNotificationChannelAsync() {
  if (channelFails) throw new Error("NullPointerException");
}
export async function getNotificationChannelAsync() {
  return channelFails ? null : { id: "lembretes" };
}
export async function getPermissionsAsync() {
  return { granted: true, canAskAgain: true };
}
export async function requestPermissionsAsync() {
  return { granted: true };
}
export async function getAllScheduledNotificationsAsync() {
  return scheduled.map((s) => ({ identifier: s.identifier ?? 'x' }));
}
export async function cancelScheduledNotificationAsync(id) {
  const i = scheduled.findIndex((s) => s.identifier === id);
  if (i >= 0) scheduled.splice(i, 1);
}
export async function scheduleNotificationAsync(req) {
  if (failNext > 0 && req.trigger && req.trigger.channelId) {
    failNext--;
    throw new Error('Call to function scheduleNotificationAsync has been rejected');
  }
  scheduled.push(req);
  return req.identifier ?? 'id';
}
