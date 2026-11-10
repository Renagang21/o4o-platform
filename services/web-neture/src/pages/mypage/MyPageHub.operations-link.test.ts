import { describe, expect, it, vi } from 'vitest';
vi.mock('../../lib/apiClient', () => ({ api: {}, authClient: { api: {} } }));
import { hasOperatorRole, OPERATIONS_URL } from './MyPageHub';

describe('My Home operations entry (2026-11-10)', () => {
  it('shows the entry only for admin/operator roles', () => {
    expect(hasOperatorRole(['supplier:operator'])).toBe(true);
    expect(hasOperatorRole(['funding:admin'])).toBe(true);
    expect(hasOperatorRole(['neture:pharmcoop_operator'])).toBe(true);
    expect(hasOperatorRole(['platform:super_admin'])).toBe(true);
    expect(hasOperatorRole(['kpa:store_owner', 'user'])).toBe(false);
    expect(hasOperatorRole(undefined)).toBe(false);
  });
  it('points at the single operations workspace', () => {
    expect(OPERATIONS_URL).toBe('https://admin.neture.co.kr/operations');
  });
});
