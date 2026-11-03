// Falla si el generador tocó archivos que la fábrica no le permite cambiar.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { forbiddenPaths } from '../lib/ticket.js';

const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
const paths = out.split('\n').filter(Boolean).map((line) => line.slice(3).trim());
const forbidden = forbiddenPaths(paths);
if (forbidden.length) {
  console.error('Archivos no permitidos:', forbidden.join(', '));
  process.exit(1);
}
appendFileSync(process.env.GITHUB_OUTPUT, `changed=${paths.length > 0}\n`);
console.log(`${paths.length} archivos cambiados`);
