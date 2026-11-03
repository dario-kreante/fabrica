export function GET() {
  return Response.json({ ok: true });
}

function noPermitido() {
  return new Response('método no permitido', { status: 405, headers: { Allow: 'GET' } });
}

export const POST = noPermitido;
export const PUT = noPermitido;
export const PATCH = noPermitido;
export const DELETE = noPermitido;
export const OPTIONS = noPermitido;
