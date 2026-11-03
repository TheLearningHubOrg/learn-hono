import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { timingSafeEqual } from 'hono/utils/buffer';

/**
 * Accepts `Authorization: Bearer <key>` or `X-API-Key: <key>`.
 * When no key is configured the middleware is a no-op, which keeps local
 * development and tests simple. Production must set API_KEY.
 */
export const requireApiKey = (expected: string | undefined) =>
  createMiddleware(async (c, next) => {
    if (!expected) return next();

    const auth = c.req.header('Authorization');
    const presented = auth?.startsWith('Bearer ') ? auth.slice(7) : c.req.header('X-API-Key');

    if (!presented || !(await timingSafeEqual(presented, expected))) {
      const body = { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid API key' } };
      throw new HTTPException(401, {
        message: body.error.message,
        res: Response.json(body, { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }),
      });
    }
    await next();
  });
