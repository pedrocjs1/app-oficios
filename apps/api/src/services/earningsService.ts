import type { FastifyInstance } from "fastify";

// ---------------------------------------------------------------------------
// Get professional earnings data
// ---------------------------------------------------------------------------

export async function getEarnings(
  fastify: FastifyInstance,
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

  // Get completed jobs with payments, categories, and reviews
  const jobs = await fastify.prisma.job.findMany({
    where: {
      professionalId: professional.id,
      status: "confirmed",
    },
    include: {
      payments: true,
      request: {
        include: {
          category: true,
        },
      },
      reviews: true,
      client: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
    orderBy: { confirmedAt: "desc" },
    take: 20,
  });

  return {
    professional: {
      balanceDue: professional.balanceDue,
      jobsCompleted: professional.jobsCompleted,
      ratingAvg: professional.ratingAvg,
      ratingCount: professional.ratingCount,
    },
    jobs,
  };
}
