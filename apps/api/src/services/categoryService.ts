import type { FastifyInstance } from "fastify";

export async function getAllCategories(fastify: FastifyInstance): Promise<any[]> {
  const categories = await fastify.prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return categories;
}
