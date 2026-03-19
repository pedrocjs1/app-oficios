import type { FastifyInstance } from "fastify";

// ---------------------------------------------------------------------------
// Helper: verify user is participant of a job
// ---------------------------------------------------------------------------

async function verifyJobParticipant(
  fastify: FastifyInstance,
  jobId: string,
  userId: string,
  role: string
) {
  const job = await fastify.prisma.job.findUnique({ where: { id: jobId } });

  if (!job) {
    const err = new Error("Trabajo no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  if (role === "admin") return job;

  // Check if user is the client
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
// Get messages for a job
// ---------------------------------------------------------------------------

export async function getMessages(
  fastify: FastifyInstance,
  jobId: string,
  userId: string,
  role: string
) {
  await verifyJobParticipant(fastify, jobId, userId, role);

  return fastify.prisma.message.findMany({
    where: { jobId },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Send a message
// ---------------------------------------------------------------------------

export async function sendMessage(
  fastify: FastifyInstance,
  jobId: string,
  senderId: string,
  content: string
) {
  const job = await fastify.prisma.job.findUnique({ where: { id: jobId } });

  if (!job) {
    const err = new Error("Trabajo no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  // Verify sender is participant
  let isParticipant = job.clientId === senderId;

  if (!isParticipant) {
    const professional = await fastify.prisma.professional.findUnique({
      where: { userId: senderId },
    });
    isParticipant = !!(professional && job.professionalId === professional.id);
  }

  if (!isParticipant) {
    const err = new Error("No autorizado") as any;
    err.statusCode = 403;
    throw err;
  }

  return fastify.prisma.message.create({
    data: {
      jobId,
      senderId,
      content,
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
}
