import type { FastifyRequest, FastifyReply } from "fastify";
import type { JwtPayload } from "../types.js";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    reply.status(401).send({
      error: "Unauthorized",
      message: "Token invalido o expirado",
    });
  }
}
