// Pasa el ticket a QA solo cuando staging ya está desplegado, y deja la URL para probar.
import { comment, linear } from './linear-client.mjs';
import { findQaState, QA_STATE } from '../lib/ticket.js';

const { ISSUE_ID, STAGING_URL } = process.env;

async function moveToQa() {
  const { issue } = await linear(`query($id: String!) { issue(id: $id) { team { id states { nodes { id name } } } } }`, {
    id: ISSUE_ID,
  });
  let state = findQaState(issue.team.states.nodes);
  if (!state) {
    const created = await linear(
      `mutation($input: WorkflowStateCreateInput!) { workflowStateCreate(input: $input) { workflowState { id name } } }`,
      { input: { teamId: issue.team.id, name: QA_STATE, type: 'started', color: '#0E7A63' } },
    );
    state = created.workflowStateCreate.workflowState;
  }
  await linear(`mutation($id: String!, $stateId: String!) { issueUpdate(id: $id, input: { stateId: $stateId }) { success } }`, {
    id: ISSUE_ID,
    stateId: state.id,
  });
}

await moveToQa();
await comment(ISSUE_ID, `Staging desplegado y listo para tu QA: ${STAGING_URL}`);
