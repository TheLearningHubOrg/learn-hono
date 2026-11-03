import type { ItemRepository } from './types.js';

/**
 * The generic passed to new Hono<AppEnv>(). Variables are per-request values
 * set by middleware with c.set() and read with c.var. Use `type`, not
 * `interface`, so Hono can merge it with the types it infers.
 */
export type AppEnv = {
  Variables: {
    items: ItemRepository;
  };
};
