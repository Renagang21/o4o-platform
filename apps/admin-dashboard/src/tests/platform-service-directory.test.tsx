import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/base';
import { platformAdminApi, type PlatformDirectoryEntry } from '../api/platform-governance';
import PlatformServicesPage from '../pages/platform/account-governance/PlatformServicesPage';

vi.mock('../api/base', () => ({ api: { get: vi.fn() } }));
const get = vi.mocked(api.get);
const entries: PlatformDirectoryEntry[] = [
  { id: 'pharmacy', name: 'O4O 약국 경영지원', description: 'O4O를 이용하는 약국 내에서의 업무를 지원하는 약국 개설자 서비스', group: 'services', kind: '약국 협력사업', url: 'https://pharmacy.neture.co.kr', state: 'active' },
  { id: 'carepharm', name: 'CarePharm · 만성질환관리', description: '사업 지원', group: 'services', kind: '약국 협력사업', url: 'https://carepharm.neture.co.kr', state: 'missing' },
  { id: 'pharmcoop', name: '약국·약사 협동조합', description: '협동조합 연합회', group: 'services', kind: '협동조합 연합회', url: 'https://pharmcoop.neture.co.kr', state: 'federation' },
  { id: 'store', name: '내 매장', description: '매장 업무', group: 'spaces', kind: '업무 공간', url: 'https://store.neture.co.kr', state: 'configured' },
  { id: 'partner', name: 'O4O Partner', description: '서비스 안내', group: 'other', kind: '준비 중', url: 'https://neture.co.kr/services/partner', state: 'planned' },
];
const reply = (data: unknown, success = true) => ({ data: { success, data } });
beforeEach(() => { vi.resetAllMocks(); get.mockResolvedValue(reply(entries)); });

describe('directory client', () => {
  it('uses the new current directory endpoint', async () => {
    expect(await platformAdminApi.getServiceDirectory()).toEqual(entries);
    expect(get).toHaveBeenCalledWith('/admin/platform-services/directory');
  });
  it.each([reply([], false), reply(undefined), reply({})])('rejects malformed and failed envelopes instead of displaying an empty catalog', async value => {
    get.mockResolvedValue(value);
    await expect(platformAdminApi.getServiceDirectory()).rejects.toThrow();
  });
});

describe('current service directory', () => {
  it('shows separate groups and current addresses with business-specific states', async () => {
    render(<PlatformServicesPage />);
    await screen.findByRole('heading', { name: 'O4O 약국 경영지원' });
    expect(screen.getByText('O4O를 이용하는 약국 내에서의 업무를 지원하는 약국 개설자 서비스')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /현재 서비스/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /대표·공통 업무 공간/ })).toBeInTheDocument();
    const care = screen.getByRole('heading', { name: /CarePharm/ }).closest('li')!;
    expect(within(care).getByText('사업 미등록')).toBeInTheDocument();
    const link = within(care).getByRole('link');
    expect(link).toHaveAttribute('href', 'https://carepharm.neture.co.kr');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByText('활성')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /neture.co.kr\/services\/partner/ })).toHaveAttribute('href', 'https://neture.co.kr/services/partner');
  });
  it('searches names and domains without losing group filtering or confusing no results with an empty registry', async () => {
    render(<PlatformServicesPage />);
    await screen.findByRole('heading', { name: /CarePharm/ });
    fireEvent.change(screen.getByRole('textbox', { name: '서비스명 또는 주소 검색' }), { target: { value: ' CAREPHARM.NETURE ' } });
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
    fireEvent.change(screen.getByRole('combobox', { name: '구분' }), { target: { value: 'spaces' } });
    expect(screen.getByText('검색 조건에 맞는 서비스가 없습니다.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    expect(screen.getByRole('heading', { name: '내 매장' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /CarePharm/ })).not.toBeInTheDocument();
  });
  it('shows loading and recovers an unavailable ledger through explicit retry', async () => {
    get.mockRejectedValueOnce({ response: { status: 503, data: { error: '현재 서비스 목록을 불러오지 못했습니다.' } } });
    render(<PlatformServicesPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    await screen.findByRole('alert');
    expect(screen.queryByText('사업 미등록')).not.toBeInTheDocument();
    expect(screen.queryByText('현재 서비스 목록이 없습니다.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    await screen.findByRole('heading', { name: /CarePharm/ });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('does not fall back to the legacy catalog for a forbidden request', async () => {
    get.mockRejectedValue({ response: { status: 403 } });
    render(<PlatformServicesPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('O4O 플랫폼 관리자 권한');
    expect(get).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });
});
