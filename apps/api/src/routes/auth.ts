import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import {
  loginSchema,
  registerSchema,
  registerProfessionalSchema,
} from "@oficioya/shared";
import type { LoginInput, RegisterInput, RegisterProfessionalInput } from "@oficioya/shared";
import { authenticate } from "../middleware/authenticate.js";
import {
  registerUser,
  registerProfessional,
  loginUser,
  getUserProfile,
} from "../services/authService.js";

// ---------------------------------------------------------------------------
// Helper: handle known service errors
// ---------------------------------------------------------------------------

function handleServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "Bad Request",
      message: "Error de validacion",
      details: error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  const err = error as any;
  if (err.statusCode) {
    return reply.status(err.statusCode).send({
      error: err.statusCode === 409 ? "Conflict" : err.statusCode === 401 ? "Unauthorized" : "Error",
      message: err.message,
    });
  }

  throw error; // let Fastify's default error handler deal with unexpected errors
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /api/v1/auth/register
  fastify.post(
    "/api/v1/auth/register",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = registerSchema.parse(request.body) as RegisterInput;
        const result = await registerUser(fastify, data);

        return reply.status(201).send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // POST /api/v1/auth/register-professional
  fastify.post(
    "/api/v1/auth/register-professional",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = registerProfessionalSchema.parse(request.body) as RegisterProfessionalInput;
        const result = await registerProfessional(fastify, data);

        return reply.status(201).send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // POST /api/v1/auth/login
  fastify.post(
    "/api/v1/auth/login",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, password } = loginSchema.parse(request.body) as LoginInput;
        const result = await loginUser(fastify, email, password);

        return reply.send(result);
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );

  // GET /api/v1/auth/me
  fastify.get(
    "/api/v1/auth/me",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = await getUserProfile(fastify, request.user.id);

        return reply.send({ user });
      } catch (error) {
        return handleServiceError(error, reply);
      }
    }
  );
}
