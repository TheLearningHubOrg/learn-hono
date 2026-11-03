// Stage 3 reference: validation targets, typed context, bindings and error flow.
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { validator } from 'hono/validator';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validate } from '../src/middleware/validate.js';

describe('hono/validator without a schema library', () => {
  const app = new Hono().post(
    '/signup',
    validator('form', (value, c) => {
      const email = value['email'];
      if (typeof email !== 'string' || !email.includes('@')) {
        return c.json({ error: 'email is required' }, 400);
      }
      return { email: email.toLowerCase() };
    }),
    (c) => c.json({ welcome: c.req.valid('form').email }, 201),
  );

  it('returns the transformed value to the handler', async () => {
    const res = await app.request('/signup', { method: 'POST', body: new URLSearchParams({ email: 'Ada@Example.com' }) });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ welcome: 'ada@example.com' });
  });

  it('short-circuits when the validator returns a Response', async () => {
    const res = await app.request('/signup', { method: 'POST', body: new URLSearchParams({ email: 'nope' }) });
    expect(res.status).toBe(400);
  });
});

describe('several targets on one route', () => {
  const app = new Hono().put(
    '/teams/:teamId/members',
    validate('param', z.object({ teamId: z.uuid() })),
    validate('header', z.object({ 'x-tenant': z.string().min(1) })),
    validate('json', z.object({ userId: z.string(), role: z.enum(['owner', 'member']) })),
    (c) => {
      const { teamId } = c.req.valid('param');
      const tenant = c.req.valid('header')['x-tenant'];
      const member = c.req.valid('json');
      return c.json({ teamId, tenant, ...member });
    },
  );

  it('validates param, header and body independently', async () => {
    const id = crypto.randomUUID();
    const res = await app.request(`/teams/${id}/members`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Tenant': 'acme' },
      body: JSON.stringify({ userId: 'u1', role: 'member' }),
    });
    expect(await res.json()).toEqual({ teamId: id, tenant: 'acme', userId: 'u1', role: 'member' });
  });

  it('fails on the first invalid target', async () => {
    const res = await app.request('/teams/not-a-uuid/members', { method: 'PUT' });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe('Invalid param');
  });

  it('json validation is skipped without a JSON content type', async () => {
    const app2 = new Hono().post('/x', validate('json', z.object({ n: z.number() })), (c) => c.json(c.req.valid('json')));
    const res = await app2.request('/x', { method: 'POST', body: '{"n":1}' });
    // No Content-Type header: the validator sees {} and the schema rejects it.
    expect(res.status).toBe(422);
  });
});

describe('typed context variables', () => {
  type User = { id: string; role: 'admin' | 'reader' };

  const authenticate = createMiddleware<{ Variables: { user: User } }>(async (c, next) => {
    const token = c.req.header('Authorization');
    if (token !== 'Bearer admin-token') throw new HTTPException(401, { message: 'Sign in first' });
    c.set('user', { id: 'u-1', role: 'admin' });
    await next();
  });

  const app = new Hono()
    .get('/me', authenticate, (c) => c.json(c.var.user))
    .onError((err, c) =>
      err instanceof HTTPException ? c.json({ message: err.message }, err.status) : c.json({ message: 'boom' }, 500),
    );

  it('exposes what the middleware set, with its type', async () => {
    const res = await app.request('/me', { headers: { Authorization: 'Bearer admin-token' } });
    expect(await res.json()).toEqual({ id: 'u-1', role: 'admin' });
  });

  it('turns HTTPException into the status it carries', async () => {
    const res = await app.request('/me');
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: 'Sign in first' });
  });
});

describe('bindings', () => {
  type Bindings = { GREETING: string };
  const app = new Hono<{ Bindings: Bindings }>().get('/greet', (c) => c.text(`${c.env.GREETING}, world`));

  it('reads c.env, which tests pass as the third argument of app.request()', async () => {
    const res = await app.request('/greet', {}, { GREETING: 'Hello' });
    expect(await res.text()).toBe('Hello, world');
  });
});

describe('body reading', () => {
  it('caches the parsed body, so a validator and the handler can both read it', async () => {
    const app = new Hono().post('/echo', validate('json', z.object({ a: z.number() })), async (c) => {
      const raw = await c.req.json<{ a: number }>();
      return c.json({ validated: c.req.valid('json').a, raw: raw.a });
    });
    const res = await app.request('/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });
    expect(await res.json()).toEqual({ validated: 1, raw: 1 });
  });

  it('a thrown non-HTTP error reaches onError as a 500', async () => {
    const app = new Hono()
      .get('/fail', () => {
        throw new Error('database is down');
      })
      .onError((err, c) => c.json({ caught: err.message }, 500));
    const res = await app.request('/fail');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ caught: 'database is down' });
  });
});
