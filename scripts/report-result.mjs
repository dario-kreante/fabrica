// Corre desde main. Si el revisor aprueba, fusiona hacia staging y pasa el ticket a QA. Nunca toca main.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { comment, linear } from './linear-client.mjs';
import { parseReview, findQaState, QA_STATE } from '../lib/ticket.js';

const { ISSUE_ID, REVIEW_FILE, PR_URL, RUN_URL, HEAD_SHA } = process.env;
let raw = '';
try {
  raw = readFileSync(REVIEW_FILE, 'utf8');
} catch {
  // parseReview lo trata como no mergeable.
}
const review = parseReview(raw);

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

if (!review.mergeable) {
  await comment(ISSUE_ID, `PR: ${PR_URL}\nRevisor: No mergeable. ${review.summary}\nQueda abierto para tu revisión.\nCorrida: ${RUN_URL}`);
  console.log('No mergeable');
} else {
  execFileSync('gh', ['pr', 'merge', PR_URL, '--squash', '--delete-branch', '--match-head-commit', HEAD_SHA], { stdio: 'inherit' });
  await moveToQa();
  await comment(ISSUE_ID, `PR: ${PR_URL}\nRevisor: Mergeable. ${review.summary}\nFusionado a staging y listo para tu QA.\nCorrida: ${RUN_URL}`);
  console.log('Fusionado a staging');
}
