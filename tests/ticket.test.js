import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTicket, parseReview, rejectedPatchPaths, unsafeModes, findQaState, findWorkingState, QA_STATE } from '../lib/ticket.js';

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

test('solo acepta cambios en api, lib, tests y docs', () => {
  assert.deepEqual(rejectedPatchPaths(['api/health.js', 'lib/a.js', 'tests/a.test.js', 'docs/a.md']), []);
});

test('rechaza lo que corre con privilegios o define la ejecución', () => {
  const bad = ['package.json', 'package-lock.json', 'scripts/x.mjs', '.github/workflows/x.yml', '.env', 'vercel.json', '.npmrc'];
  assert.deepEqual(rejectedPatchPaths(bad), bad);
});

test('rechaza rutas engañosas', () => {
  const bad = ['api/../scripts/x.mjs', 'tests/{a => ../../x}', '/etc/passwd'];
  assert.deepEqual(rejectedPatchPaths(bad), bad);
});

test('acepta archivos normales y ejecutables en el resumen del parche', () => {
  assert.deepEqual(unsafeModes(' create mode 100644 api/a.js\n create mode 100755 api/b.sh\n delete mode 100644 api/c.js\n'), []);
  assert.deepEqual(unsafeModes(' mode change 100644 => 100755 api/a.js\n'), []);
});

test('rechaza enlaces simbólicos y submódulos', () => {
  assert.equal(unsafeModes(' create mode 120000 tests/link\n').length, 1);
  assert.equal(unsafeModes(' create mode 160000 tests/sub\n').length, 1);
  assert.equal(unsafeModes(' mode change 100644 => 120000 api/a.js\n').length, 1);
});

test('encuentra el estado de QA por nombre', () => {
  const states = [{ id: '1', name: 'Todo' }, { id: '2', name: QA_STATE }];
  assert.equal(findQaState(states)?.id, '2');
});

test('si el estado de QA no existe, lo indica para crearlo', () => {
  assert.equal(findQaState([{ id: '1', name: 'Todo' }]), undefined);
});

test('al arrancar elige In Progress aunque QA aparezca primero', () => {
  const states = [{ id: '1', name: QA_STATE }, { id: '2', name: 'In Progress' }];
  assert.equal(findWorkingState(states)?.id, '2');
});

test('si In Progress no existe, usa otro estado iniciado que no sea QA', () => {
  const states = [{ id: '1', name: QA_STATE }, { id: '2', name: 'En curso' }];
  assert.equal(findWorkingState(states)?.id, '2');
});

test('al arrancar nunca elige QA, aunque sea el único estado iniciado', () => {
  assert.equal(findWorkingState([{ id: '1', name: QA_STATE }]), undefined);
});
