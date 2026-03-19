import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  const secret: string = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

  await fastify.register(fastifyJwt, {
    secret,
    sign: {
      expiresIn: "7d",
    },
  });
}

export default fp(authPlugin, {
  name: "auth",
});
