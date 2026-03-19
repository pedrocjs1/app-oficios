import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import type { RegisterInput, RegisterProfessionalInput } from "@oficioya/shared";

const SALT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// JWT helper
// ---------------------------------------------------------------------------

export function generateToken(
  fastify: FastifyInstance,
  user: { id: string; role: string; email: string }
): string {
  return fastify.jwt.sign({
    userId: user.id,
    role: user.role,
    email: user.email,
  });
}

// ---------------------------------------------------------------------------
// Register (client)
// ---------------------------------------------------------------------------

export async function registerUser(
  fastify: FastifyInstance,
  data: RegisterInput
): Promise<{ user: any; token: string }> {
  const { email, password, name, phone, role } = data;

  const existing = await fastify.prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error("Ya existe una cuenta con ese email") as any;
    err.statusCode = 409;
    throw err;
  }

  const hashed = await hashPassword(password);

  const user = await fastify.prisma.user.create({
    data: {
      email,
      passwordHash: hashed,
      name,
      phone,
      role,
    },
  });

  const token = generateToken(fastify, {
    id: user.id,
    role: user.role,
    email: user.email,
  });

  const { passwordHash: _, ...safeUser } = user;

  return { user: safeUser, token };
}

// ---------------------------------------------------------------------------
// Register (professional)
// ---------------------------------------------------------------------------

export async function registerProfessional(
  fastify: FastifyInstance,
  data: RegisterProfessionalInput
): Promise<{ user: any; token: string }> {
  const { email, password, name, phone, role, license_number, bio, categories } = data;

  const existing = await fastify.prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error("Ya existe una cuenta con ese email") as any;
    err.statusCode = 409;
    throw err;
  }

  const hashed = await hashPassword(password);

  const result = await fastify.prisma.$transaction(async (tx: any) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash: hashed,
        name,
        phone,
        role: role ?? "professional",
      },
    });

    const professional = await tx.professional.create({
      data: {
        userId: user.id,
        licenseNumber: license_number,
        bio: bio ?? null,
        status: "pending_verification",
        verified: false,
      },
    });

    if (categories && categories.length > 0) {
      await tx.professionalCategory.createMany({
        data: categories.map((catId: string) => ({
          professionalId: professional.id,
          categoryId: catId,
        })),
      });
    }

    return { user, professional };
  });

  const token = generateToken(fastify, {
    id: result.user.id,
    role: result.user.role,
    email: result.user.email,
  });

  const { passwordHash: _, ...safeUser } = result.user;

  return { user: { ...safeUser, professional: result.professional }, token };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function loginUser(
  fastify: FastifyInstance,
  email: string,
  password: string
): Promise<{ user: any; token: string }> {
  const user = await fastify.prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    const err = new Error("Credenciales invalidas") as any;
    err.statusCode = 401;
    throw err;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const err = new Error("Credenciales invalidas") as any;
    err.statusCode = 401;
    throw err;
  }

  const token = generateToken(fastify, {
    id: user.id,
    role: user.role,
    email: user.email,
  });

  const { passwordHash: _, ...safeUser } = user;

  return { user: safeUser, token };
}

// ---------------------------------------------------------------------------
// Get user profile
// ---------------------------------------------------------------------------

export async function getUserProfile(
  fastify: FastifyInstance,
  userId: string
): Promise<any> {
  const user = await fastify.prisma.user.findUnique({
    where: { id: userId },
    include: {
      professional: true,
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
