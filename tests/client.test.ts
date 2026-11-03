import { testClient } from 'hono/testing';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { InMemoryItemRepository } from '../src/repository.js';

// testClient builds the same typed client as hc<AppType>(), wired to app.request().
describe('typed RPC client', () => {
  it('creates and reads an item with inferred types', async () => {
    const client = testClient(createApp({ items: new InMemoryItemRepository() }));

    const created = await client.api.v1.items.$post({ json: { title: 'From the client' } });
    // The union includes the 422 body from the validator hook; narrowing on status picks the 201 one.
    if (created.status !== 201) throw new Error(`unexpected ${created.status}`);
    const { data } = await created.json();

    const fetched = await client.api.v1.items[':id'].$get({ param: { id: data.id } });
    expect(fetched.status).toBe(200);
    if (fetched.status === 200) {
      const body = await fetched.json();
      // body.data.status is typed as 'pending' | 'in_progress' | 'completed'.
      expect(body.data.status).toBe('pending');
    }
  });

  it('passes typed query parameters', async () => {
    const client = testClient(createApp());
    const res = await client.api.v1.items.$get({ query: { status: 'in_progress', limit: '5' } });
    if (res.status !== 200) throw new Error(`unexpected ${res.status}`);
    const body = await res.json();
    expect(body.data.map((item) => item.id)).toEqual(['hono-rpc']);
  });
});
