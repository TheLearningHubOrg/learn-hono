import type { MiddlewareHandler } from 'hono';

export const apiKeyAuth = (secretKey = 'the-learning-hub-secret'): MiddlewareHandler => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const apiKey = c.req.header('X-API-Key');

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : apiKey;

    if (!token || token !== secretKey) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized: Invalid or missing API credential'
        },
        401
      );
    }

    await next();
  };
};
