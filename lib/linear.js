import { createHmac, timingSafeEqual } from 'node:crypto';

export const GO_LABEL = 'fabrica:go';

const MAX_AGE_MS = 60_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDENTIFIER = /^[A-Z][A-Z0-9]*-\d+$/;

export function verifySignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(String(signature), 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function isFresh(webhookTimestamp, now = Date.now()) {
  return Number.isFinite(webhookTimestamp) && Math.abs(now - webhookTimestamp) <= MAX_AGE_MS;
}

// Devuelve el ticket a despachar solo cuando la etiqueta de go se acaba de agregar.
// Los valores salen hacia GitHub, así que se validan contra un formato cerrado.
export function dispatchTarget(payload) {
  if (payload?.type !== 'Issue' || !['create', 'update'].includes(payload.action)) return null;
  const { id, identifier, projectId, labels = [] } = payload.data ?? {};
  const label = labels.find((l) => l?.name === GO_LABEL);
  if (!label) return null;
  if (payload.action === 'update') {
    const before = payload.updatedFrom?.labelIds;
    if (!Array.isArray(before) || before.includes(label.id)) return null;
  }
  if (!UUID.test(String(id)) || !IDENTIFIER.test(String(identifier))) return null;
  return { issueId: id, identifier, ...(UUID.test(String(projectId)) ? { projectId } : {}) };
}
