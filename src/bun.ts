// Bun entry: bun run src/bun.ts
// Bun.serve() is started for a default export that has fetch() and port.
import { createApp } from './app.js';

export default {
  port: Number.parseInt(process.env.PORT ?? '', 10) || 8080,
  fetch: createApp({ apiKey: process.env.API_KEY || undefined, log: true }).fetch,
};
