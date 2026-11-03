// Corre desde main. Si el revisor aprueba, fusiona hacia staging. Nunca toca main.
import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { comment } from './linear-client.mjs';
import { parseReview } from '../lib/ticket.js';

const { ISSUE_ID, REVIEW_FILE, PR_URL, RUN_URL, HEAD_SHA } = process.env;
let raw = '';
try {
  raw = readFileSync(REVIEW_FILE, 'utf8');
} catch {
  // parseReview lo trata como no mergeable.
}
const review = parseReview(raw);

if (!review.mergeable) {
  await comment(ISSUE_ID, `PR: ${PR_URL}\nRevisor: No mergeable. ${review.summary}\nQueda abierto para tu revisión.\nCorrida: ${RUN_URL}`);
  console.log('No mergeable');
} else {
  execFileSync('gh', ['pr', 'merge', PR_URL, '--squash', '--delete-branch', '--match-head-commit', HEAD_SHA], { stdio: 'inherit' });
  await comment(ISSUE_ID, `PR: ${PR_URL}\nRevisor: Mergeable. ${review.summary}\nFusionado a staging; falta su despliegue.\nCorrida: ${RUN_URL}`);
  appendFileSync(process.env.GITHUB_OUTPUT, 'merged=true\n');
  console.log('Fusionado a staging');
}
