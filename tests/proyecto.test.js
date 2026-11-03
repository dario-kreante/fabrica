import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROJECT_GO_LABEL_ID,
  PROJECTS,
  enabledIn,
  projectDispatchTarget,
  pendingTickets,
  parsePlan,
  canRun,
  summarize,
} from '../lib/proyecto.js';

const PROJECT_ID = 'd6f4ad65-28fb-4c01-b1c1-38b9703d762a';

const projectPayload = (over = {}) => ({
  type: 'Project',
  action: 'update',
  data: { id: PROJECT_ID, labelIds: [PROJECT_GO_LABEL_ID] },
  updatedFrom: { labelIds: [] },
  ...over,
});

test('despacha el proyecto cuando la etiqueta de go se acaba de agregar', () => {
  assert.deepEqual(projectDispatchTarget(projectPayload()), { projectId: PROJECT_ID });
});

test('no despacha si el proyecto ya tenía la etiqueta', () => {
  const payload = projectPayload({ updatedFrom: { labelIds: [PROJECT_GO_LABEL_ID] } });
  assert.equal(projectDispatchTarget(payload), null);
});

test('no despacha si el cambio del proyecto no tocó las etiquetas', () => {
  assert.equal(projectDispatchTarget(projectPayload({ updatedFrom: { name: 'Antes' } })), null);
});

test('un proyecto creado con la etiqueta se despacha', () => {
  const payload = projectPayload({ action: 'create', updatedFrom: undefined });
  assert.deepEqual(projectDispatchTarget(payload), { projectId: PROJECT_ID });
});

test('ignora otros tipos de evento e ID con formato inválido', () => {
  assert.equal(projectDispatchTarget(projectPayload({ type: 'Issue' })), null);
  assert.equal(projectDispatchTarget(projectPayload({ data: { id: 'x', labelIds: [PROJECT_GO_LABEL_ID] } })), null);
});

test('el proyecto real con tickets de otros repos no está habilitado', () => {
  assert.equal(enabledIn(PROJECT_ID, 'dario-kreante/fabrica'), true);
  assert.equal(enabledIn('0a85dea0-373d-45b0-ae99-33cc81f99a2e', 'dario-kreante/fabrica'), false);
});

const nodo = (identifier, type, blockers = []) => ({
  id: `id-${identifier}`,
  identifier,
  title: `Título ${identifier}`,
  description: 'Criterios',
  state: { type },
  inverseRelations: { nodes: blockers.map((b) => ({ type: 'blocks', issue: { identifier: b } })) },
});

test('solo quedan pendientes los tickets sin empezar', () => {
  const nodes = [nodo('APP-1', 'backlog'), nodo('APP-2', 'unstarted'), nodo('APP-3', 'started'), nodo('APP-4', 'completed'), nodo('APP-5', 'canceled')];
  assert.deepEqual(pendingTickets(nodes).map((t) => t.identifier), ['APP-1', 'APP-2']);
});

test('los bloqueos se leen de las relaciones del ticket y se ignoran otros tipos', () => {
  const node = nodo('APP-2', 'backlog', ['APP-1']);
  node.inverseRelations.nodes.push({ type: 'related', issue: { identifier: 'APP-9' } });
  assert.deepEqual(pendingTickets([node])[0].blockedBy, ['APP-1']);
});

const tickets = pendingTickets([nodo('APP-1', 'backlog'), nodo('APP-2', 'backlog', ['APP-1']), nodo('APP-3', 'backlog')]);
const paso = (identifier, model = 'claude-sonnet-5-5', dependsOn = []) => ({ identifier, model, dependsOn });

