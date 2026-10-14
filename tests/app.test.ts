import { describe, it } from 'node:test';
import assert from 'node:assert';
import { app } from '../src/app.js';

describe('Hono App Endpoints', () => {
  it('GET / should return service info and 200 OK', async () => {
    const res = await app.request('/');
    assert.strictEqual(res.status, 200);

    const body = await res.json() as { name: string; version: string };
    assert.strictEqual(body.name, 'Learn Hono Edge Web Framework API');
    assert.strictEqual(body.version, '1.0.0');
  });

  it('GET /health should return 200 OK and healthy status', async () => {
    const res = await app.request('/health');
    assert.strictEqual(res.status, 200);

    const body = await res.json() as { success: boolean; data: { status: string } };
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'healthy');
  });

  it('GET /api/v1/items should return array of items', async () => {
    const res = await app.request('/api/v1/items');
    assert.strictEqual(res.status, 200);

    const body = await res.json() as { success: boolean; data: unknown[]; meta: { total: number } };
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.meta.total >= 2);
  });

  it('POST /api/v1/items should validate payload and return 201 Created', async () => {
    const payload = {
      title: 'Testing Edge Middleware',
      description: 'Verifying end-to-end Zod parsing in Hono',
      status: 'pending'
    };

    const res = await app.request('/api/v1/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json() as { success: boolean; data: { title: string } };
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.title, payload.title);
  });

  it('GET /api/v1/items/unknown should return 404 Not Found', async () => {
    const res = await app.request('/api/v1/items/9999');
    assert.strictEqual(res.status, 404);

    const body = await res.json() as { success: boolean; error: string };
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('not found'));
  });

  it('GET /non-existent should return 404 Not Found', async () => {
    const res = await app.request('/non-existent');
    assert.strictEqual(res.status, 404);
  });
});
