import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Item } from '../types.js';

export const itemsRouter = new Hono();

// In-memory data store for demonstration
const itemsStore: Map<string, Item> = new Map([
  [
    '1',
    {
      id: '1',
      title: 'Master Hono RegexpRouter',
      description: 'Understand linear radix tree vs compiled regex routing at the edge',
      status: 'completed',
      createdAt: new Date().toISOString()
    }
  ],
  [
    '2',
    {
      id: '2',
      title: 'Implement RPC Typesafe Client',
      description: 'Export AppType for zero-overhead end-to-end type inference',
      status: 'in_progress',
      createdAt: new Date().toISOString()
    }
  ]
]);

const createItemSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(500).default(''),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending')
});

const updateItemSchema = createItemSchema.partial();

// GET all items
itemsRouter.get('/', (c) => {
  const items = Array.from(itemsStore.values());
  return c.json({
    success: true,
    data: items,
    meta: { total: items.length }
  });
});

// GET item by id
itemsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const item = itemsStore.get(id);

  if (!item) {
    return c.json({ success: false, error: `Item with id ${id} not found` }, 404);
  }

  return c.json({ success: true, data: item });
});

// POST create item
itemsRouter.post('/', zValidator('json', createItemSchema), (c) => {
  const data = c.req.valid('json');
  const id = String(itemsStore.size + 1);

  const newItem: Item = {
    id,
    title: data.title,
    description: data.description,
    status: data.status,
    createdAt: new Date().toISOString()
  };

  itemsStore.set(id, newItem);
  return c.json({ success: true, data: newItem }, 201);
});

// PATCH update item
itemsRouter.patch('/:id', zValidator('json', updateItemSchema), (c) => {
  const id = c.req.param('id');
  const existing = itemsStore.get(id);

  if (!existing) {
    return c.json({ success: false, error: `Item with id ${id} not found` }, 404);
  }

  const updates = c.req.valid('json');
  const updatedItem: Item = {
    ...existing,
    ...updates
  };

  itemsStore.set(id, updatedItem);
  return c.json({ success: true, data: updatedItem });
});

// DELETE remove item
itemsRouter.delete('/:id', (c) => {
  const id = c.req.param('id');
  if (!itemsStore.has(id)) {
    return c.json({ success: false, error: `Item with id ${id} not found` }, 404);
  }

  itemsStore.delete(id);
  return c.json({ success: true, data: { deletedId: id } });
});
