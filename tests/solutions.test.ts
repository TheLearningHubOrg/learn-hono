import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { bulk } from '../solutions/stage3-bulk.js';
import { createLinks } from '../solutions/stage2-links.js';
import { version } from '../solutions/stage1-version.js';
import type { AppEnv } from '../src/env.js';
import { InMemoryItemRepository } from '../src/repository.js';

describe('Stage 1 solution', () => {
  it('reports the runtime', async () => {
    const res = await version.request('/');
    expect(await res.json()).toEqual({ name: 'learn-hono', version: '1.0.0', runtime: 'node' });
  });
});

describe('Stage 2 solution', () => {
  const links = createLinks();

  it('redirects a known code', async () => {
    const res = await links.request('/hono01');
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('https://hono.dev');
  });

  it('404s an unknown but well-formed code', async () => {
    expect((await links.request('/zzzzzz')).status).toBe(404);
  });

  it('400s a malformed code', async () => {
    expect((await links.request('/Not-A-Code')).status).toBe(400);
  });
});

describe('Stage 3 solution', () => {
  const app = () => {
    const repo = new InMemoryItemRepository();
    const root = new Hono<AppEnv>()
      .use(async (c, next) => {
        c.set('items', repo);
        await next();
      })
      .route('/items/bulk', bulk);
    return { root, repo };
  };

  const post = (body: unknown) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('creates every item when all are valid', async () => {
    const { root, repo } = app();
    const res = await root.request('/items/bulk', post({ items: [{ title: 'first' }, { title: 'second' }] }));
    expect(res.status).toBe(201);
    expect(repo.list({ limit: 100 })).toHaveLength(2);
  });

  it('creates nothing and names the bad element when one is invalid', async () => {
    const { root, repo } = app();
    const res = await root.request('/items/bulk', post({ items: [{ title: 'ok' }, { title: 'ok too' }, { title: 'x' }] }));
    const body = (await res.json()) as { error: { issues: { path: string }[] } };
    expect(res.status).toBe(422);
    expect(body.error.issues[0]?.path).toBe('items.2.title');
    expect(repo.list({ limit: 100 })).toHaveLength(0);
  });
});
