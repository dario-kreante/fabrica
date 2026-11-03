// Corre desde main. Deja en el ticket el fallo y, si existe, la explicación del generador.
import { existsSync, readFileSync } from 'node:fs';
import { comment } from './linear-client.mjs';
import { formatFailure } from '../lib/ticket.js';

const { ISSUE_ID, RUN_URL, MOTIVO_FILE } = process.env;
const motivo = existsSync(MOTIVO_FILE) ? readFileSync(MOTIVO_FILE, 'utf8') : '';
await comment(ISSUE_ID, formatFailure({ motivo, runUrl: RUN_URL }));
