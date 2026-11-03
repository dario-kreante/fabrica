import { verifySignature, isFresh, dispatchTarget } from '../lib/linear.js';
import { projectDispatchTarget } from '../lib/proyecto.js';

const REPO = 'dario-kreante/fabrica';

function dispatchFor(payload) {
  const ticket = dispatchTarget(payload);
  if (ticket) return { workflow: 'ticket.yml', inputs: { issue_id: ticket.issueId, identifier: ticket.identifier } };
  const project = projectDispatchTarget(payload);
  if (project) return { workflow: 'proyecto.yml', inputs: { project_id: project.projectId } };
  return null;
}

export async function POST(request) {
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get('linear-signature'), process.env.LINEAR_WEBHOOK_SECRET)) {
    return new Response('firma inválida', { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response('cuerpo inválido', { status: 400 });
  }
  if (!isFresh(payload.webhookTimestamp)) return new Response('expirado', { status: 401 });

  const target = dispatchFor(payload);
  if (!target) return new Response('ignorado', { status: 200 });

  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${target.workflow}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_DISPATCH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main', inputs: target.inputs }),
  });

  if (!res.ok) {
    console.error('GitHub rechazó el despacho', res.status);
    return new Response('no se pudo despachar', { status: 502 });
  }
  return new Response('despachado', { status: 200 });
}
