import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTicket, parseReview, forbiddenPaths } from '../lib/ticket.js';

test('formatea el ticket con título y descripción', () => {
  const text = formatTicket({ identifier: 'APP-1', title: 'Hacer algo', description: 'Criterios' });
  assert.match(text, /APP-1/);
  assert.match(text, /Hacer algo/);
  assert.match(text, /Criterios/);
});

test('un ticket sin descripción lo indica', () => {
  assert.match(formatTicket({ identifier: 'APP-1', title: 'X', description: null }), /Sin descripción/);
});

test('acepta una revisión mergeable válida', () => {
  const r = parseReview('{"mergeable":true,"summary":"Correcto"}');
  assert.deepEqual(r, { mergeable: true, summary: 'Correcto' });
});

test('una revisión negativa conserva el motivo', () => {
  assert.deepEqual(parseReview('{"mergeable":false,"summary":"Falta prueba"}'), {
    mergeable: false,
    summary: 'Falta prueba',
  });
});

test('ante duda, nunca es mergeable', () => {
  for (const raw of ['', 'no es json', null, '{"summary":"ok"}', '{"mergeable":"true","summary":"ok"}', '[]']) {
    assert.equal(parseReview(raw).mergeable, false, String(raw));
  }
});

test('marca como prohibidos los workflows y archivos de secretos', () => {
  assert.deepEqual(forbiddenPaths(['api/health.js', '.github/workflows/x.yml', '.env.local', 'scripts/a.mjs']), [
    '.github/workflows/x.yml',
    '.env.local',
  ]);
});

test('no marca archivos normales', () => {
  assert.deepEqual(forbiddenPaths(['api/health.js', 'tests/health.test.js']), []);
});
