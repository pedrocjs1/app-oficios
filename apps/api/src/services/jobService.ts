import type { FastifyInstance } from "fastify";

// ---------------------------------------------------------------------------
// List jobs (by role)
// ---------------------------------------------------------------------------

export async function listJobs(
  fastify: FastifyInstance,
  userId: string,
  role: string,
  filters: { status?: string }
) {
  const where: any = {};

  if (role === "client" || role === "both") {
    where.clientId = userId;
  } else if (role === "professional") {
    const professional = await fastify.prisma.professional.findUnique({
      where: { userId },
    });
    if (!professional) {
      const err = new Error("Profesional no encontrado") as any;
      err.statusCode = 404;
      throw err;
    }
    where.professionalId = professional.id;
  }
  // admin: no filter on user

  if (filters.status) {
    where.status = filters.status;
  }

  return fastify.prisma.job.findMany({
    where,
    include: {
      request: { include: { category: true } },
      client: { select: { id: true, name: true, avatarUrl: true } },
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
// Get single job
// ---------------------------------------------------------------------------

export async function getJob(
  fastify: FastifyInstance,
  jobId: string,
  userId: string,
  role: string
) {
  const job = await fastify.prisma.job.findUnique({
    where: { id: jobId },
    include: {
      request: { include: { category: true } },
      client: { select: { id: true, name: true, avatarUrl: true, phone: true } },
      professional: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        },
      },
      proposal: true,
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      reviews: true,
    },
  });

  if (!job) {
    const err = new Error("Trabajo no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  if (role === "admin") return job;
  if (job.clientId === userId) return job;

  // Check if user is the professional
  const professional = await fastify.prisma.professional.findUnique({
    where: { userId },
  });
  if (professional && job.professionalId === professional.id) return job;

  const err = new Error("No autorizado") as any;
  err.statusCode = 403;
  throw err;
}

// ---------------------------------------------------------------------------
// Start job (professional)
// ---------------------------------------------------------------------------

export async function startJob(
  fastify: FastifyInstance,
  jobId: string,
  userId: string
) {
  const professional = await fastify.prisma.professional.findUnique({
    where: { userId },
  });

  if (!professional) {
    const err = new Error("Profesional no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  const job = await fastify.prisma.job.findUnique({ where: { id: jobId } });

  if (!job) {
    const err = new Error("Trabajo no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  if (job.professionalId !== professional.id) {
    const err = new Error("No autorizado") as any;
    err.statusCode = 403;
    throw err;
  }

  if (job.status !== "pending_start") {
    const err = new Error("El trabajo no está en estado pendiente de inicio") as any;
    err.statusCode = 400;
    throw err;
  }

  return fastify.prisma.$transaction(async (tx: any) => {
    const updated = await tx.job.update({
      where: { id: jobId },
      data: {
        status: "in_progress",
        startedAt: new Date(),
      },
      include: {
        request: { include: { category: true } },
        client: { select: { id: true, name: true } },
      },
    });

    // Update request status too
    if (job.requestId) {
      await tx.serviceRequest.update({
        where: { id: job.requestId },
        data: { status: "in_progress" },
      });
    }

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Complete job (professional marks as done)
// ---------------------------------------------------------------------------

export async function completeJob(
  fastify: FastifyInstance,
  jobId: string,
  userId: string
) {
  const professional = await fastify.prisma.professional.findUnique({
    where: { userId },
  });

  if (!professional) {
    const err = new Error("Profesional no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  const job = await fastify.prisma.job.findUnique({ where: { id: jobId } });

  if (!job) {
    const err = new Error("Trabajo no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  if (job.professionalId !== professional.id) {
    const err = new Error("No autorizado") as any;
    err.statusCode = 403;
    throw err;
  }

  if (job.status !== "in_progress") {
    const err = new Error("El trabajo debe estar en progreso para completarlo") as any;
    err.statusCode = 400;
    throw err;
  }

  return fastify.prisma.job.update({
    where: { id: jobId },
    data: {
      status: "completed_by_professional",
      completedAt: new Date(),
    },
    include: {
      request: { include: { category: true } },
      client: { select: { id: true, name: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Confirm job completion (client)
// ---------------------------------------------------------------------------

export async function confirmJob(
  fastify: FastifyInstance,
  jobId: string,
  clientId: string
) {
  const job = await fastify.prisma.job.findUnique({ where: { id: jobId } });

  if (!job) {
    const err = new Error("Trabajo no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  if (job.clientId !== clientId) {
    const err = new Error("No autorizado") as any;
    err.statusCode = 403;
    throw err;
  }

  if (job.status !== "completed_by_professional") {
    const err = new Error("El profesional aún no marcó el trabajo como completado") as any;
    err.statusCode = 400;
    throw err;
  }

  return fastify.prisma.$transaction(async (tx: any) => {
    const updated = await tx.job.update({
      where: { id: jobId },
      data: {
        status: "confirmed",
        confirmedAt: new Date(),
      },
      include: {
        request: { include: { category: true } },
        professional: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Update request status
    if (job.requestId) {
      await tx.serviceRequest.update({
        where: { id: job.requestId },
        data: { status: "completed" },
      });
    }

    // Increment professional's jobs_completed
    if (job.professionalId) {
      await tx.professional.update({
        where: { id: job.professionalId },
        data: { jobsCompleted: { increment: 1 } },
      });
    }

    return updated;
  });
}
