import type { FastifyInstance, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate.js";
import { createReview } from "../services/reviewService.js";

function handleServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const err = error as any;
  if (err.statusCode) {
    return reply.status(err.statusCode).send({ error: "Error", message: err.message });
  }
  throw error;
}

export default async function reviewRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/jobs/:jobId/review
  fastify.post<{ Params: { jobId: string }; Body: { rating: number; comment?: string } }>(
    "/api/v1/jobs/:jobId/review",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { rating, comment } = request.body;

        if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "El rating debe ser un numero entre 1 y 5",
          });
        }

        const result = await createReview(fastify, request.params.jobId, request.user.id, {
          rating,
          comment,
        });
        return reply.status(201).send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
