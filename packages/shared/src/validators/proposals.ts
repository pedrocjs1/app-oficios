import { z } from 'zod';

export const createProposalSchema = z.object({
  price: z
    .number({ required_error: 'El precio es obligatorio', invalid_type_error: 'El precio debe ser un número' })
    .positive('El precio debe ser mayor a cero'),
  message: z
    .string({ required_error: 'El mensaje es obligatorio' })
    .min(5, 'El mensaje debe tener al menos 5 caracteres'),
  estimated_arrival: z
    .string()
    .optional(),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
