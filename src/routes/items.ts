import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../env.js';
import { requireApiKey } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createItemSchema, listQuerySchema, updateItemSchema } from '../schemas.js';

const notFound = (id: string) => new HTTPException(404, { message: `Item ${id} not found` });

export function createItemRoutes({ apiKey }: { apiKey?: string | undefined } = {}) {
  const writeGuard = requireApiKey(apiKey);

  // Chained calls keep every route in the inferred type, which the RPC client needs.
  return new Hono<AppEnv>()
    .get('/', validate('query', listQuerySchema), (c) => {
      const filter = c.req.valid('query');
      const data = c.var.items.list(filter);
      return c.json({ data, meta: { count: data.length } }, 200);
    })
    .get('/:id', (c) => {
      const id = c.req.param('id');
      const item = c.var.items.get(id);
      if (!item) throw notFound(id);
      return c.json({ data: item }, 200);
    })
    .post('/', writeGuard, validate('json', createItemSchema), (c) => {
      const item = c.var.items.create(c.req.valid('json'));
      c.header('Location', `/api/v1/items/${item.id}`);
      return c.json({ data: item }, 201);
    })
    .patch('/:id', writeGuard, validate('json', updateItemSchema), (c) => {
      const id = c.req.param('id');
      const item = c.var.items.update(id, c.req.valid('json'));
      if (!item) throw notFound(id);
      return c.json({ data: item }, 200);
    })
    .delete('/:id', writeGuard, (c) => {
      const id = c.req.param('id');
      if (!c.var.items.delete(id)) throw notFound(id);
      return c.body(null, 204);
    });
}
