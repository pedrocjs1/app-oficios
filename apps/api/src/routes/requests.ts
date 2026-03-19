import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { createRequestSchema, updateRequestSchema } from "@oficioya/shared";
import type { CreateRequestInput, UpdateRequestInput } from "@oficioya/shared";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import {
  createRequest,
  listRequests,
  getRequest,
  updateRequest,
  cancelRequest,
} from "../services/requestService.js";

function handleServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "Bad Request",
      message: "Error de validacion",
      details: error.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
  }
  const err = error as any;
  if (err.statusCode) {
    return reply.status(err.statusCode).send({ error: "Error", message: err.message });
  }
  throw error;
}

export default async function requestRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/requests - Create request (client/both)
  fastify.post(
    "/api/v1/requests",
    { preHandler: [authenticate, requireRole("client", "both")] },
    async (request, reply) => {
      try {
        const data = createRequestSchema.parse(request.body) as CreateRequestInput;
        const result = await createRequest(fastify, request.user.id, data);
        return reply.status(201).send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // GET /api/v1/requests - List requests
  fastify.get<{ Querystring: { status?: string; category_id?: string } }>(
    "/api/v1/requests",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { status, category_id } = request.query;
        const result = await listRequests(fastify, request.user.id, request.user.role, { status, category_id });
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // GET /api/v1/requests/:id - Get single request
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/requests/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const result = await getRequest(fastify, request.params.id, request.user.id, request.user.role);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // PATCH /api/v1/requests/:id - Update request (client owner)
  fastify.patch<{ Params: { id: string } }>(
    "/api/v1/requests/:id",
    { preHandler: [authenticate, requireRole("client", "both")] },
    async (request, reply) => {
      try {
        const data = updateRequestSchema.parse(request.body) as UpdateRequestInput;
        const result = await updateRequest(fastify, request.params.id, request.user.id, data);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // DELETE /api/v1/requests/:id - Cancel request (client owner)
  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/requests/:id",
    { preHandler: [authenticate, requireRole("client", "both", "admin")] },
    async (request, reply) => {
      try {
        const result = await cancelRequest(fastify, request.params.id, request.user.id);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
