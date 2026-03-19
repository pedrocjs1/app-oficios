import type { FastifyInstance, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate.js";
import { getProfile, updateProfile } from "../services/profileService.js";

function handleServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const err = error as any;
  if (err.statusCode) {
    return reply.status(err.statusCode).send({ error: "Error", message: err.message });
  }
  throw error;
}

export default async function profileRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/profile
  fastify.get(
    "/api/v1/profile",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const result = await getProfile(fastify, request.user.id);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // PATCH /api/v1/profile
  fastify.patch<{ Body: { name?: string; phone?: string; avatar_url?: string } }>(
    "/api/v1/profile",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const result = await updateProfile(fastify, request.user.id, request.body);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