test('un plan válido conserva el orden y toma el ID real del ticket', () => {
  const plan = parsePlan(JSON.stringify({ pasos: [paso('APP-1', 'claude-haiku-5-5'), paso('APP-2')], omitidos: [{ identifier: 'APP-3', motivo: 'Ambiguo' }] }), tickets);
  assert.deepEqual(plan.pasos.map((p) => [p.identifier, p.issueId, p.model]), [
    ['APP-1', 'id-APP-1', 'claude-haiku-5-5'],
    ['APP-2', 'id-APP-2', 'claude-sonnet-5-5'],
  ]);
  assert.deepEqual(plan.omitidos, [{ identifier: 'APP-3', issueId: 'id-APP-3', motivo: 'Ambiguo' }]);
});

test('un bloqueo de Linear cuenta como dependencia aunque el coordinador no la declare', () => {
  const plan = parsePlan(JSON.stringify({ pasos: [paso('APP-1'), paso('APP-2')], omitidos: [{ identifier: 'APP-3', motivo: 'x' }] }), tickets);
  assert.deepEqual(plan.pasos[1].dependsOn, ['APP-1']);
});

test('un ticket que el coordinador no mencionó queda omitido, no se ejecuta', () => {
  const plan = parsePlan(JSON.stringify({ pasos: [paso('APP-1')], omitidos: [] }), tickets);
  assert.deepEqual(plan.pasos.map((p) => p.identifier), ['APP-1']);
  assert.deepEqual(plan.omitidos.map((o) => o.identifier), ['APP-2', 'APP-3']);
});

test('un bloqueo sin ejecutar antes omite también el ticket bloqueado', () => {
  const plan = parsePlan(JSON.stringify({ pasos: [paso('APP-2')], omitidos: [{ identifier: 'APP-1', motivo: 'Ambiguo' }] }), tickets);
  assert.deepEqual(plan.pasos, []);
  assert.deepEqual(plan.omitidos.map((o) => o.identifier).sort(), ['APP-1', 'APP-2', 'APP-3']);
});

test('rechaza el plan completo ante datos que no calzan', () => {
  const invalidos = [
    'no es json',
    JSON.stringify({ omitidos: [] }),
    JSON.stringify({ pasos: [paso('APP-99')], omitidos: [] }),
    JSON.stringify({ pasos: [paso('APP-1'), paso('APP-1')], omitidos: [] }),
    JSON.stringify({ pasos: [paso('APP-1', 'claude-opus-5-5')], omitidos: [] }),
    JSON.stringify({ pasos: [paso('APP-3', undefined, ['APP-1']), paso('APP-1')], omitidos: [] }),
  ];
  for (const raw of invalidos) assert.equal(parsePlan(raw, tickets), null, raw);
});

test('un paso corre solo si sus dependencias llegaron a QA', () => {
  const step = { dependsOn: ['APP-1'] };
  assert.equal(canRun(step, { 'APP-1': 'qa' }), true);
  assert.equal(canRun(step, { 'APP-1': 'incompleto' }), false);
  assert.equal(canRun(step, {}), false);
  assert.equal(canRun({ dependsOn: [] }, {}), true);
});

test('el resumen separa lo que espera QA de lo que necesita atención', () => {
  const text = summarize({
    resultados: [
      { identifier: 'APP-1', estado: 'qa' },
      { identifier: 'APP-2', estado: 'incompleto' },
      { identifier: 'APP-3', estado: 'saltado' },
    ],
    omitidos: [{ identifier: 'APP-4', motivo: 'Ambiguo' }],
  });
  assert.match(text, /QA staging.*APP-1/s);
  assert.match(text, /APP-2/);
  assert.match(text, /APP-3/);
  assert.match(text, /APP-4.*Ambiguo/s);
});

test('un proyecto solo corre en el repo que le corresponde', () => {
  const web = Object.keys(PROJECTS).find((id) => PROJECTS[id].repo === 'dario-kreante/apps-del-sur-web');
  assert.equal(enabledIn(web, 'dario-kreante/apps-del-sur-web'), true);
  assert.equal(enabledIn(web, 'dario-kreante/fabrica'), false);
  assert.equal(enabledIn(PROJECT_ID, 'dario-kreante/apps-del-sur-web'), false);
});
