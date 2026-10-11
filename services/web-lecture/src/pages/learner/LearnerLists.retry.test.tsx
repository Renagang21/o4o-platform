import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ enrollments: vi.fn(), certificates: vi.fn() }));
vi.mock('../../api/lecture', () => ({
  learnerApi: { getMyEnrollments: mocks.enrollments, getMyCertificates: mocks.certificates },
  errorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('../../lib/apiClient', () => ({ api: { get: vi.fn() } }));
vi.mock('../../components/Toast', () => ({ useToast: () => ({ error: vi.fn() }) }));
import MyEnrollmentsPage from './MyEnrollmentsPage';
import MyCertificatesPage from './MyCertificatesPage';

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe.each([
  ['내 강의', MyEnrollmentsPage, mocks.enrollments, '수강 중인 강의가 없습니다'],
  ['내 수료증', MyCertificatesPage, mocks.certificates, '발급된 수료증이 없습니다'],
] as const)('%s 조회 복구', (_name, Page, load, emptyTitle) => {
  it('조회 실패를 빈 결과와 구분하고 페이지 새로고침 없이 재시도한다', async () => {
    load.mockRejectedValueOnce(new Error('fixture failure'));
    render(<MemoryRouter><Page /></MemoryRouter>);
    const alert = await screen.findByRole('alert');
    expect(screen.queryByText(emptyTitle)).toBeNull();
    let resolve!: (value: { data: unknown[] }) => void;
    load.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    fireEvent.click(within(alert).getByRole('button', { name: '다시 시도' }));
    await screen.findByText('불러오는 중...');
    expect(screen.queryByRole('alert')).toBeNull();
    resolve({ data: [] });
    await screen.findByText(emptyTitle);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
