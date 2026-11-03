import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('app shell', () => {
  it('GET / describes the API', async () => {
    const res = await createApp().request('/');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: 'learn-hono', endpoints: { health: '/health' } });
  });

  it('GET /health answers ok', async () => {
    const res = await createApp().request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  it('HEAD /health is served by the GET route with no body', async () => {
    const res = await createApp().request('/health', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });

  it('adds a request id and security headers to every response', async () => {
    const res = await createApp().request('/health');
    expect(res.headers.get('X-Request-Id')).toMatch(/[0-9a-f-]{36}/);
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('keeps a caller-supplied request id', async () => {
    const res = await createApp().request('/health', { headers: { 'X-Request-Id': 'trace-123' } });
    expect(res.headers.get('X-Request-Id')).toBe('trace-123');
  });

  it('unknown routes return the JSON 404 shape', async () => {
    const res = await createApp().request('/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'No route for GET /nope' } });
  });

  it('GET /ui renders HTML and escapes user input', async () => {
    const app = createApp();
    await app.request('/api/v1/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '<script>alert(1)</script>' }),
    });
    const res = await app.request('/ui');
    expect(res.headers.get('Content-Type')).toContain('text/html');
    const html = await res.text();
    expect(html.startsWith('<!DOCTYPE html><html lang="en">')).toBe(true);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
