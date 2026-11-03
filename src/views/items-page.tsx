import type { Item } from '../types.js';
import { Layout } from './layout.js';

const labels: Record<Item['status'], string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Done',
};

export function ItemsPage({ items }: { items: Item[] }) {
  return (
    <Layout title={`Items (${items.length})`}>
      <h1>Items</h1>
      {items.length === 0 ? (
        <p>No items yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li id={`item-${item.id}`}>
              {/* Text children are HTML-escaped, so user input cannot inject markup. */}
              <strong>{item.title}</strong> <em>{labels[item.status]}</em>
              {item.description && <p>{item.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
