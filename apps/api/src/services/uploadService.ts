import type { FastifyInstance } from "fastify";

// ---------------------------------------------------------------------------
// Upload to Supabase Storage
// ---------------------------------------------------------------------------

export async function uploadToStorage(
  _fastify: FastifyInstance,
  bucket: string,
  path: string,
  base64Data: string,
  contentType: string
): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    const err = new Error("Configuracion de Supabase Storage no disponible") as any;
    err.statusCode = 500;
    throw err;
  }

  // Decode base64 to binary
  const buffer = Buffer.from(base64Data, "base64");

  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": contentType,
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const err = new Error(`Error subiendo archivo: ${errorText}`) as any;
    err.statusCode = response.status;
    throw err;
  }

  // Return public URL
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
