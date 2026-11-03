import { serve } from '@hono/node-server';
import { createApp } from './app.js';

const port = Number.parseInt(process.env.PORT ?? '', 10) || 8080;
const apiKey = process.env.API_KEY || undefined;

if (!apiKey) console.warn('API_KEY is not set: write routes are open. Set it in production.');

const app = createApp({ apiKey, log: true });

// 0.0.0.0, not localhost: inside a container, localhost is unreachable from outside.
const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`learn-hono listening on http://${info.address}:${info.port}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received, draining connections`);
  server.close((err) => process.exit(err ? 1 : 0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
