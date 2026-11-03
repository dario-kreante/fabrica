import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { traerRamaDeConfianza } from '../lib/sincronizar.js';
import { formatFailure } from '../lib/ticket.js';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();

function commit(cwd, file, content, message) {
  writeFileSync(join(cwd, file), content);
  git(cwd, 'add', file);
  git(cwd, 'commit', '-m', message);
}

// Repo real con origen: master y staging parten del mismo commit y el clon queda en staging.
function repo() {
  const base = mkdtempSync(join(tmpdir(), 'sincronizar-'));
  const origin = join(base, 'origin.git');
  const dev = join(base, 'dev');
  const clone = join(base, 'clone');
  git(base, 'init', '--bare', '-b', 'master', origin);
  git(base, 'clone', origin, dev);
  git(dev, 'config', 'user.name', 'Prueba');
  git(dev, 'config', 'user.email', 'prueba@example.com');
  commit(dev, 'a.txt', 'uno\n', 'inicio');
  git(dev, 'push', 'origin', 'HEAD:master', 'HEAD:staging');
  git(base, 'clone', '-b', 'staging', origin, clone);
  return { origin, dev, clone };
}

const enOrigen = (origin, rama) => git(origin, 'rev-parse', rama);

test('sin cambios en la rama de confianza no toca staging', () => {
  const { origin, clone } = repo();
  const antes = enOrigen(origin, 'staging');
  assert.equal(traerRamaDeConfianza({ cwd: clone, trustedRef: 'master' }), 'al_dia');
  assert.equal(enOrigen(origin, 'staging'), antes);
});

test('staging por delante de la rama de confianza sigue al día', () => {
  const { origin, dev, clone } = repo();
  git(dev, 'fetch', 'origin', 'staging');
  git(dev, 'switch', '-c', 'staging', 'FETCH_HEAD');
  commit(dev, 'b.txt', 'ticket\n', 'ticket');
  git(dev, 'push', 'origin', 'staging');
  git(clone, 'pull', '--ff-only');
  const antes = enOrigen(origin, 'staging');
  assert.equal(traerRamaDeConfianza({ cwd: clone, trustedRef: 'master' }), 'al_dia');
  assert.equal(enOrigen(origin, 'staging'), antes);
});

test('trae a staging lo nuevo de la rama de confianza y no toca esa rama', () => {
  const { origin, dev, clone } = repo();
  commit(dev, 'c.txt', 'arreglo\n', 'arreglo en master');
  git(dev, 'push', 'origin', 'HEAD:master');
  const master = enOrigen(origin, 'master');
  assert.equal(traerRamaDeConfianza({ cwd: clone, trustedRef: 'master' }), 'fusionado');
  git(origin, 'merge-base', '--is-ancestor', master, 'staging');
  assert.equal(enOrigen(origin, 'master'), master);
});

test('un conflicto deja staging intacto y el clon limpio', () => {
  const { origin, dev, clone } = repo();
  const inicio = git(dev, 'rev-parse', 'HEAD');
  commit(dev, 'a.txt', 'master\n', 'cambio en master');
  git(dev, 'push', 'origin', 'HEAD:master');
  git(dev, 'switch', '-c', 'staging', inicio);
  commit(dev, 'a.txt', 'staging\n', 'cambio en staging');
  git(dev, 'push', 'origin', 'staging');
  git(clone, 'pull', '--ff-only');
  const antes = enOrigen(origin, 'staging');
  assert.equal(traerRamaDeConfianza({ cwd: clone, trustedRef: 'master' }), 'conflicto');
  assert.equal(enOrigen(origin, 'staging'), antes);
  assert.equal(git(clone, 'status', '--porcelain'), '');
});

test('informa cuando GitHub rechaza la subida', () => {
  const { origin, dev, clone } = repo();
  commit(dev, 'c.txt', 'arreglo\n', 'arreglo en master');
  git(dev, 'push', 'origin', 'HEAD:master');
  const hook = join(origin, 'hooks', 'pre-receive');
  writeFileSync(hook, '#!/bin/sh\nexit 1\n');
  chmodSync(hook, 0o755);
  assert.equal(traerRamaDeConfianza({ cwd: clone, trustedRef: 'master' }), 'rechazado');
});

test('el aviso explica el conflicto con la rama de confianza', () => {
  const texto = formatFailure({ sync: 'conflicto', trustedRef: 'master', runUrl: 'https://x/1' });
  assert.match(texto, /conflicto/);
  assert.match(texto, /master/);
  assert.match(texto, /https:\/\/x\/1/);
});

test('el aviso explica la subida rechazada', () => {
  assert.match(formatFailure({ sync: 'rechazado', trustedRef: 'master', runUrl: 'https://x/1' }), /rechaz/);
});

test('sin problema de sincronización el aviso sigue igual', () => {
  assert.equal(formatFailure({ sync: 'fusionado', trustedRef: 'master', runUrl: 'https://x/1' }), formatFailure({ runUrl: 'https://x/1' }));
});
