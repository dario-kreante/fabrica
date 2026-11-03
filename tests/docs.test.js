import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = readFileSync(new URL('../docs/endpoints.md', import.meta.url), 'utf8');
const lines = doc.split('\n');

test('docs/endpoints.md describe GET /api/health en una línea', () => {
  assert.ok(lines.some((l) => l.includes('GET /api/health')));
});

test('docs/endpoints.md describe POST /api/linear-webhook en una línea', () => {
  assert.ok(lines.some((l) => l.includes('POST /api/linear-webhook')));
});
