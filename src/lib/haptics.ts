// Vibração dos toques. Alguns aparelhos recusam a chamada; aqui isso nunca vira erro na tela.

import * as H from 'expo-haptics';

const quiet = (p: Promise<unknown>) => {
  p.catch(() => {});
};

export const Haptics = {
  ImpactFeedbackStyle: H.ImpactFeedbackStyle,
  NotificationFeedbackType: H.NotificationFeedbackType,
  selectionAsync: () => quiet(H.selectionAsync()),
  impactAsync: (style?: H.ImpactFeedbackStyle) => quiet(H.impactAsync(style)),
  notificationAsync: (type?: H.NotificationFeedbackType) => quiet(H.notificationAsync(type)),
};
