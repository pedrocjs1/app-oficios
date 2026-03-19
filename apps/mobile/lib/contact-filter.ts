/**
 * Filtro de datos de contacto para el chat de OficioYa.
 * Detecta intentos de compartir teléfonos, emails, redes sociales, etc.
 */

const PHONE_PATTERNS = [
  /(\+?54\s?9?\s?)?(\d[\s.\-]?){7,11}/g,                              // Números argentinos
  /\b(whatsapp|wsp|whats|wp)\b/gi,                                     // WhatsApp
  /\b(insta|instagram)\b/gi,                                           // Instagram
  /\b(face|facebook|fb)\b/gi,                                          // Facebook
  /\b(telegram|tg)\b/gi,                                               // Telegram
  /\b[\w.\-]+@[\w.\-]+\.\w{2,}\b/g,                                  // Email
  /\b(arroba|at)\b/gi,                                                 // "arroba" en texto
  /\b(mi\s+numero|mi\s+cel|mi\s+telefono|llamame|escribime\s+al|contactame|mandame\s+un)\b/gi,
  /\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero|uno)\b.*\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero|uno)\b/gi,
  /\b(alias|cvu|cbu)\s*[:=]?\s*\w+/gi,                               // Datos bancarios MP
];

const REPLACEMENT = '[Información de contacto protegida — OficioYa te protege con garantía y pagos seguros]';

export function filterContactInfo(text: string): {
  filtered: string;
  wasFlagged: boolean;
  reason: string | null;
} {
  let filtered = text;
  let wasFlagged = false;
  const reasons: string[] = [];

  for (const pattern of PHONE_PATTERNS) {
    // Resetear lastIndex para patrones globales
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      wasFlagged = true;
      reasons.push(pattern.source.substring(0, 30));
      pattern.lastIndex = 0;
      filtered = filtered.replace(pattern, REPLACEMENT);
    }
  }

  return {
    filtered,
    wasFlagged,
    reason: wasFlagged ? `Patrones detectados: ${reasons.join(', ')}` : null,
  };
}
