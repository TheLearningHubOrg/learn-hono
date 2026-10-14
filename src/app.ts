import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { healthRouter } from './routes/health.js';
import { itemsRouter } from './routes/items.js';

export const app = new Hono();

// Global Middleware Stack
app.use('*', logger());
app.use('*', timing());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  })
);

// Root landing route
app.get('/', (c) => {
  return c.json({
    name: 'Learn Hono Edge Web Framework API',
    version: '1.0.0',
    documentation: 'https://github.com/TheLearningHubOrg/learn-hono',
    endpoints: {
      health: '/health',
      items: '/api/v1/items'
    }
  });
});

// Mounted Routers
app.route('/health', healthRouter);
app.route('/api/v1/items', itemsRouter);

// 404 Handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: `Not Found: Cannot ${c.req.method} ${c.req.path}`
    },
    404
  );
});

// Global Error Handler
app.onError((err, c) => {
  console.error('[Hono Error]', err);
  return c.json(
    {
      success: false,
      error: err.message || 'Internal Server Error'
    },
    500
  );
});

export type AppType = typeof app;
