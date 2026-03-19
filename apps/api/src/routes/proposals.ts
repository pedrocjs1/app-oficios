import type { FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { createProposalSchema } from "@oficioya/shared";
import type { CreateProposalInput } from "@oficioya/shared";
import { authenticate } from "../middleware/authenticate.js";
import { requireRole } from "../middleware/authorize.js";
import {
  createProposal,
  listProposals,
  getProposal,
  acceptProposal,
  rejectProposal,
} from "../services/proposalService.js";

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

export default async function proposalRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/requests/:requestId/proposals - Create proposal (professional)
  fastify.post<{ Params: { requestId: string } }>(
    "/api/v1/requests/:requestId/proposals",
    { preHandler: [authenticate, requireRole("professional", "both")] },
    async (request, reply) => {
      try {
        const data = createProposalSchema.parse(request.body) as CreateProposalInput;
        const result = await createProposal(fastify, request.user.id, request.params.requestId, data);
        return reply.status(201).send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // GET /api/v1/requests/:requestId/proposals - List proposals for a request
  fastify.get<{ Params: { requestId: string } }>(
    "/api/v1/requests/:requestId/proposals",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const result = await listProposals(fastify, request.params.requestId, request.user.id, request.user.role);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // GET /api/v1/proposals/:id - Get single proposal
  fastify.get<{ Params: { id: string } }>(
    "/api/v1/proposals/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const result = await getProposal(fastify, request.params.id, request.user.id, request.user.role);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // PATCH /api/v1/proposals/:id/accept - Accept proposal (client)
  fastify.patch<{ Params: { id: string } }>(
    "/api/v1/proposals/:id/accept",
    { preHandler: [authenticate, requireRole("client", "both")] },
    async (request, reply) => {
      try {
        const result = await acceptProposal(fastify, request.params.id, request.user.id);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // PATCH /api/v1/proposals/:id/reject - Reject proposal (client)
  fastify.patch<{ Params: { id: string } }>(
    "/api/v1/proposals/:id/reject",
    { preHandler: [authenticate, requireRole("client", "both")] },
    async (request, reply) => {
      try {
        const result = await rejectProposal(fastify, request.params.id, request.user.id);
        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
