import type { PrismaClient } from "@prisma/client";
import type { JWT } from "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: {
      id: string;
      email: string;
      role: string;
    };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    jwt: JWT;
  }
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: string;
}
