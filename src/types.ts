import type { z } from 'zod';
import type { createItemSchema, itemStatusSchema, updateItemSchema } from './schemas.js';

export type ItemStatus = z.infer<typeof itemStatusSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

export interface Item {
  id: string;
  title: string;
  description: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListFilter {
  status?: ItemStatus | undefined;
  limit: number;
}

/** Storage contract. Route handlers depend on this, never on a concrete store. */
export interface ItemRepository {
  list(filter: ListFilter): Item[];
  get(id: string): Item | undefined;
  create(input: CreateItemInput): Item;
  update(id: string, patch: UpdateItemInput): Item | undefined;
  delete(id: string): boolean;
}
