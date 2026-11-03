import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = readFileSync(new URL('../docs/estados.md', import.meta.url), 'utf8');
const lines = doc.split('\n');

for (const estado of ['Todo', 'In Progress', 'QA staging']) {
  test(`docs/estados.md menciona ${estado} en una línea`, () => {
    assert.ok(lines.some((l) => l.includes(estado)));
  });
}

test('docs/estados.md aclara que QA staging aplica solo con el cambio desplegado en staging', () => {
  assert.ok(lines.some((l) => l.includes('QA staging') && l.includes('desplegado en staging')));
});
