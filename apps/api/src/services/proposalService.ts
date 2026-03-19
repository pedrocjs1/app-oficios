import type { FastifyInstance } from "fastify";
import type { CreateProposalInput } from "@oficioya/shared";

// ---------------------------------------------------------------------------
// Create proposal (professional)
// ---------------------------------------------------------------------------

export async function createProposal(
  fastify: FastifyInstance,
  userId: string,
  requestId: string,
  data: CreateProposalInput
) {
  // Get professional record
  const professional = await fastify.prisma.professional.findUnique({
    where: { userId },
    include: { categories: { select: { categoryId: true } } },
  });

  if (!professional || professional.status !== "verified") {
    const err = new Error("Profesional no verificado") as any;
    err.statusCode = 403;
    throw err;
  }

  // Get request
  const request = await fastify.prisma.serviceRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    const err = new Error("Pedido no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  if (!["open", "in_proposals"].includes(request.status ?? "")) {
    const err = new Error("Este pedido ya no acepta propuestas") as any;
    err.statusCode = 400;
    throw err;
  }

  // Check professional has the right category
  const categoryIds = professional.categories.map((c) => c.categoryId);
  if (request.categoryId && !categoryIds.includes(request.categoryId)) {
    const err = new Error("No tenés la categoría requerida para este pedido") as any;
    err.statusCode = 403;
    throw err;
  }

  // Check max proposals
  if (request.proposalsCount !== null && request.maxProposals !== null &&
      request.proposalsCount >= request.maxProposals) {
    const err = new Error("Este pedido ya alcanzó el máximo de propuestas") as any;
    err.statusCode = 400;
    throw err;
  }

  // Check duplicate
  const existing = await fastify.prisma.proposal.findUnique({
    where: {
      requestId_professionalId: {
        requestId,
        professionalId: professional.id,
      },
    },
  });

  if (existing) {
    const err = new Error("Ya enviaste una propuesta para este pedido") as any;
    err.statusCode = 409;
    throw err;
  }

  const { price, message, estimated_arrival } = data;

  // Create proposal and update request in transaction
  const result = await fastify.prisma.$transaction(async (tx: any) => {
    const proposal = await tx.proposal.create({
      data: {
        requestId,
        professionalId: professional.id,
        price,
        message,
        estimatedArrival: estimated_arrival,
      },
      include: {
        professional: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    // Update request status and count
    await tx.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: "in_proposals",
        proposalsCount: { increment: 1 },
      },
    });

    return proposal;
  });

  return result;
}

// ---------------------------------------------------------------------------
// List proposals for a request
// ---------------------------------------------------------------------------

export async function listProposals(
  fastify: FastifyInstance,
  requestId: string,
  userId: string,
  role: string
) {
  const request = await fastify.prisma.serviceRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    const err = new Error("Pedido no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  // Only client owner or admin can see all proposals
  if (request.clientId !== userId && role !== "admin") {
    const err = new Error("No autorizado") as any;
    err.statusCode = 403;
    throw err;
  }

  return fastify.prisma.proposal.findMany({
    where: { requestId },
    include: {
      professional: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Get single proposal
// ---------------------------------------------------------------------------

export async function getProposal(
  fastify: FastifyInstance,
  proposalId: string,
  userId: string,
  role: string
) {
  const proposal = await fastify.prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      professional: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        },
      },
      request: {
        include: {
          category: true,
          client: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!proposal) {
    const err = new Error("Propuesta no encontrada") as any;
    err.statusCode = 404;
    throw err;
  }

  if (role === "admin") return proposal;
  if (proposal.request?.clientId === userId) return proposal;
  if (proposal.professional?.userId === userId) return proposal;

  const err = new Error("No autorizado") as any;
  err.statusCode = 403;
  throw err;
}

// ---------------------------------------------------------------------------
// Accept proposal (client)
// ---------------------------------------------------------------------------

export async function acceptProposal(
  fastify: FastifyInstance,
  proposalId: string,
  clientId: string
) {
  const proposal = await fastify.prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { request: true },
  });

  if (!proposal) {
    const err = new Error("Propuesta no encontrada") as any;
    err.statusCode = 404;
    throw err;
  }

  if (proposal.request?.clientId !== clientId) {
    const err = new Error("No autorizado") as any;
    err.statusCode = 403;
    throw err;
  }

  if (proposal.status !== "pending") {
    const err = new Error("Esta propuesta ya fue procesada") as any;
    err.statusCode = 400;
    throw err;
  }

  if (!["open", "in_proposals"].includes(proposal.request?.status ?? "")) {
    const err = new Error("Este pedido ya no acepta propuestas") as any;
    err.statusCode = 400;
    throw err;
  }

  const result = await fastify.prisma.$transaction(async (tx: any) => {
    // Accept this proposal
    const accepted = await tx.proposal.update({
      where: { id: proposalId },
      data: { status: "accepted" },
    });

    // Reject all other pending proposals
    await tx.proposal.updateMany({
      where: {
        requestId: proposal.requestId,
        id: { not: proposalId },
        status: "pending",
      },
      data: { status: "rejected" },
    });

    // Update request status
    await tx.serviceRequest.update({
      where: { id: proposal.requestId! },
      data: { status: "assigned" },
    });

    // Create the job
    const job = await tx.job.create({
      data: {
        requestId: proposal.requestId,
        proposalId: proposal.id,
        clientId,
        professionalId: proposal.professionalId,
        agreedPrice: proposal.price,
      },
      include: {
        professional: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        request: { include: { category: true } },
      },
    });

    return { proposal: accepted, job };
  });

  return result;
}

// ---------------------------------------------------------------------------
// Reject proposal (client)
// ---------------------------------------------------------------------------

export async function rejectProposal(
  fastify: FastifyInstance,
  proposalId: string,
  clientId: string
) {
  const proposal = await fastify.prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { request: true },
  });

  if (!proposal) {
    const err = new Error("Propuesta no encontrada") as any;
    err.statusCode = 404;
    throw err;
  }

  if (proposal.request?.clientId !== clientId) {
    const err = new Error("No autorizado") as any;
    err.statusCode = 403;
    throw err;
  }

  if (proposal.status !== "pending") {
    const err = new Error("Esta propuesta ya fue procesada") as any;
    err.statusCode = 400;
    throw err;
  }

  return fastify.prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "rejected" },
  });
}
