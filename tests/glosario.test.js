import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = readFileSync(new URL('../docs/glosario.md', import.meta.url), 'utf8');
const lines = doc.split('\n');

for (const termino of ['generador', 'revisor', 'coordinador', 'qa staging', 'puente', 'motor']) {
  test(`docs/glosario.md define ${termino} en una línea`, () => {
    assert.ok(lines.some((l) => l.toLowerCase().includes(termino)));
  });
}

test('docs/glosario.md define motor como el flujo reutilizable que cada repo llama con su configuración', () => {
  const linea = lines.find((l) => /^- Motor:/i.test(l));
  assert.ok(linea, 'falta la línea "- Motor: ..."');
  assert.match(linea.toLowerCase(), /flujo reutilizable/);
  assert.match(linea.toLowerCase(), /cada repo llama con su configuración/);
});
