import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate.js";
import {
  listJobs,
  getJob,
  startJob,
  completeJob,
  confirmJob,
} from "../services/jobService.js";

function handleServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const err = error as any;
  if (err.statusCode) {
    return reply.status(err.statusCode).send({ error: "Error", message: err.message });
  }
  throw error;
}

export default async function jobRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/jobs - List jobs
  fastify.get<{ Querystring: { status?: string } }>(
    "/api/v1/jobs",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { status } = request.query;
        const result = await listJobs(fastify, request.user.id, request.user.role, { status });
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // GET /api/v1/jobs/:id - Get single job
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/jobs/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const result = await getJob(fastify, request.params.id, request.user.id, request.user.role);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // PATCH /api/v1/jobs/:id/start - Start job (professional)
  fastify.patch<{ Params: { id: string } }>(
    "/api/v1/jobs/:id/start",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const result = await startJob(fastify, request.params.id, request.user.id);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // PATCH /api/v1/jobs/:id/complete - Mark complete (professional)
  fastify.patch<{ Params: { id: string } }>(
    "/api/v1/jobs/:id/complete",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const result = await completeJob(fastify, request.params.id, request.user.id);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // PATCH /api/v1/jobs/:id/confirm - Confirm completion (client)
  fastify.patch<{ Params: { id: string } }>(
    "/api/v1/jobs/:id/confirm",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const result = await confirmJob(fastify, request.params.id, request.user.id);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
