import type { CreateItemInput, Item, ItemRepository, ListFilter, UpdateItemInput } from './types.js';

export class InMemoryItemRepository implements ItemRepository {
  readonly #items = new Map<string, Item>();

  constructor(seed: Item[] = []) {
    for (const item of seed) this.#items.set(item.id, item);
  }

  list({ status, limit }: ListFilter): Item[] {
    const all = [...this.#items.values()];
    const filtered = status ? all.filter((item) => item.status === status) : all;
    return filtered.slice(0, limit);
  }

  get(id: string): Item | undefined {
    return this.#items.get(id);
  }

  create(input: CreateItemInput): Item {
    const now = new Date().toISOString();
    // crypto.randomUUID() is a Web Crypto global on Node, Bun, Deno and Workers.
    const item: Item = { id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now };
    this.#items.set(item.id, item);
    return item;
  }

  update(id: string, patch: UpdateItemInput): Item | undefined {
    const current = this.#items.get(id);
    if (!current) return undefined;
    const next: Item = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.#items.set(id, next);
    return next;
  }

  delete(id: string): boolean {
    return this.#items.delete(id);
  }
}

export function seedItems(): Item[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'hono-router',
      title: 'Learn how RegExpRouter matches routes',
      description: 'Compare the one-regex strategy with TrieRouter and LinearRouter',
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'hono-rpc',
      title: 'Share types with the RPC client',
      description: 'Export AppType and call the API through hc<AppType>()',
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    },
  ];
}
