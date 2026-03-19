import type { FastifyInstance, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate.js";
import { uploadToStorage } from "../services/uploadService.js";

function handleServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const err = error as any;
  if (err.statusCode) {
    return reply.status(err.statusCode).send({ error: "Error", message: err.message });
  }
  throw error;
}

export default async function uploadRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/upload
  fastify.post<{
    Body: { base64: string; bucket: string; path: string; contentType?: string };
  }>(
    "/api/v1/upload",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { base64, bucket, path, contentType } = request.body;

        if (!base64 || !bucket || !path) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Se requieren base64, bucket y path",
          });
        }

        const url = await uploadToStorage(
          fastify,
          bucket,
          path,
          base64,
          contentType ?? "image/jpeg"
        );

        return reply.status(201).send({ url });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
