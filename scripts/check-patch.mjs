// Corre desde un checkout limpio de main. Rechaza parches con rutas fuera de la lista o enlaces simbólicos.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { rejectedPatchPaths } from '../lib/ticket.js';

const { PATCH_FILE } = process.env;
if (/^(new file mode|new mode) 120000/m.test(readFileSync(PATCH_FILE, 'utf8'))) {
  console.error('El parche contiene enlaces simbólicos');
  process.exit(1);
}
const out = execFileSync('git', ['apply', '--numstat', PATCH_FILE], { encoding: 'utf8' });
const paths = out.split('\n').filter(Boolean).map((line) => line.split('\t')[2]);
const rejected = rejectedPatchPaths(paths);
if (rejected.length) {
  console.error('Rutas no permitidas:', rejected.join(', '));
  process.exit(1);
}
console.log(`${paths.length} archivos aceptados`);
