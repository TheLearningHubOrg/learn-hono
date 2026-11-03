// Stage 2 exercise solution: a short-link router with a regex-constrained code.
import { Hono } from 'hono';

export function createLinks(store = new Map<string, string>([['hono01', 'https://hono.dev']])) {
  return new Hono()
    .get('/:code{[a-z0-9]{6}}', (c) => {
      const target = store.get(c.req.param('code'));
      if (!target) return c.json({ error: { code: 'NOT_FOUND', message: 'Unknown link' } }, 404);
      c.header('Cache-Control', 'private, max-age=60');
      return c.redirect(target, 302);
    })
    .get('/:code', (c) =>
      c.json({ error: { code: 'BAD_CODE', message: 'Codes are 6 lowercase letters or digits' } }, 400),
    );
}
