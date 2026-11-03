import { dispatchTarget } from './linear.js';
import { ENGINE, PROJECTS, projectDispatchTarget } from './proyecto.js';

// Decide a qué repo va cada aviso. Un ticket sin proyecto habilitado no corre en ningún lado.
export function routeFor(payload) {
  const ticket = dispatchTarget(payload);
  if (ticket) {
    const destino = Object.hasOwn(PROJECTS, ticket.projectId) ? PROJECTS[ticket.projectId] : null;
    if (!destino) return null;
    return { ...destino, workflow: 'ticket.yml', inputs: { issue_id: ticket.issueId, identifier: ticket.identifier } };
  }
  const project = projectDispatchTarget(payload);
  if (!project) return null;
  // La fábrica recibe los no habilitados para avisar en el proyecto y quitar la etiqueta.
  const destino = Object.hasOwn(PROJECTS, project.projectId) ? PROJECTS[project.projectId] : ENGINE;
  return { ...destino, workflow: 'proyecto.yml', inputs: { project_id: project.projectId } };
}
