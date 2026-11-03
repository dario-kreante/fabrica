export function formatTicket({ identifier, title, description }) {
  return `# ${identifier}: ${title}\n\n${description || 'Sin descripción.'}\n`;
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

const ALLOWED = /^(api|lib|tests|docs)\/[^{}]*$/;

// Lista cerrada: el generador no puede tocar lo que después corre con privilegios.
export function rejectedPatchPaths(paths) {
  return paths.filter((p) => !ALLOWED.test(p) || p.split('/').includes('..') || p.includes('=>'));
}

// Recibe la salida de `git apply --summary`. Solo se permiten archivos normales y ejecutables.
export function unsafeModes(summary) {
  return summary.split('\n').filter((line) => {
    const modes = line.match(/\b\d{6}\b/g) ?? [];
    return modes.some((mode) => mode !== '100644' && mode !== '100755');
  });
}
