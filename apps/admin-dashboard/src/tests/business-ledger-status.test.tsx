import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import OperatorsPage from '../pages/operators/OperatorsPage';
import { parseBusinessLedgerResponse, resolveBusinessLedgerStatus } from '../lib/business-ledger';
import { resolveUserName, UNNAMED_USER_LABEL } from '../lib/assignment-row';

vi.mock('@o4o/auth-client', () => ({ authClient: { api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } } }));

const users = [
  { id: 'u-care', email: 'care@example.invalid', roles: ['neture:carepharm_admin'], status: 'active' },
  { id: 'u-mega', email: 'mega@example.invalid', firstName: '합성', lastName: '담당', roles: ['neture:megapharm_operator'], status: 'active' },
  { id: 'u-neture', email: 'neture@example.invalid', name: '합성 운영자', roles: ['neture:operator'], status: 'active' },
];

function mockGet(ledger: () => Promise<unknown>) {
  vi.mocked(authClient.api.get).mockImplementation(async (url: string) => {
    if (url === '/neture/admin/semi-franchises') return { data: await ledger() } as any;
    return { data: { success: true, users } } as any;
  });
}

function rowOf(email: string): HTMLElement {
  return screen.getByText(email).closest('tr') as HTMLElement;
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('business ledger status is separate from account status', () => {
  it('marks role-only businesses as unregistered and links to a preset that does not save', async () => {
    mockGet(async () => ({ success: true, data: [{ key: 'pharmacy', status: 'active' }, { key: 'megapharm', status: 'closed' }] }));
    render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
    await screen.findByText('care@example.invalid');
    await waitFor(() => expect(rowOf('care@example.invalid').textContent).toContain('사업 미등록'));
    const care = rowOf('care@example.invalid');
    expect(care.textContent).toContain('Active');
    expect(care.querySelector('a')?.getAttribute('href')).toBe('/admin/semi-franchises?register=carepharm');
    expect(rowOf('mega@example.invalid').textContent).toContain('사업 마감');
    expect(rowOf('neture@example.invalid').textContent).not.toMatch(/사업 (미등록|운영|마감)/);
    expect(authClient.api.post).not.toHaveBeenCalled();
  });

  it('shows a lookup failure instead of unregistered', async () => {
    mockGet(async () => { throw new Error('403'); });
    render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
    await screen.findByText('care@example.invalid');
    await waitFor(() => expect(rowOf('care@example.invalid').textContent).toContain('조회 실패'));
    expect(rowOf('care@example.invalid').textContent).not.toContain('사업 미등록');
    expect(rowOf('care@example.invalid').querySelector('a')).toBeNull();
  });

  it('treats a malformed ledger response as a failure, not an empty ledger', () => {
    expect(() => parseBusinessLedgerResponse({ success: true, users: [] })).toThrow();
    expect(() => parseBusinessLedgerResponse({ success: false, error: 'x' })).toThrow('x');
    expect(resolveBusinessLedgerStatus('carepharm', { status: 'ok', byKey: parseBusinessLedgerResponse({ success: true, data: [] }) })).toBe('unregistered');
    expect(resolveBusinessLedgerStatus('pharmcoop', { status: 'ok', byKey: {} })).toBe('not_applicable');
  });

  it.each([
    [null],
    [{ key: 'carepharm', status: 'pending' }],
    [{ key: '', status: 'active' }],
    [{ key: 'megapharm' }],
    [{ key: 'carepharm', status: 'active' }, { key: 'carepharm', status: 'closed' }],
  ])('rejects malformed or conflicting rows instead of offering registration: %j', (...rows) => {
    expect(() => parseBusinessLedgerResponse({ success: true, data: rows })).toThrow();
  });

  it('shows lookup failure without a registration action when a business row is malformed', async () => {
    mockGet(async () => ({ success: true, data: [{ key: 'carepharm', status: 'pending' }] }));
    render(<MemoryRouter><OperatorsPage /></MemoryRouter>);
    await screen.findByText('care@example.invalid');
    await waitFor(() => expect(rowOf('care@example.invalid').textContent).toContain('조회 실패'));
    expect(rowOf('care@example.invalid').querySelector('a')).toBeNull();
  });

  it('falls back from name to first/last to nickname, never to Unknown', () => {
    expect(resolveUserName({ name: ' 표시 ' })).toBe('표시');
    expect(resolveUserName({ firstName: '이름', lastName: '성' })).toBe('성 이름');
    expect(resolveUserName({ nickname: '닉' })).toBe('닉');
    expect(resolveUserName({ email: 'a@example.invalid' })).toBe(UNNAMED_USER_LABEL);
  });
});
