// Stage 2 reference: every routing and response rule the README states is pinned here.
import { Hono } from 'hono';
import { getRouterName } from 'hono/dev';
import { methodNotAllowed } from 'hono/method-not-allowed';
import { Hono as QuickHono } from 'hono/quick';
import { routePath } from 'hono/route';
import { streamText } from 'hono/streaming';
import { describe, expect, it } from 'vitest';

describe('path matching', () => {
  const app = new Hono()
    .get('/users/:id', (c) => c.json({ id: c.req.param('id') }))
    .get('/posts/:id{[0-9]+}', (c) => c.text(`post ${c.req.param('id')}`))
    .get('/posts/:slug', (c) => c.text(`slug ${c.req.param('slug')}`))
    .get('/files/*', (c) => c.text(`file route ${routePath(c)}`))
    .get('/archive/:year/:month?', (c) => c.json(c.req.param()))
    .get('/search', (c) =>
      c.json({ q: c.req.query('q') ?? null, tags: c.req.queries('tag') ?? [] }),
    );

  it('captures named parameters', async () => {
    expect(await (await app.request('/users/42')).json()).toEqual({ id: '42' });
  });

  it('applies a regex constraint before falling through to the next route', async () => {
    expect(await (await app.request('/posts/7')).text()).toBe('post 7');
    expect(await (await app.request('/posts/hello-world')).text()).toBe('slug hello-world');
  });

  it('matches wildcards across segments and reports the registered path', async () => {
    expect(await (await app.request('/files/a/b/c.txt')).text()).toBe('file route /files/*');
  });

  it('treats a trailing ? as an optional parameter', async () => {
    expect(await (await app.request('/archive/2026')).json()).toEqual({ year: '2026' });
    expect(await (await app.request('/archive/2026/11')).json()).toEqual({ year: '2026', month: '11' });
  });

  it('reads single and repeated query keys', async () => {
    const res = await app.request('/search?q=hono&tag=edge&tag=rpc');
    expect(await res.json()).toEqual({ q: 'hono', tags: ['edge', 'rpc'] });
  });

  it('decodes percent-encoded parameters', async () => {
    expect(await (await app.request('/users/caf%C3%A9')).json()).toEqual({ id: 'café' });
  });
});

describe('ordering', () => {
  it('runs the first handler that returns, in registration order', async () => {
    const app = new Hono();
    app.get('/books/*', (c) => c.text('wildcard'));
    app.get('/books/featured', (c) => c.text('specific, but registered second'));
    expect(await (await app.request('/books/featured')).text()).toBe('wildcard');
  });

  it('runs every matching middleware, outer first, inner last', async () => {
    const order: string[] = [];
    const app = new Hono();
    app.use(async (_c, next) => {
      order.push('global in');
      await next();
      order.push('global out');
    });
    app.use('/api/*', async (_c, next) => {
      order.push('api in');
      await next();
      order.push('api out');
    });
    app.get('/api/ping', (c) => {
      order.push('handler');
      return c.text('pong');
    });
    await app.request('/api/ping');
    expect(order).toEqual(['global in', 'api in', 'handler', 'api out', 'global out']);
  });
});

describe('grouping', () => {
  it('mounts sub-apps with route() and prefixes with basePath()', async () => {
    const books = new Hono().get('/', (c) => c.text('all books')).get('/:id', (c) => c.text(`book ${c.req.param('id')}`));
    const api = new Hono().basePath('/api/v2').route('/books', books);
    expect(await (await api.request('/api/v2/books')).text()).toBe('all books');
    expect(await (await api.request('/api/v2/books/9')).text()).toBe('book 9');
    expect((await api.request('/books')).status).toBe(404);
  });

  it('registers one handler for several methods with on()', async () => {
    const app = new Hono().on(['PUT', 'PATCH'], '/profile', (c) => c.text(c.req.method));
    expect(await (await app.request('/profile', { method: 'PATCH' })).text()).toBe('PATCH');
    expect((await app.request('/profile', { method: 'POST' })).status).toBe(404);
  });

  it('answers 405 with an Allow header when methodNotAllowed is installed', async () => {
    const app = new Hono();
    app.use(methodNotAllowed({ app }));
    app.get('/hello', (c) => c.text('hi'));
    const res = await app.request('/hello', { method: 'DELETE' });
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toContain('GET');
  });
});

describe('responses', () => {
  const app = new Hono()
    .get('/text', (c) => c.text('plain'))
    .get('/created', (c) => c.json({ ok: true }, 201, { 'Cache-Control': 'no-store' }))
    .get('/old', (c) => c.redirect('/new', 301))
    .get('/raw', () => new Response('from a plain Response', { status: 202 }))
    .get('/stream', (c) =>
      streamText(c, async (stream) => {
        for (const word of ['one', 'two', 'three']) await stream.writeln(word);
      }),
    );

  it('sets content type, status and extra headers', async () => {
    const text = await app.request('/text');
    expect(text.headers.get('Content-Type')).toMatch(/^text\/plain/);
    const created = await app.request('/created');
    expect(created.status).toBe(201);
    expect(created.headers.get('Cache-Control')).toBe('no-store');
  });

  it('redirects with a Location header', async () => {
    const res = await app.request('/old');
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/new');
  });

  it('accepts a standard Response returned directly', async () => {
    const res = await app.request('/raw');
    expect(res.status).toBe(202);
  });

  it('streams text chunks', async () => {
    expect(await (await app.request('/stream')).text()).toBe('one\ntwo\nthree\n');
  });
});

describe('routers', () => {
  it('SmartRouter picks RegExpRouter by default and LinearRouter in the quick preset', async () => {
    const standard = new Hono().get('/a/:id', (c) => c.text('ok'));
    const quick = new QuickHono().get('/a/:id', (c) => c.text('ok'));
    // SmartRouter commits to one router on the first match, then keeps it.
    await standard.request('/a/1');
    await quick.request('/a/1');
    expect(getRouterName(standard)).toBe('SmartRouter + RegExpRouter');
    expect(getRouterName(quick)).toBe('SmartRouter + LinearRouter');
  });

  it('falls back to TrieRouter for paths RegExpRouter cannot compile', async () => {
    // Two different patterns for the same parameter slot cannot share one big regex.
    const app = new Hono()
      .get('/:lang{[a-z]+}/docs', (c) => c.text('docs'))
      .get('/:lang{[0-9]+}/code', (c) => c.text('code'));
    expect(await (await app.request('/en/docs')).text()).toBe('docs');
    expect(getRouterName(app)).toBe('SmartRouter + TrieRouter');
  });
});
