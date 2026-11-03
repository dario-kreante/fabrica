import { verifySignature, isFresh } from '../lib/linear.js';
import { routeFor } from '../lib/rutas.js';

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

  const target = routeFor(payload);
  if (!target) return new Response('ignorado', { status: 200 });

  const res = await fetch(`https://api.github.com/repos/${target.repo}/actions/workflows/${target.workflow}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_DISPATCH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: target.ref, inputs: target.inputs }),
  });

  if (!res.ok) {
    console.error('GitHub rechazó el despacho', target.repo, res.status);
    return new Response('no se pudo despachar', { status: 502 });
  }
  return new Response('despachado', { status: 200 });
}
