import { cleanup, render, screen } from '@testing-library/react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ organizationId: 'store-a' as string | null }));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: store.organizationId }) }));
import { StoreScopedQueryClient } from '../StoreScopedQueryClient';

afterEach(cleanup);

const seen: QueryClient[] = [];
function Probe() {
  const client = useQueryClient();
  seen.push(client);
  return <p>{String(client.getQueryData(['my-store-channels']) ?? 'empty')}</p>;
}

it('gives each store its own cache so a store switch never reuses the previous store results', () => {
  store.organizationId = 'store-a';
  const { rerender } = render(<StoreScopedQueryClient><Probe /></StoreScopedQueryClient>);
  const first = seen[seen.length - 1];
  first.setQueryData(['my-store-channels'], 'channels-of-a');
  rerender(<StoreScopedQueryClient><Probe /></StoreScopedQueryClient>);
  expect(screen.getByText('channels-of-a')).toBeTruthy();

  store.organizationId = 'store-b';
  rerender(<StoreScopedQueryClient><Probe /></StoreScopedQueryClient>);
  expect(seen[seen.length - 1]).not.toBe(first);
  expect(screen.getByText('empty')).toBeTruthy();
  expect(first.getQueryData(['my-store-channels'])).toBeUndefined();
});
