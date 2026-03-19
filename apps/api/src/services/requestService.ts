import type { FastifyInstance } from "fastify";
import type { CreateRequestInput, UpdateRequestInput } from "@oficioya/shared";

// ---------------------------------------------------------------------------
// Create service request (client)
// ---------------------------------------------------------------------------

export async function createRequest(
  fastify: FastifyInstance,
  clientId: string,
  data: CreateRequestInput
) {
  const { category_id, problem_type, description, urgency, location, address_text, photos } = data;

  // Verify category exists
  const category = await fastify.prisma.category.findUnique({
    where: { id: category_id },
  });
  if (!category) {
    const err = new Error("Categoría no encontrada") as any;
    err.statusCode = 404;
    throw err;
  }

  const request = await fastify.prisma.serviceRequest.create({
    data: {
      clientId,
      categoryId: category_id,
      problemType: problem_type,
      description,
      urgency,
      addressText: address_text,
      photos: photos ?? [],
    },
    include: {
      category: true,
      client: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return request;
}

// ---------------------------------------------------------------------------
// List service requests
// ---------------------------------------------------------------------------

export async function listRequests(
  fastify: FastifyInstance,
  userId: string,
  role: string,
  filters: { status?: string; category_id?: string }
) {
  if (role === "client" || role === "both") {
    // Client sees their own requests
    return fastify.prisma.serviceRequest.findMany({
      where: {
        clientId: userId,
        ...(filters.status ? { status: filters.status as any } : {}),
      },
      include: {
        category: true,
        proposals: {
          select: { id: true, price: true, status: true, professionalId: true },
        },
        _count: { select: { proposals: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  if (role === "professional") {
    // Professional sees open requests for their categories
    const professional = await fastify.prisma.professional.findUnique({
      where: { userId },
      include: { categories: { select: { categoryId: true } } },
    });

    if (!professional || professional.status !== "verified") {
      const err = new Error("Profesional no verificado") as any;
      err.statusCode = 403;
      throw err;
    }

    const categoryIds = professional.categories.map((c) => c.categoryId);

    return fastify.prisma.serviceRequest.findMany({
      where: {
        status: { in: ["open", "in_proposals"] },
        categoryId: { in: categoryIds },
        ...(filters.category_id ? { categoryId: filters.category_id } : {}),
      },
      include: {
        category: true,
        client: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { proposals: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  if (role === "admin") {
    return fastify.prisma.serviceRequest.findMany({
      where: {
        ...(filters.status ? { status: filters.status as any } : {}),
        ...(filters.category_id ? { categoryId: filters.category_id } : {}),
      },
      include: {
        category: true,
        client: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { proposals: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return [];
}

// ---------------------------------------------------------------------------
// Get single request
// ---------------------------------------------------------------------------

export async function getRequest(
  fastify: FastifyInstance,
  requestId: string,
  userId: string,
  role: string
) {
  const request = await fastify.prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      category: true,
      client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
      proposals: {
        include: {
          professional: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { proposals: true } },
    },
  });

  if (!request) {
    const err = new Error("Pedido no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  // Authorization: client sees own, professional sees open ones for their category, admin sees all
  if (role === "admin") return request;
  if (request.clientId === userId) return request;

  if (role === "professional") {
    const professional = await fastify.prisma.professional.findUnique({
      where: { userId },
      include: { categories: { select: { categoryId: true } } },
    });
    const categoryIds = professional?.categories.map((c) => c.categoryId) ?? [];
    if (
      request.categoryId &&
      categoryIds.includes(request.categoryId) &&
      ["open", "in_proposals"].includes(request.status ?? "")
    ) {
      // Don't expose other proposals to professionals
      const { proposals, ...rest } = request;
      const ownProposal = proposals.filter((p) => p.professionalId === professional?.id);
      return { ...rest, proposals: ownProposal };
    }
  }

  const err = new Error("No autorizado para ver este pedido") as any;
  err.statusCode = 403;
  throw err;
}

// ---------------------------------------------------------------------------
// Update request (client owner, only if open)
// ---------------------------------------------------------------------------

export async function updateRequest(
  fastify: FastifyInstance,
  requestId: string,
  clientId: string,
  data: UpdateRequestInput
) {
  const existing = await fastify.prisma.serviceRequest.findUnique({
    where: { id: requestId },
  });

  if (!existing) {
    const err = new Error("Pedido no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  if (existing.clientId !== clientId) {
    const err = new Error("No autorizado") as any;
    err.statusCode = 403;
    throw err;
  }

  if (existing.status !== "open") {
    const err = new Error("Solo se pueden editar pedidos abiertos") as any;
    err.statusCode = 400;
    throw err;
  }

  const updateData: any = {};
  if (data.problem_type) updateData.problemType = data.problem_type;
  if (data.description) updateData.description = data.description;
  if (data.urgency) updateData.urgency = data.urgency;
  if (data.address_text) updateData.addressText = data.address_text;
  if (data.photos) updateData.photos = data.photos;
  if (data.category_id) {
    const category = await fastify.prisma.category.findUnique({
      where: { id: data.category_id },
    });
    if (!category) {
      const err = new Error("Categoría no encontrada") as any;
      err.statusCode = 404;
      throw err;
    }
    updateData.categoryId = data.category_id;
  }

  return fastify.prisma.serviceRequest.update({
    where: { id: requestId },
    data: updateData,
    include: {
      category: true,
      client: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Cancel request (client owner)
// ---------------------------------------------------------------------------

export async function cancelRequest(
  fastify: FastifyInstance,
  requestId: string,
  clientId: string
) {
  const existing = await fastify.prisma.serviceRequest.findUnique({
    where: { id: requestId },
  });

  if (!existing) {
    const err = new Error("Pedido no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  if (existing.clientId !== clientId) {
    const err = new Error("No autorizado") as any;
    err.statusCode = 403;
    throw err;
  }

  if (["completed", "cancelled", "in_progress"].includes(existing.status ?? "")) {
    const err = new Error("No se puede cancelar un pedido en este estado") as any;
    err.statusCode = 400;
    throw err;
  }

  // Cancel all pending proposals
  await fastify.prisma.proposal.updateMany({
    where: { requestId, status: "pending" },
    data: { status: "rejected" },
  });

  return fastify.prisma.serviceRequest.update({
    where: { id: requestId },
    data: { status: "cancelled" },
    include: { category: true },
  });
}
