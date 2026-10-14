import { serve } from '@hono/node-server';
import { app } from './app.js';

const port = Number(process.env.PORT) || 3000;

console.log(`[learn-hono] Starting Hono HTTP server on port ${port}...`);

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`[learn-hono] Server running at http://localhost:${info.port}`);
});
