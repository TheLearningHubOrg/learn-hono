import { Hono } from 'hono';

// Set on the first request, not at import time: some runtimes freeze the clock
// while a module is being initialised, and import time is not "server start" there.
let startedAt: number | undefined;

// Portable on purpose: no process.* calls, so it also runs on Workers and Deno.
export const health = new Hono().get('/', (c) => {
  startedAt ??= Date.now();
  return c.json({
    status: 'ok' as const,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  });
});
