import { execFileSync } from 'node:child_process';

const IDENTIDAD = ['-c', 'user.name=Fábrica Apps del Sur', '-c', 'user.email=166410362+dario-kreante@users.noreply.github.com'];

// Trae a la rama actual lo nuevo de la rama de confianza. Nunca escribe en la rama de confianza ni resuelve conflictos.
export function traerRamaDeConfianza({ cwd, trustedRef, branch = 'staging' }) {
  const git = (...args) => execFileSync('git', [...IDENTIDAD, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' });
  git('fetch', 'origin', `refs/heads/${trustedRef}`);
  const nuevo = git('rev-parse', 'FETCH_HEAD').trim();
  try {
    git('merge-base', '--is-ancestor', nuevo, 'HEAD');
    return 'al_dia';
  } catch {
    // Hay commits que traer.
  }
  try {
    git('merge', '--no-edit', '-m', `chore: traer ${trustedRef} a ${branch}`, nuevo);
  } catch {
    git('merge', '--abort');
    return 'conflicto';
  }
  try {
    git('push', 'origin', `HEAD:refs/heads/${branch}`);
  } catch {
    return 'rechazado';
  }
  return 'fusionado';
}
