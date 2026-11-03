// Stage 3 exercise solution: bulk create with one validation pass over the whole array.
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../src/env.js';
import { validate } from '../src/middleware/validate.js';
import { createItemSchema } from '../src/schemas.js';

const bulkSchema = z.object({
  items: z.array(createItemSchema).min(1).max(50),
});

export const bulk = new Hono<AppEnv>().post('/', validate('json', bulkSchema), (c) => {
  const { items } = c.req.valid('json');
  // Validation already passed for every element, so no partial writes can happen here.
  const created = items.map((input) => c.var.items.create(input));
  return c.json({ data: created.map((item) => item.id), meta: { count: created.length } }, 201);
});
