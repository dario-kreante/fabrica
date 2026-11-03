import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as health from '../api/health.js';

test('GET /api/health responde 200 con {"ok":true}', async () => {
  const res = await health.GET(new Request('http://x/api/health'));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test('otros métodos responden 405', async () => {
  for (const m of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const res = await health[m](new Request('http://x/api/health', { method: m }));
    assert.equal(res.status, 405, m);
  }
});
