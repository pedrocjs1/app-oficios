import type { FastifyInstance, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import { getEarnings } from "../services/earningsService.js";

function handleServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const err = error as any;
  if (err.statusCode) {
    return reply.status(err.statusCode).send({ error: "Error", message: err.message });
  }
  throw error;
}

export default async function earningsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/earnings
  fastify.get(
    "/api/v1/earnings",
    { preHandler: [authenticate, requireRole("professional", "both")] },
    async (request, reply) => {
      try {
        const result = await getEarnings(fastify, request.user.id);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
