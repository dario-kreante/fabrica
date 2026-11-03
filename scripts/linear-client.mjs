export async function linear(query, variables) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { Authorization: process.env.LINEAR_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(`Linear respondió ${res.status}: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
}

export const comment = (issueId, body) =>
  linear(`mutation($issueId: String!, $body: String!) { commentCreate(input: { issueId: $issueId, body: $body }) { success } }`, {
    issueId,
    body,
  });
