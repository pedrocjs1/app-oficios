import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getAllCategories } from "../services/categoryService.js";

export default async function categoryRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/categories — público, sin auth
  fastify.get(
    "/api/v1/categories",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const categories = await getAllCategories(fastify);
        reply.send({ data: categories });
      } catch (error) {
        reply.status(500).send({
          error: "Internal Server Error",
          message: "Error al obtener categorías",
        });
      }
    }
  );
}
