import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OperatorSemiFranchisePage from '../../../../../../packages/operator-core-ui/src/modules/pharmacy-management/OperatorSemiFranchisePage';
import { neturePharmacyOperatorApi as api, type SemiFranchise } from '../../../../../../packages/operator-core-ui/src/modules/pharmacy-management/api';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const businesses = [
  { key: 'pharmacy', name: '약국 사업', status: 'active', community_key: null },
  { key: 'other', name: '다른 사업', status: 'active', community_key: 'other-forum' },
] as SemiFranchise[];
it.each([false, true])('서비스별 게시판 주소를 사용하며 약국 사업으로 범위를 제한한다 (약국 소비처=%s)', async pharmacy => {
  vi.spyOn(api, 'listAssignedSemiFranchises').mockResolvedValue(businesses);
  vi.spyOn(api, 'listSfMemberships').mockResolvedValue([]);
  render(<MemoryRouter><OperatorSemiFranchisePage businessKey={pharmacy ? 'pharmacy' : undefined}
    forumHref={pharmacy ? () => '/community' : undefined} /></MemoryRouter>);
  expect((await screen.findByRole('link', { name: '참여자 게시판' })).getAttribute('href')).toBe(pharmacy ? '/community' : '/communities/business%3Apharmacy/forum');
  expect(screen.getByRole('heading', { name: '담당 약국 협력사업' })).toBeTruthy();
  expect(screen.queryByRole('option', { name: /다른 사업/ }) !== null).toBe(!pharmacy);
});

it.each([false, true])('late membership results cannot overwrite the new business tab (pharmacy=%s)', async pharmacy => {
  let previous!: (value: unknown[]) => void;
  vi.spyOn(api, 'listAssignedSemiFranchises').mockResolvedValue(businesses);
  vi.spyOn(api, 'listSfMemberships').mockImplementation(() => new Promise(done => { previous = done; }));
  vi.spyOn(api, 'listContents').mockResolvedValue([{ id: 'content', title: '현재 사업 자료', status: 'draft', updatedAt: '2026-10-11' }] as any);
  render(<MemoryRouter><OperatorSemiFranchisePage businessKey={pharmacy ? 'pharmacy' : undefined} /></MemoryRouter>);
  await screen.findByRole('heading', { name: '담당 약국 협력사업' });
  fireEvent.click(screen.getByRole('button', { name: '콘텐츠', exact: true }));
  await screen.findByText('현재 사업 자료');
  await act(async () => previous([]));
  expect(screen.getByText('현재 사업 자료')).toBeTruthy();
});

it('assignment read failure is retryable and is distinct from having no assigned business', async () => {
  vi.spyOn(api, 'listAssignedSemiFranchises').mockRejectedValueOnce(new Error('담당 조회 실패')).mockResolvedValueOnce([]);
  render(<MemoryRouter><OperatorSemiFranchisePage /></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.queryByText(/담당으로 지정된 약국 협력사업이 없습니다/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '담당 사업 다시 조회' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(api.listAssignedSemiFranchises).toHaveBeenCalledTimes(2);
});

it('switching assigned businesses cannot show or act on the previous business rows', async () => {
  let previous!: (value: unknown[]) => void;
  vi.spyOn(api, 'listAssignedSemiFranchises').mockResolvedValue(businesses);
  vi.spyOn(api, 'listSfMemberships').mockImplementationOnce(() => new Promise(done => { previous = done; })).mockResolvedValueOnce([]);
  render(<MemoryRouter><OperatorSemiFranchisePage /></MemoryRouter>);
  const select = await screen.findByRole('combobox', { name: '담당 사업' });
  fireEvent.change(select, { target: { value: 'other' } });
  await waitFor(() => expect(api.listSfMemberships).toHaveBeenLastCalledWith('other', 'pending'));
  await act(async () => previous([{ id: 'previous-row', organizationName: '이전 사업 회원', status: 'pending' }]));
  expect(screen.queryByText('이전 사업 회원')).toBeNull();
});

it('종료된 담당 사업에 접근 불가 게시판 링크를 제공하지 않는다', async () => {
  vi.spyOn(api, 'listAssignedSemiFranchises').mockResolvedValue([{ ...businesses[0], status: 'closed' }]);
  vi.spyOn(api, 'listSfMemberships').mockResolvedValue([]);
  render(<MemoryRouter><OperatorSemiFranchisePage /></MemoryRouter>);
  await screen.findByRole('heading', { name: '담당 약국 협력사업' });
  expect(screen.queryByRole('link', { name: '참여자 게시판' })).toBeNull();
});
