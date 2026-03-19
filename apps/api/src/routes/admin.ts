import type { FastifyInstance, FastifyReply } from "fastify";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import {
  getDashboardStats,
  listProfessionals,
  approveProfessional,
  rejectProfessional,
  listUsers,
  listRequestsAdmin,
} from "../services/adminService.js";

function handleServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const err = error as any;
  if (err.statusCode) {
    return reply.status(err.statusCode).send({ error: "Error", message: err.message });
  }
  throw error;
}

export default async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/admin/dashboard
  fastify.get(
    "/api/v1/admin/dashboard",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, reply) => {
      try {
        const result = await getDashboardStats(fastify);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // GET /api/v1/admin/professionals
  fastify.get<{ Querystring: { filter?: string } }>(
    "/api/v1/admin/professionals",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, reply) => {
      try {
        const filter = (request.query.filter ?? "all") as "pending" | "verified" | "all";
        const result = await listProfessionals(fastify, filter);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // PATCH /api/v1/admin/professionals/:id/approve
  fastify.patch<{ Params: { id: string }; Body: { category_ids: string[] } }>(
    "/api/v1/admin/professionals/:id/approve",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, reply) => {
      try {
        const { category_ids } = request.body;

        if (!category_ids || !Array.isArray(category_ids)) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Se requiere category_ids como array",
          });
        }

        const result = await approveProfessional(
          fastify,
          request.params.id,
          category_ids
        );
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // PATCH /api/v1/admin/professionals/:id/reject
  fastify.patch<{ Params: { id: string } }>(
    "/api/v1/admin/professionals/:id/reject",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, reply) => {
      try {
        const result = await rejectProfessional(fastify, request.params.id);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // GET /api/v1/admin/users
  fastify.get<{ Querystring: { role?: string; search?: string } }>(
    "/api/v1/admin/users",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, reply) => {
      try {
        const { role, search } = request.query;
        const result = await listUsers(fastify, { role, search });
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // GET /api/v1/admin/requests
  fastify.get<{ Querystring: { filter?: string } }>(
    "/api/v1/admin/requests",
    { preHandler: [authenticate, requireRole("admin")] },
    async (request, reply) => {
      try {
        const filter = (request.query.filter ?? "all") as "active" | "completed" | "all";
        const result = await listRequestsAdmin(fastify, filter);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
