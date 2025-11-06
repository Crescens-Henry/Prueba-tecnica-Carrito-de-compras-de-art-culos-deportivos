import { z } from 'zod';

export const productQuerySchema = z.object({
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  cursor: z.string().optional(),
  search: z.string().trim().min(1).max(100).optional(),
  category: z.enum(['futbol','baloncesto','tenis','running','natacion','ciclismo','gimnasio','yoga','padel','voleibol','rugby']).optional(),
  min: z.coerce.number().int().min(0).optional(),
  max: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'name_asc', 'name_desc']).optional()
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(100)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
