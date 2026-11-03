import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifySignature, isFresh, dispatchTarget, GO_LABEL } from '../lib/linear.js';

const SECRET = 'secreto-de-prueba';
const sign = (raw, secret = SECRET) => createHmac('sha256', secret).update(raw).digest('hex');

test('acepta una firma correcta', () => {
  const raw = '{"a":1}';
  assert.equal(verifySignature(raw, sign(raw), SECRET), true);
});

test('rechaza firma incorrecta, ausente o de otro largo', () => {
  const raw = '{"a":1}';
  assert.equal(verifySignature(raw, sign(raw, 'otro'), SECRET), false);
  assert.equal(verifySignature(raw, null, SECRET), false);
  assert.equal(verifySignature(raw, 'abc', SECRET), false);
});

test('rechaza si no hay secreto configurado', () => {
  assert.equal(verifySignature('{}', sign('{}', ''), ''), false);
});

test('la marca de tiempo vale por un minuto', () => {
  const now = 1_000_000;
  assert.equal(isFresh(now - 30_000, now), true);
  assert.equal(isFresh(now - 61_000, now), false);
  assert.equal(isFresh(now + 61_000, now), false);
  assert.equal(isFresh(undefined, now), false);
});

const ID = '11111111-2222-4333-8444-555555555555';
const LABEL = 'label-go';
const issue = (over = {}) => ({
  type: 'Issue',
  action: 'update',
  data: {
    id: ID,
    identifier: 'APP-1',
    labelIds: [LABEL],
    labels: [{ id: LABEL, name: GO_LABEL }],
  },
  updatedFrom: { labelIds: [] },
  ...over,
});

test('dispara cuando se agrega la etiqueta de go', () => {
  assert.deepEqual(dispatchTarget(issue()), { issueId: ID, identifier: 'APP-1' });
});

test('dispara si el ticket se crea con la etiqueta', () => {
  assert.deepEqual(dispatchTarget(issue({ action: 'create', updatedFrom: undefined })), {
    issueId: ID,
    identifier: 'APP-1',
  });
});

test('no dispara si la etiqueta ya estaba, para no repetir el trabajo', () => {
  assert.equal(dispatchTarget(issue({ updatedFrom: { labelIds: [LABEL] } })), null);
  assert.equal(dispatchTarget(issue({ updatedFrom: { title: 'antes' } })), null);
});

test('no dispara en otros tipos, acciones o etiquetas', () => {
  assert.equal(dispatchTarget(issue({ type: 'Comment' })), null);
  assert.equal(dispatchTarget(issue({ action: 'remove' })), null);
  const data = { ...issue().data, labels: [{ id: LABEL, name: 'bug' }] };
  assert.equal(dispatchTarget(issue({ data })), null);
});

test('rechaza datos con forma inesperada antes de pasarlos a GitHub', () => {
  const bad = { ...issue().data, id: 'x; rm -rf /' };
  assert.equal(dispatchTarget(issue({ data: bad })), null);
  const badKey = { ...issue().data, identifier: '$(whoami)' };
  assert.equal(dispatchTarget(issue({ data: badKey })), null);
});
