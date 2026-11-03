// Corre desde un checkout limpio de main y solo lee el parche, con el parser de git.
import { execFileSync } from 'node:child_process';
import { parseAllowedDirs, rejectedPatchPaths, unsafeModes } from '../lib/ticket.js';

const { PATCH_FILE, ALLOWED_DIRS } = process.env;
const git = (...args) => execFileSync('git', ['apply', ...args, PATCH_FILE], { encoding: 'utf8' });

const unsafe = unsafeModes(git('--summary'));
if (unsafe.length) {
  console.error('Modos de archivo no permitidos:', unsafe.join('; '));
  process.exit(1);
}
const paths = git('--numstat').split('\n').filter(Boolean).map((line) => line.split('\t')[2]);
const rejected = rejectedPatchPaths(paths, parseAllowedDirs(ALLOWED_DIRS));
if (rejected.length) {
  console.error('Rutas no permitidas:', rejected.join(', '));
  process.exit(1);
}
console.log(`${paths.length} archivos aceptados`);
