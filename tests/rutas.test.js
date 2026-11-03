import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeFor } from '../lib/rutas.js';
import { PROJECT_GO_LABEL_ID, PROJECTS } from '../lib/proyecto.js';
import { GO_LABEL } from '../lib/linear.js';

const PRUEBA = 'd6f4ad65-28fb-4c01-b1c1-38b9703d762a';
const WEB = '49ae49d8-2ad7-48f3-87aa-bbb9849e930f';
const OTRO = '0a85dea0-373d-45b0-ae99-33cc81f99a2e';
const ISSUE = '11111111-2222-4333-8444-555555555555';

const ticket = (projectId) => ({
  type: 'Issue',
  action: 'update',
  data: { id: ISSUE, identifier: 'APP-1', projectId, labels: [{ id: 'l', name: GO_LABEL }] },
  updatedFrom: { labelIds: [] },
});
const proyecto = (id) => ({
  type: 'Project',
  action: 'update',
  data: { id, labelIds: [PROJECT_GO_LABEL_ID] },
  updatedFrom: { labelIds: [] },
});

test('el ticket va al repo de su proyecto y a su rama de confianza', () => {
  assert.deepEqual(routeFor(ticket(WEB)), {
    repo: 'dario-kreante/apps-del-sur-web',
    ref: 'master',
    workflow: 'ticket.yml',
    inputs: { issue_id: ISSUE, identifier: 'APP-1' },
  });
  assert.equal(routeFor(ticket(PRUEBA)).repo, 'dario-kreante/fabrica');
});

test('un ticket sin proyecto habilitado no se despacha a ningún repo', () => {
  assert.equal(routeFor(ticket(OTRO)), null);
  assert.equal(routeFor(ticket(undefined)), null);
});

test('el proyecto va a su repo', () => {
  assert.deepEqual(routeFor(proyecto(WEB)), {
    repo: 'dario-kreante/apps-del-sur-web',
    ref: 'master',
    workflow: 'proyecto.yml',
    inputs: { project_id: WEB },
  });
});

test('un proyecto no habilitado va a la fábrica, que avisa y quita la etiqueta', () => {
  assert.deepEqual(routeFor(proyecto(OTRO)), {
    repo: 'dario-kreante/fabrica',
    ref: 'main',
    workflow: 'proyecto.yml',
    inputs: { project_id: OTRO },
  });
});

test('ignora lo demás', () => {
  assert.equal(routeFor({ type: 'Comment', action: 'create', data: {} }), null);
});

test('todo proyecto declara repo y rama', () => {
  for (const destino of Object.values(PROJECTS)) {
    assert.match(destino.repo, /^dario-kreante\/[a-z0-9-]+$/);
    assert.ok(destino.ref);
  }
});
