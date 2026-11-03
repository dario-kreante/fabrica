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

const FORBIDDEN = [/^\.github\//, /(^|\/)\.env(\.|$)/, /(^|\/)\.vercel\//];

export function forbiddenPaths(paths) {
  return paths.filter((p) => FORBIDDEN.some((rule) => rule.test(p)));
}
