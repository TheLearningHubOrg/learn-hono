import { z } from 'zod';

export const itemStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

// Field rules are declared once and reused, so create and update cannot drift.
const fields = {
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500),
  status: itemStatusSchema,
};

export const createItemSchema = z.object({
  title: fields.title,
  description: fields.description.default(''),
  status: fields.status.default('pending'),
});

// No defaults here: a default inside a PATCH schema would overwrite stored values.
export const updateItemSchema = z
  .object(fields)
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'Send at least one of: title, description, status',
  });

// Query strings are always strings, so numbers must be coerced.
export const listQuerySchema = z.object({
  status: itemStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
