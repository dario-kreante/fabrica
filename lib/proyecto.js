// Etiqueta de proyecto en Linear. El webhook de proyectos entrega IDs de etiqueta, no nombres.
export const PROJECT_GO_LABEL_ID = 'e2fc8e90-181a-4d84-9d94-1d6d673511ea';

// Dónde vive el código de cada proyecto y cuál es su rama de confianza. Un proyecto nuevo se habilita aquí.
export const ENGINE = { repo: 'dario-kreante/fabrica', ref: 'main' };
export const PROJECTS = {
  'd6f4ad65-28fb-4c01-b1c1-38b9703d762a': ENGINE,
  '49ae49d8-2ad7-48f3-87aa-bbb9849e930f': { repo: 'dario-kreante/apps-del-sur-web', ref: 'master' },
};

export function enabledIn(projectId, repository) {
  return Object.hasOwn(PROJECTS, projectId) && PROJECTS[projectId].repo === repository;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5'];
const PENDING_TYPES = ['backlog', 'unstarted'];

// Devuelve el proyecto a despachar solo cuando la etiqueta de go se acaba de agregar.
export function projectDispatchTarget(payload) {
  if (payload?.type !== 'Project' || !['create', 'update'].includes(payload.action)) return null;
  const { id, labelIds = [] } = payload.data ?? {};
  if (!labelIds.includes(PROJECT_GO_LABEL_ID)) return null;
  if (payload.action === 'update') {
    const before = payload.updatedFrom?.labelIds;
    if (!Array.isArray(before) || before.includes(PROJECT_GO_LABEL_ID)) return null;
  }
  if (!UUID.test(String(id))) return null;
  return { projectId: id };
}

export function pendingTickets(nodes) {
  return nodes
    .filter((node) => PENDING_TYPES.includes(node.state?.type))
    .map((node) => ({
      issueId: node.id,
      identifier: node.identifier,
      title: node.title,
      description: node.description ?? '',
      blockedBy: (node.inverseRelations?.nodes ?? []).filter((r) => r.type === 'blocks').map((r) => r.issue.identifier),
    }));
}

// El plan viene de un modelo que leyó texto de tickets: ante cualquier dato que no calce se rechaza entero.
// Los IDs reales salen de Linear, nunca del plan.
export function parsePlan(raw, tickets) {
  let plan;
  try {
    plan = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(plan?.pasos) || !Array.isArray(plan?.omitidos)) return null;

  const byId = new Map(tickets.map((t) => [t.identifier, t]));
  const orden = plan.pasos.map((p) => p?.identifier);
  const omitidosDeclarados = plan.omitidos.map((o) => o?.identifier);
  const todos = [...orden, ...omitidosDeclarados];
  if (new Set(todos).size !== todos.length || todos.some((id) => !byId.has(id))) return null;

  const pasos = [];
  const omitidos = plan.omitidos.map((o) => ({
    identifier: o.identifier,
    issueId: byId.get(o.identifier).issueId,
    motivo: String(o.motivo ?? 'Sin motivo.'),
  }));
  const ejecutados = new Set();

  for (const [i, paso] of plan.pasos.entries()) {
    const declaradas = paso.dependsOn ?? [];
    if (!MODELS.includes(paso.model) || !Array.isArray(declaradas)) return null;
    if (declaradas.some((dep) => !byId.has(dep) || (orden.includes(dep) && orden.indexOf(dep) >= i))) return null;

    const ticket = byId.get(paso.identifier);
    const bloqueos = ticket.blockedBy.filter((dep) => byId.has(dep));
    const dependsOn = [...new Set([...declaradas, ...bloqueos])];
    const faltante = dependsOn.find((dep) => !ejecutados.has(dep));
    if (faltante) {
      omitidos.push({ identifier: ticket.identifier, issueId: ticket.issueId, motivo: `Depende de ${faltante}, que no se ejecuta antes.` });
      continue;
    }
    ejecutados.add(ticket.identifier);
    pasos.push({ identifier: ticket.identifier, issueId: ticket.issueId, model: paso.model, dependsOn });
  }

  for (const ticket of tickets) {
    if (!todos.includes(ticket.identifier)) {
      omitidos.push({ identifier: ticket.identifier, issueId: ticket.issueId, motivo: 'El coordinador no lo incluyó en el plan.' });
    }
  }
  return { pasos, omitidos };
}

export function canRun(step, estados) {
  return step.dependsOn.every((dep) => estados[dep] === 'qa');
}

export function summarize({ resultados, omitidos }) {
  const lista = (titulo, items) => (items.length ? [`**${titulo}**`, ...items, ''] : []);
  const con = (estado) => resultados.filter((r) => r.estado === estado).map((r) => `- ${r.identifier}`);
  return [
    ...lista('En QA staging, esperan tu revisión', con('qa')),
    ...lista('No se completaron, revisar la corrida en el ticket', con('incompleto')),
    ...lista('No se iniciaron porque dependen de uno que no llegó a QA', con('saltado')),
    ...lista('Omitidos por el coordinador', omitidos.map((o) => `- ${o.identifier}: ${o.motivo}`)),
  ].join('\n').trim();
}
