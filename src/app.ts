import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import type { AppEnv } from './env.js';
import { InMemoryItemRepository, seedItems } from './repository.js';
import { health } from './routes/health.js';
import { createItemRoutes } from './routes/items.js';
import { pages } from './routes/pages.js';
import type { ItemRepository } from './types.js';

export interface AppOptions {
  /** Storage to use. Tests pass a fresh one per case. */
  items?: ItemRepository;
  /** When set, POST, PATCH and DELETE require this key. */
  apiKey?: string | undefined;
  /** Print one access-log line per request. */
  log?: boolean;
}

export function createApp(options: AppOptions = {}) {
  const items = options.items ?? new InMemoryItemRepository(seedItems());
  const app = new Hono<AppEnv>();

  // Global middleware runs in registration order on the way in, reverse order on the way out.
  if (options.log) app.use(logger());
  app.use(requestId());
  app.use(secureHeaders());
  app.use(async (c, next) => {
    c.set('items', items);
    await next();
  });

  app.notFound((c) =>
    c.json({ error: { code: 'NOT_FOUND', message: `No route for ${c.req.method} ${c.req.path}` } }, 404),
  );

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      if (err.res) return err.getResponse();
      return c.json({ error: { code: `HTTP_${err.status}`, message: err.message } }, err.status);
    }
    console.error(`[${c.var.requestId}]`, err);
    return c.json({ error: { code: 'INTERNAL', message: 'Internal Server Error' } }, 500);
  });

  // The value of this chain is what AppType describes.
  return app
    .get('/', (c) =>
      c.json({
        name: 'learn-hono',
        docs: 'https://github.com/TheLearningHubOrg/learn-hono',
        endpoints: { health: '/health', items: '/api/v1/items', ui: '/ui' },
      }),
    )
    .route('/health', health)
    .route('/api/v1/items', createItemRoutes({ apiKey: options.apiKey }))
    .route('/ui', pages);
}

export type AppType = ReturnType<typeof createApp>;
