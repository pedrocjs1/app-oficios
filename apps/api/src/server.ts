import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import authPlugin from "./plugins/auth.js";
import prismaPlugin from "./plugins/prisma.js";
import snakeCasePlugin from "./plugins/snakeCase.js";
import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/categories.js";
import requestRoutes from "./routes/requests.js";
import proposalRoutes from "./routes/proposals.js";
import jobRoutes from "./routes/jobs.js";
import messageRoutes from "./routes/messages.js";
import reviewRoutes from "./routes/reviews.js";
import earningsRoutes from "./routes/earnings.js";
import profileRoutes from "./routes/profile.js";
import uploadRoutes from "./routes/upload.js";
import adminRoutes from "./routes/admin.js";

const PORT: number = Number(process.env.PORT) || 3001;
const HOST: string = process.env.HOST ?? "0.0.0.0";

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  // --- Plugins ---
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  await fastify.register(authPlugin);
  await fastify.register(prismaPlugin);
  await fastify.register(snakeCasePlugin);

  // --- Routes ---
  await fastify.register(authRoutes);
  await fastify.register(categoryRoutes);
  await fastify.register(requestRoutes);
  await fastify.register(proposalRoutes);
  await fastify.register(jobRoutes);
  await fastify.register(messageRoutes);
  await fastify.register(reviewRoutes);
  await fastify.register(earningsRoutes);
  await fastify.register(profileRoutes);
  await fastify.register(uploadRoutes);
  await fastify.register(adminRoutes);

  // --- Health Check ---
  fastify.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  return fastify;
}

async function start(): Promise<void> {
  const server = await buildServer();

  try {
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Servidor OficioYa API corriendo en http://${HOST}:${PORT}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

start();
