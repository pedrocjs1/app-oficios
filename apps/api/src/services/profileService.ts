import type { FastifyInstance } from "fastify";

// ---------------------------------------------------------------------------
// Get user profile
// ---------------------------------------------------------------------------

export async function getProfile(
  fastify: FastifyInstance,
  userId: string
) {
  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    include: {
      professional: {
        include: {
          categories: {
            include: { category: true },
          },
        },
      },
    },
  });

  if (!user) {
    const err = new Error("Usuario no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

// ---------------------------------------------------------------------------
// Update user profile
// ---------------------------------------------------------------------------

export async function updateProfile(
  fastify: FastifyInstance,
  userId: string,
  data: { name?: string; phone?: string; avatar_url?: string }
) {
  const user = await fastify.prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const err = new Error("Usuario no encontrado") as any;
    err.statusCode = 404;
    throw err;
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.avatar_url !== undefined) updateData.avatarUrl = data.avatar_url;

  const updated = await fastify.prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: {
      professional: true,
    },
  });

  const { passwordHash: _, ...safeUser } = updated;
  return safeUser;
}
