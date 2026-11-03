import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = readFileSync(new URL('../docs/glosario.md', import.meta.url), 'utf8');
const lines = doc.split('\n');

for (const termino of ['generador', 'revisor', 'coordinador', 'qa staging']) {
  test(`docs/glosario.md define ${termino} en una línea`, () => {
    assert.ok(lines.some((l) => l.toLowerCase().includes(termino)));
  });
}
