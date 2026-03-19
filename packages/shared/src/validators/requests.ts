import { z } from 'zod';

export const createRequestSchema = z.object({
  category_id: z
    .string({ required_error: 'La categoría es obligatoria' })
    .uuid('El ID de categoría debe ser un UUID válido'),
  problem_type: z
    .string({ required_error: 'El tipo de problema es obligatorio' }),
  description: z
    .string({ required_error: 'La descripción es obligatoria' })
    .min(10, 'La descripción debe tener al menos 10 caracteres'),
  urgency: z.enum(['low', 'medium', 'high', 'emergency'], {
    required_error: 'La urgencia es obligatoria',
    invalid_type_error: 'La urgencia debe ser baja, media, alta o emergencia',
  }),
  location: z
    .object({
      lat: z.number({ required_error: 'La latitud es obligatoria' }),
      lng: z.number({ required_error: 'La longitud es obligatoria' }),
    })
    .optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const updateRequestSchema = createRequestSchema.partial();

export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
