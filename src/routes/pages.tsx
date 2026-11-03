import { Hono } from 'hono';
import type { AppEnv } from '../env.js';
import { ItemsPage } from '../views/items-page.js';

export const pages = new Hono<AppEnv>().get('/', (c) =>
  c.html(<ItemsPage items={c.var.items.list({ limit: 100 })} />),
);
