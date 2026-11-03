// Corre desde main de la fábrica, sobre un checkout de staging. No ejecuta código del proyecto.
import { appendFileSync } from 'node:fs';
import { traerRamaDeConfianza } from '../lib/sincronizar.js';

const estado = traerRamaDeConfianza({ cwd: process.env.GITHUB_WORKSPACE, trustedRef: process.env.TRUSTED_REF });
console.log(`Sincronización: ${estado}`);
appendFileSync(process.env.GITHUB_OUTPUT, `estado=${estado}\n`);
if (estado === 'conflicto' || estado === 'rechazado') process.exit(1);
