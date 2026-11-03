import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { InMemoryItemRepository } from '../src/repository.js';
import type { Item } from '../src/types.js';

const json = (method: string, body: unknown, headers: Record<string, string> = {}) => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

const fresh = (options: { apiKey?: string } = {}) =>
  createApp({ items: new InMemoryItemRepository(), ...options });

describe('items API', () => {
  it('lists the seeded items by default', async () => {
    const res = await createApp().request('/api/v1/items');
    const body = (await res.json()) as { data: Item[]; meta: { count: number } };
    expect(res.status).toBe(200);
    expect(body.meta.count).toBe(2);
  });

  it('creates an item, applies defaults and sets Location', async () => {
    const res = await fresh().request('/api/v1/items', json('POST', { title: '  Write tests  ' }));
    const { data } = (await res.json()) as { data: Item };
    expect(res.status).toBe(201);
    expect(data).toMatchObject({ title: 'Write tests', description: '', status: 'pending' });
    expect(res.headers.get('Location')).toBe(`/api/v1/items/${data.id}`);
  });

  it('rejects an invalid body with 422 and field paths', async () => {
    const res = await fresh().request('/api/v1/items', json('POST', { title: 'x', status: 'later' }));
    const body = (await res.json()) as { error: { code: string; issues: { path: string }[] } };
    expect(res.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(body.error.issues.map((i) => i.path).sort()).toEqual(['status', 'title']);
  });

  it('coerces and validates query parameters', async () => {
    const app = fresh();
    for (const title of ['one', 'two', 'three']) {
      await app.request('/api/v1/items', json('POST', { title }));
    }
    const ok = await app.request('/api/v1/items?limit=2');
    expect(((await ok.json()) as { data: Item[] }).data).toHaveLength(2);

    const bad = await app.request('/api/v1/items?limit=abc');
    expect(bad.status).toBe(422);
  });

  it('filters by status', async () => {
    const res = await createApp().request('/api/v1/items?status=completed');
    const { data } = (await res.json()) as { data: Item[] };
    expect(data.map((i) => i.id)).toEqual(['hono-router']);
  });

  it('PATCH changes only the fields sent', async () => {
    const app = createApp();
    const res = await app.request('/api/v1/items/hono-rpc', json('PATCH', { title: 'Renamed' }));
    const { data } = (await res.json()) as { data: Item };
    expect(res.status).toBe(200);
    expect(data.title).toBe('Renamed');
    expect(data.status).toBe('in_progress');
  });

  it('PATCH with an empty object is rejected', async () => {
    const res = await createApp().request('/api/v1/items/hono-rpc', json('PATCH', {}));
    expect(res.status).toBe(422);
  });

  it('DELETE returns 204, then the item is gone', async () => {
    const app = createApp();
    const del = await app.request('/api/v1/items/hono-rpc', { method: 'DELETE' });
    expect(del.status).toBe(204);
    const get = await app.request('/api/v1/items/hono-rpc');
    expect(get.status).toBe(404);
    expect(await get.json()).toEqual({ error: { code: 'HTTP_404', message: 'Item hono-rpc not found' } });
  });

  it('ids stay unique after a delete', async () => {
    const app = fresh();
    const a = (await (await app.request('/api/v1/items', json('POST', { title: 'aa' }))).json()) as { data: Item };
    await app.request(`/api/v1/items/${a.data.id}`, { method: 'DELETE' });
    const b = (await (await app.request('/api/v1/items', json('POST', { title: 'bb' }))).json()) as { data: Item };
    const c = (await (await app.request('/api/v1/items', json('POST', { title: 'cc' }))).json()) as { data: Item };
    expect(new Set([a.data.id, b.data.id, c.data.id]).size).toBe(3);
  });

  describe('with an API key', () => {
    const app = fresh({ apiKey: 'test-key' });

    it('reads stay public', async () => {
      expect((await app.request('/api/v1/items')).status).toBe(200);
    });

    it('writes without a key get 401 and a challenge header', async () => {
      const res = await app.request('/api/v1/items', json('POST', { title: 'blocked' }));
      expect(res.status).toBe(401);
      expect(res.headers.get('WWW-Authenticate')).toBe('Bearer');
    });

    it('accepts the key as a bearer token or X-API-Key', async () => {
      const bearer = await app.request(
        '/api/v1/items',
        json('POST', { title: 'via bearer' }, { Authorization: 'Bearer test-key' }),
      );
      const header = await app.request('/api/v1/items', json('POST', { title: 'via header' }, { 'X-API-Key': 'test-key' }));
      expect([bearer.status, header.status]).toEqual([201, 201]);
    });
  });
});
