import type { FastifyInstance, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate.js";
import { getMessages, sendMessage } from "../services/messageService.js";

function handleServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const err = error as any;
  if (err.statusCode) {
    return reply.status(err.statusCode).send({ error: "Error", message: err.message });
  }
  throw error;
}

export default async function messageRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/jobs/:jobId/messages
  fastify.get<{ Params: { jobId: string } }>(
    "/api/v1/jobs/:jobId/messages",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const result = await getMessages(
          fastify,
          request.params.jobId,
          request.user.id,
          request.user.role
        );
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // POST /api/v1/jobs/:jobId/messages
  fastify.post<{ Params: { jobId: string }; Body: { content: string } }>(
    "/api/v1/jobs/:jobId/messages",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { content } = request.body;

        if (!content || typeof content !== "string" || content.trim().length === 0) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "El contenido del mensaje es requerido",
          });
        }

        const result = await sendMessage(
          fastify,
          request.params.jobId,
          request.user.id,
          content.trim()
        );
        return reply.status(201).send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
