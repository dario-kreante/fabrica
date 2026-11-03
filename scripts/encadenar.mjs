// Corre desde main. Ejecuta el plan ticket por ticket: un fallo no frena la cadena, solo a lo que dependía de él.
import { existsSync, readFileSync } from 'node:fs';
import { comment, linear, projectStatus, removeProjectGo } from './linear-client.mjs';
import { canRun, parsePlan, summarize } from '../lib/proyecto.js';
import { QA_STATE } from '../lib/ticket.js';

const { PROJECT_ID, TICKETS_FILE, PLAN_FILE, GITHUB_REPOSITORY, GH_TOKEN, RUN_URL, TRUSTED_REF } = process.env;
const WORKFLOW = 'ticket.yml';
const POLL_MS = 15_000;
const MAX_WAIT_MS = 45 * 60_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function github(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!res.ok) throw new Error(`GitHub respondió ${res.status} en ${path}`);
  return res.status === 204 ? null : res.json();
}

// El título de cada corrida es el identificador del ticket: así se reconoce la que se acaba de lanzar.
async function runTicket(paso) {
  const desde = new Date(Date.now() - 60_000).toISOString();
  await github(`/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: TRUSTED_REF, inputs: { issue_id: paso.issueId, identifier: paso.identifier, model: paso.model } }),
  });
  const limite = Date.now() + MAX_WAIT_MS;
  while (Date.now() < limite) {
    await sleep(POLL_MS);
    const { workflow_runs: runs } = await github(`/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&created=${encodeURIComponent(`>=${desde}`)}&per_page=30`);
    const run = runs.find((r) => r.display_title === paso.identifier);
    if (run?.status === 'completed') return;
  }
  throw new Error(`La corrida de ${paso.identifier} no terminó a tiempo`);
}

// Linear decide el resultado: una corrida verde sin cambios o sin merge no llega a QA.
async function reachedQa(issueId) {
  const { issue } = await linear(`query($id: String!) { issue(id: $id) { state { name } } }`, { id: issueId });
  return issue.state.name === QA_STATE;
}

const tickets = existsSync(TICKETS_FILE) ? JSON.parse(readFileSync(TICKETS_FILE, 'utf8')) : [];
const plan = existsSync(PLAN_FILE) ? parsePlan(readFileSync(PLAN_FILE, 'utf8'), tickets) : null;

try {
  if (tickets.length === 0) {
    await projectStatus(PROJECT_ID, 'La fábrica no encontró tickets pendientes en este proyecto.');
  } else if (!plan) {
    await projectStatus(PROJECT_ID, `El coordinador no entregó un plan válido, así que no se inició ningún ticket. Corrida: ${RUN_URL}`);
    process.exitCode = 1;
  } else {
    const estados = {};
    const resultados = [];
    for (const paso of plan.pasos) {
      let estado = 'saltado';
      if (canRun(paso, estados)) {
        try {
          await runTicket(paso);
          estado = (await reachedQa(paso.issueId)) ? 'qa' : 'incompleto';
        } catch (error) {
          console.error(error.message);
          estado = 'incompleto';
        }
      } else {
        await comment(paso.issueId, `La fábrica no inició este ticket porque depende de ${paso.dependsOn.join(', ')}, que no llegó a QA.`);
      }
      estados[paso.identifier] = estado;
      resultados.push({ identifier: paso.identifier, estado });
      console.log(`${paso.identifier}: ${estado}`);
    }
    for (const omitido of plan.omitidos) {
      await comment(omitido.issueId, `La fábrica no tomó este ticket: ${omitido.motivo}`);
    }
    await projectStatus(PROJECT_ID, `${summarize({ resultados, omitidos: plan.omitidos })}\n\nCorrida: ${RUN_URL}`);
  }
} finally {
  // Al quitarla, agregar la etiqueta otra vez vuelve a lanzar el proyecto.
  await removeProjectGo(PROJECT_ID);
}
