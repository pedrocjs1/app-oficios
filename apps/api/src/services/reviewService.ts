import type { FastifyInstance } from "fastify";

// ---------------------------------------------------------------------------
// Create review
// ---------------------------------------------------------------------------

export async function createReview(
  fastify: FastifyInstance,
  jobId: string,
  reviewerId: string,
  data: { rating: number; comment?: string }
) {
  const job = await fastify.prisma.job.findUnique({
    where: { id: jobId },
    include: {
      professional: true,
    },
  });

  if (!job) {
    const err = new Error("Trabajo no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  if (job.status !== "confirmed") {
    const err = new Error("El trabajo debe estar confirmado para dejar una reseña") as any;
    err.statusCode = 400;
    throw err;
  }

  // Verify reviewer is a participant
  let isParticipant = job.clientId === reviewerId;
  let reviewedId: string | null = null;

  if (isParticipant) {
    // Client reviewing the professional's user
    reviewedId = job.professional?.userId ?? null;
  } else {
    // Check if reviewer is the professional
    const professional = await fastify.prisma.professional.findUnique({
      where: { userId: reviewerId },
    });
    if (professional && job.professionalId === professional.id) {
      isParticipant = true;
      reviewedId = job.clientId;
    }
  }

  if (!isParticipant) {
    const err = new Error("No autorizado") as any;
    err.statusCode = 403;
    throw err;
  }

  // Check for duplicate review
  const existing = await fastify.prisma.review.findUnique({
    where: {
      jobId_reviewerId: { jobId, reviewerId },
    },
  });

  if (existing) {
    const err = new Error("Ya dejaste una reseña para este trabajo") as any;
    err.statusCode = 409;
    throw err;
  }

  // Create review and update professional ratings in a transaction
  return fastify.prisma.$transaction(async (tx: any) => {
    const review = await tx.review.create({
      data: {
        jobId,
        reviewerId,
        reviewedId,
        rating: data.rating,
        comment: data.comment ?? null,
      },
    });

    // Update professional's rating if the reviewed person is a professional
    // (i.e., the client left the review)
    if (job.professionalId && job.clientId === reviewerId) {
      const allReviews = await tx.review.findMany({
        where: {
          reviewedId: job.professional?.userId,
        },
        select: { rating: true },
      });

      const totalRatings = allReviews.length;
      const sumRatings = allReviews.reduce(
        (sum: number, r: { rating: number | null }) => sum + (r.rating ?? 0),
        0
      );
      const avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

      await tx.professional.update({
        where: { id: job.professionalId },
        data: {
          ratingAvg: Math.round(avgRating * 100) / 100,
          ratingCount: totalRatings,
        },
      });
    }

    return review;
  });
}
