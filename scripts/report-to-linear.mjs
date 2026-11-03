// Primera prueba del ciclo: GitHub Actions pasa el ticket a En curso y lo informa en Linear.
const { LINEAR_API_KEY, ISSUE_ID, IDENTIFIER, RUN_URL } = process.env;

async function linear(query, variables) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { Authorization: LINEAR_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(`Linear respondió ${res.status}: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
}

const { issue } = await linear(
  `query($id: String!) { issue(id: $id) { team { states(filter: { type: { eq: "started" } }) { nodes { id } } } } }`,
  { id: ISSUE_ID },
);
const stateId = issue.team.states.nodes[0]?.id;
if (!stateId) throw new Error('El equipo no tiene un estado de tipo started');

await linear(
  `mutation($id: String!, $stateId: String!) { issueUpdate(id: $id, input: { stateId: $stateId }) { success } }`,
  { id: ISSUE_ID, stateId },
);
await linear(
  `mutation($issueId: String!, $body: String!) { commentCreate(input: { issueId: $issueId, body: $body }) { success } }`,
  { issueId: ISSUE_ID, body: `La fábrica recibió ${IDENTIFIER}. Corrida: ${RUN_URL}` },
);
console.log(`${IDENTIFIER} actualizado en Linear`);
