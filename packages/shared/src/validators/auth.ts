import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .email('Ingresá un email válido'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .email('Ingresá un email válido'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z
    .string({ required_error: 'El nombre es obligatorio' })
    .min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z
    .string({ required_error: 'El teléfono es obligatorio' }),
  role: z.enum(['client', 'professional', 'both'], {
    required_error: 'El rol es obligatorio',
    invalid_type_error: 'El rol debe ser cliente, profesional o ambos',
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const registerProfessionalSchema = registerSchema.extend({
  license_number: z
    .string({ required_error: 'El número de matrícula es obligatorio' }),
  bio: z
    .string()
    .optional(),
  categories: z
    .array(
      z.string({ required_error: 'Cada categoría debe ser un ID válido' }),
      { required_error: 'Debés seleccionar al menos una categoría' }
    )
    .min(1, 'Debés seleccionar al menos una categoría'),
});

export type RegisterProfessionalInput = z.infer<typeof registerProfessionalSchema>;
