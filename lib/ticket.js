export function formatTicket({ identifier, title, description }) {
  return `# ${identifier}: ${title}\n\n${description || 'Sin descripción.'}\n`;
}

const MAX_MOTIVO = 2000;
const CREDENCIAL = /\b(sk-|ghp_|gho_|ghs_|github_pat_|lin_api_|lin_oauth_|xox[a-z]-|pat[A-Za-z0-9]{10})[\w.-]*|[A-Za-z0-9+/_=-]{40,}/g;
const ENLACE = /!?\[[^\]]*\]\([^)]*\)|\b[a-z][a-z0-9+.-]*:\/\/\S+/gi;

// El motivo lo escribe un modelo que leyó datos externos: se publica como texto, sin credenciales ni enlaces.
export function sanitizeMotivo(motivo) {
  return String(motivo ?? '').replace(ENLACE, '[enlace oculto]').replace(CREDENCIAL, '[oculto]').trim().slice(0, MAX_MOTIVO);
}

const FALLOS_SINCRONIZACION = {
  conflicto: (rama) => `La fábrica no empezó este ticket: hay un conflicto al traer ${rama} a staging y hay que resolverlo a mano.`,
  rechazado: (rama) => `La fábrica no empezó este ticket: GitHub rechazó subir a staging lo traído de ${rama}.`,
};

export function formatFailure({ motivo, runUrl, sync, trustedRef }) {
  if (Object.hasOwn(FALLOS_SINCRONIZACION, sync ?? '')) return `${FALLOS_SINCRONIZACION[sync](trustedRef)} Corrida: ${runUrl}`;
  const base = `La fábrica no completó este ticket y no pasó a QA. Revisar la corrida: ${runUrl}`;
  const limpio = sanitizeMotivo(motivo);
  return limpio ? `${base}\n\nExplicación del generador:\n${limpio}` : base;
}

// Ante cualquier duda sobre el resultado del revisor, el cambio no es mergeable.
export function parseReview(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.mergeable === true || parsed?.mergeable === false) {
      return { mergeable: parsed.mergeable, summary: String(parsed.summary ?? '') };
    }
  } catch {
    // Se trata igual que un resultado ausente.
  }
  return { mergeable: false, summary: 'El revisor no entregó un resultado válido.' };
}

const DEFAULT_DIRS = ['api', 'lib', 'tests', 'docs'];
const FORBIDDEN_DIRS = ['scripts', 'node_modules'];

// Cada proyecto declara sus carpetas en su workflow. Nunca una raíz, una ruta anidada ni una carpeta oculta.
export function parseAllowedDirs(raw) {
  if (raw === undefined || raw === '') return DEFAULT_DIRS;
  const dirs = raw.split(',').map((dir) => dir.trim());
  const bad = dirs.filter((dir) => !/^[a-z0-9][a-z0-9_-]*$/.test(dir) || FORBIDDEN_DIRS.includes(dir));
  if (bad.length) throw new Error(`Carpetas no permitidas: ${bad.join(', ')}`);
  return dirs;
}

// Lista cerrada: el generador no puede tocar lo que después corre con privilegios.
export function rejectedPatchPaths(paths, dirs = DEFAULT_DIRS) {
  const allowed = new RegExp(`^(${dirs.join('|')})/[^{}]*$`);
  return paths.filter((p) => !allowed.test(p) || p.split('/').includes('..') || p.includes('=>'));
}

// Recibe la salida de `git apply --summary`. Solo se permiten archivos normales y ejecutables.
export function unsafeModes(summary) {
  return summary.split('\n').filter((line) => {
    const modes = line.match(/\b\d{6}\b/g) ?? [];
    return modes.some((mode) => mode !== '100644' && mode !== '100755');
  });
}

export const QA_STATE = 'QA staging';

export function findQaState(states) {
  return states.find((state) => state.name === QA_STATE);
}

// QA también es de tipo started, pero significa que ya está desplegado: al arrancar nunca se elige.
export function findWorkingState(states) {
  return (
    states.find((state) => state.name === 'In Progress') ??
    states.find((state) => state.name !== QA_STATE)
  );
}
