import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OperatorsPage from '../pages/operators/OperatorsPage';
vi.mock('@o4o/auth-client', () => ({ authClient: { api: { get: vi.fn(async () => ({ data: { success: true, users: [] } })), post: vi.fn(), put: vi.fn(), delete: vi.fn() } } }));
afterEach(cleanup);
describe('central community role picker', () => {
  it('offers Admin only and delegates Operator to the service', async () => {
    const view = render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: '서비스 담당자 지정' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '서비스 담당자 지정' }));
    const service = view.container.querySelector('input[name="target-service"][value="community"]')!;
    fireEvent.click(service);
    expect(screen.getByRole('radio', { name: /community:admin/ })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: /community:operator/ })).toBeNull();
  });
});
