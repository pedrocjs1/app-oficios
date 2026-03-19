import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const REPLACEMENT = '[Información de contacto protegida — OficioYa te protege con garantía y pagos seguros]';

const PATTERNS = [
  // Teléfonos argentinos (numéricos)
  /(\+?54\s?9?\s?)?(\d[\s.\-]?){7,11}/g,
  // Redes sociales / apps de mensajería
  /\b(whatsapp|wsp|whats|wp|insta|instagram|face|facebook|fb|telegram|tg|tiktok)\b/gi,
  // Email
  /\b[\w.\-]+@[\w.\-]+\.\w{2,}\b/g,
  // "arroba" en texto
  /\b(arroba|at)\b/gi,
  // Frases que invitan a contactar
  /\b(mi\s+numero|mi\s+cel(ular)?|mi\s+tel(efono)?|llamame|escribime\s+al|contactame|mandame\s+un|pasame\s+el)\b/gi,
  // Números escritos en letras (dos o más)
  /\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero|uno)\b.*\b(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|cero|uno)\b/gi,
  // Datos bancarios MP
  /\b(alias|cvu|cbu)\s*[:=]?\s*[\w.\-]+/gi,
];

function filterContent(text: string): { filtered: string; flagged: boolean; reason: string | null } {
  let filtered = text;
  let flagged = false;
  const reasons: string[] = [];

  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      flagged = true;
      reasons.push(pattern.source.substring(0, 40));
      pattern.lastIndex = 0;
      filtered = filtered.replace(pattern, REPLACEMENT);
    }
  }

  return {
    filtered,
    flagged,
    reason: flagged ? reasons.join(' | ') : null,
  };
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'content requerido' }), { status: 400 });
    }

    const result = filterContent(content);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('moderate-message error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
