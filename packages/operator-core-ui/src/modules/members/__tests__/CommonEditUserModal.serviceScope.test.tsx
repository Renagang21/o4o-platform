import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { CommonEditUserModal } from '../CommonEditUserModal';
vi.mock('@o4o/ui', () => ({ AddressSearch: () => null }));
afterEach(cleanup);
describe('shared member editor service boundary', () => {
  it('loads the selected membership service rather than all memberships', async () => {
    const userId = '11111111-2222-4333-8444-555555555555';
    const makeRequest = vi.fn(async () => ({ user: { id: userId }, roles: [], memberships: [] }));
    render(<CommonEditUserModal userId={userId} config={{ serviceKey: 'neture', makeRequest, membershipRoleOptions: [], adminRoleOptions: [] }} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await waitFor(() => expect(makeRequest).toHaveBeenCalledWith('GET', `/operator/members/${userId}?serviceKey=neture`));
  });
});
