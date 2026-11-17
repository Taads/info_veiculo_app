// Caso real visto no Expo Go: o Android recusa criar o canal (NullPointerException).
// Os lembretes precisam continuar funcionando, sem apontar para um canal inexistente.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sendTest } from '@/lib/notifications';

import { __channelFails, scheduled } from './support/stub-notifications.mjs';

describe('canal de notificação recusado pelo Android', () => {
  it('agenda o teste sem canal e não dá erro', async () => {
    __channelFails(true);
    const res = await sendTest();
    assert.deepEqual(res, { ok: true });
    assert.equal(scheduled.length, 1);
    assert.equal(scheduled[0].trigger.channelId, undefined, 'não pode usar canal que não existe');
  });
});
