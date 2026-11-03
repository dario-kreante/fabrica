// Corre desde main. Rechaza proyectos no habilitados y deja los tickets pendientes como datos para el coordinador.
import { appendFileSync, writeFileSync } from 'node:fs';
import { linear, projectStatus, removeProjectGo } from './linear-client.mjs';
import { enabledIn, pendingTickets } from '../lib/proyecto.js';

const { PROJECT_ID, TICKETS_FILE, GITHUB_OUTPUT, GITHUB_REPOSITORY } = process.env;
const output = (name, value) => appendFileSync(GITHUB_OUTPUT, `${name}=${value}\n`);

if (!enabledIn(PROJECT_ID, GITHUB_REPOSITORY)) {
  await projectStatus(PROJECT_ID, 'La fábrica no está habilitada para este proyecto, así que no tomó ningún ticket.');
  await removeProjectGo(PROJECT_ID);
  output('permitido', 'false');
  output('hay', 'false');
  process.exit(0);
}

const { project } = await linear(
  `query($id: String!) { project(id: $id) { issues(first: 100) { nodes {
    id identifier title description state { type }
    inverseRelations(first: 20) { nodes { type issue { identifier } } }
  } } } }`,
  { id: PROJECT_ID },
);
const tickets = pendingTickets(project.issues.nodes);
writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
output('permitido', 'true');
output('hay', tickets.length > 0 ? 'true' : 'false');
console.log(`${tickets.length} tickets pendientes`);
