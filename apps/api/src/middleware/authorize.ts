import type { FastifyRequest, FastifyReply } from "fastify";

export function requireRole(
  ...roles: string[]
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async function authorizeRole(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const userRole: string | undefined = request.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      reply.status(403).send({
        error: "Forbidden",
        message: `Se requiere uno de los siguientes roles: ${roles.join(", ")}`,
      });
    }
  };
}
