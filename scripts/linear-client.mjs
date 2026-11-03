import { PROJECT_GO_LABEL_ID } from '../lib/proyecto.js';

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

export const projectStatus = (projectId, body) =>
  linear(`mutation($input: ProjectUpdateCreateInput!) { projectUpdateCreate(input: $input) { success } }`, {
    input: { projectId, body },
  });

export async function removeProjectGo(projectId) {
  const { project } = await linear(`query($id: String!) { project(id: $id) { labels { nodes { id } } } }`, { id: projectId });
  const labelIds = project.labels.nodes.map((l) => l.id).filter((id) => id !== PROJECT_GO_LABEL_ID);
  await linear(`mutation($id: String!, $input: ProjectUpdateInput!) { projectUpdate(id: $id, input: $input) { success } }`, {
    id: projectId,
    input: { labelIds },
  });
}

export const comment = (issueId, body) =>
  linear(`mutation($issueId: String!, $body: String!) { commentCreate(input: { issueId: $issueId, body: $body }) { success } }`, {
    issueId,
    body,
  });
