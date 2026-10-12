import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TermsAcceptanceGate } from '../TermsAcceptanceGate';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    pendingPolicyAcceptances: ['neture', 'kpa-society'].map(serviceKey => ({ serviceKey, documentType: 'terms', policyDocumentId: `${serviceKey}-doc`, version: 2, title: `${serviceKey} terms` })),
    acceptPendingPolicies: vi.fn(async () => ({ success: true })), logout: vi.fn(),
  }),
}));
vi.mock('../../lib/apiClient', () => ({ api: {
  get: vi.fn(async (path: string) => {
    const serviceKey = path.split('/')[3];
    return { data: { data: { id: `${serviceKey}-doc`, serviceKey, documentType: 'terms', version: 2, title: `${serviceKey} terms`, content: `${serviceKey} fixture body` } } };
  }),
} }));

describe('Store 문서별 전문 링크', () => {
  it('두 본문을 표시하되 서비스 문서를 Neture 전문 링크로 잘못 안내하지 않는다', async () => {
    render(<MemoryRouter><TermsAcceptanceGate><span>workspace</span></TermsAcceptanceGate></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByTestId('policy-acceptance-content')).toHaveLength(2));
    const account = screen.getByRole('region', { name: 'neture terms' });
    const pharmacy = screen.getByRole('region', { name: 'kpa-society terms' });
    expect(within(account).getByRole('link').getAttribute('href')).toBe('https://neture.co.kr/terms');
    expect(within(account).getByRole('link').getAttribute('target')).toBe('_blank');
    expect(within(pharmacy).queryByRole('link')).toBeNull();
    expect(within(pharmacy).getByText('kpa-society fixture body')).toBeTruthy();
  });
});
