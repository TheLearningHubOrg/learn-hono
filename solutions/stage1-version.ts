// Stage 1 exercise solution: a portable /version route that reports the runtime.
import { Hono } from 'hono';
import { getRuntimeKey } from 'hono/adapter';

export const version = new Hono().get('/', (c) =>
  c.json({
    name: 'learn-hono',
    version: '1.0.0',
    // 'node', 'bun', 'deno', 'workerd', 'fastly', 'edge-light' or 'other'
    runtime: getRuntimeKey(),
  }),
);
