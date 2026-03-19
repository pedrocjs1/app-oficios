import type { FastifyInstance } from "fastify";

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export async function getDashboardStats(fastify: FastifyInstance) {
  const [
    totalUsers,
    totalProfessionals,
    pendingVerification,
    activeRequests,
    completedJobs,
  ] = await Promise.all([
    fastify.prisma.user.count(),
    fastify.prisma.professional.count(),
    fastify.prisma.professional.count({
      where: { status: "pending_verification" },
    }),
    fastify.prisma.serviceRequest.count({
      where: {
        status: { in: ["open", "in_proposals", "assigned", "in_progress"] },
      },
    }),
    fastify.prisma.job.count({
      where: { status: "confirmed" },
    }),
  ]);

  return {
    totalUsers,
    totalProfessionals,
    pendingVerification,
    activeRequests,
    completedJobs,
  };
}

// ---------------------------------------------------------------------------
// List professionals
// ---------------------------------------------------------------------------

export async function listProfessionals(
  fastify: FastifyInstance,
  filter: "pending" | "verified" | "all"
) {
  const where: any = {};

  if (filter === "pending") {
    where.status = "pending_verification";
  } else if (filter === "verified") {
    where.status = "verified";
  }

  return fastify.prisma.professional.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          createdAt: true,
        },
      },
      categories: {
        include: { category: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Approve professional
// ---------------------------------------------------------------------------

export async function approveProfessional(
  fastify: FastifyInstance,
  professionalId: string,
  categoryIds: string[]
) {
  const professional = await fastify.prisma.professional.findUnique({
    where: { id: professionalId },
  });

  if (!professional) {
    const err = new Error("Profesional no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  return fastify.prisma.$transaction(async (tx: any) => {
    const updated = await tx.professional.update({
      where: { id: professionalId },
      data: {
        verified: true,
        status: "verified",
      },
    });

    // Sync categories: delete existing and create new ones
    await tx.professionalCategory.deleteMany({
      where: { professionalId },
    });

    if (categoryIds && categoryIds.length > 0) {
      await tx.professionalCategory.createMany({
        data: categoryIds.map((catId: string) => ({
          professionalId,
          categoryId: catId,
        })),
      });
    }

    return tx.professional.findUnique({
      where: { id: professionalId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        categories: {
          include: { category: true },
        },
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Reject professional
// ---------------------------------------------------------------------------

export async function rejectProfessional(
  fastify: FastifyInstance,
  professionalId: string
) {
  const professional = await fastify.prisma.professional.findUnique({
    where: { id: professionalId },
  });

  if (!professional) {
    const err = new Error("Profesional no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  return fastify.prisma.professional.update({
    where: { id: professionalId },
    data: {
      verified: false,
      status: "suspended",
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// List users
// ---------------------------------------------------------------------------

export async function listUsers(
  fastify: FastifyInstance,
  filters: { role?: string; search?: string }
) {
  const where: any = {};

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return fastify.prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// List requests (admin)
// ---------------------------------------------------------------------------

export async function listRequestsAdmin(
  fastify: FastifyInstance,
  filter: "active" | "completed" | "all"
) {
  const where: any = {};

  if (filter === "active") {
    where.status = { in: ["open", "in_proposals", "assigned", "in_progress"] };
  } else if (filter === "completed") {
    where.status = { in: ["completed", "cancelled"] };
  }

  return fastify.prisma.serviceRequest.findMany({
    where,
    include: {
      client: {
        select: { id: true, name: true, email: true },
      },
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
