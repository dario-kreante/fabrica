// Informa en Linear el resultado del revisor y marca el PR. No fusiona nada.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { comment } from './linear-client.mjs';
import { parseReview } from '../lib/ticket.js';

const { ISSUE_ID, REVIEW_FILE, PR_URL, RUN_URL } = process.env;
let raw = '';
try {
  raw = readFileSync(REVIEW_FILE, 'utf8');
} catch {
  // parseReview lo trata como no mergeable.
}
const review = parseReview(raw);
const verdict = review.mergeable ? 'Mergeable' : 'No mergeable';

execFileSync('gh', ['pr', 'comment', PR_URL, '--body', `**Revisor con contexto limpio: ${verdict}**\n\n${review.summary}`], {
  stdio: 'inherit',
});
await comment(ISSUE_ID, `PR: ${PR_URL}\nRevisor: ${verdict}. ${review.summary}\nCorrida: ${RUN_URL}`);
console.log(verdict);
