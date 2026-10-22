import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ organizationId: 'store-a', role: 'owner', listSemiFranchises: vi.fn(), listContents: vi.fn(), getContent: vi.fn(), copyContent: vi.fn(), handoff: vi.fn() }));
vi.mock('../../lib/storeOrganizationHeader', async original => ({ ...(await original<object>()), getActiveStoreOrganizationId: () => mocks.organizationId }));
vi.mock('../../lib/serviceContext', async original => ({ ...(await original<object>()), getActiveServiceKey: () => 'kpa-society' }));
vi.mock('../../api/neturePharmacy', () => ({ neturePharmacyApi: mocks, pharmacyErrorCode: () => '', pharmacyErrorMessage: (_e: unknown, fallback: string) => fallback || '요청 실패' }));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: mocks.organizationId, stores: [{ organizationId: mocks.organizationId, memberRole: mocks.role }], effectiveServiceKey: 'kpa-society' }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({user:{id:'fixture'}}) }));
vi.mock('../../lib/apiClient', () => ({ api: {} }));
vi.mock('@o4o/auth-react', () => ({ requestServiceHandoff: mocks.handoff }));
vi.mock('@o4o/content-editor', () => ({ ContentRenderer: ({ html }: { html: string }) => <p>{html}</p> }));
import SemiFranchisesPage from '../neture-pharmacy/SemiFranchisesPage';
import PharmacyContentSourcesPage from '../neture-pharmacy/PharmacyContentSourcesPage';
const business = (key: string, membershipStatus: string | null = 'active') => ({ key, name: key, communityKey: `forum-${key}`, membershipStatus });
const content = { id: 'selected', title: '선택한 자료', body: '선택 자료 본문', semiFranchiseKey: 'network-a' };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.organizationId = 'store-a'; mocks.role = 'owner';
  mocks.listSemiFranchises.mockResolvedValue([business('network-a'), business('pending', 'pending'), business('none', null)]);
  mocks.listContents.mockResolvedValue({ items: [], total: 30 });
  mocks.getContent.mockResolvedValue(content);
  mocks.copyContent.mockResolvedValue({ snapshotId: 'copy' });
  mocks.handoff.mockRejectedValue(new Error('Synthetic'));
});
afterEach(cleanup);
it('활성 가입 사업만 카드로 제공하고 신청 관리 표는 보존한다', async () => {
  render(<MemoryRouter><SemiFranchisesPage /></MemoryRouter>);
  const section = await screen.findByRole('region', { name: '가입한 약국 협력사업' });
  expect(within(section).getByRole('heading', { name: 'network-a' })).toBeTruthy();
  expect(within(section).queryByText('pending')).toBeNull();
  expect(within(section).getByRole('link', { name: '공급 상품' }).getAttribute('href')).toBe('/store/pharmacy/supply?source=sf%3Anetwork-a');
  expect(within(section).getByRole('link', { name: '자료 가져오기' }).getAttribute('href')).toBe('/store/pharmacy/contents?business=network-a');
  expect(screen.getByRole('table')).toBeTruthy();
  fireEvent.click(within(section).getByRole('button', { name: '가입자 공간' }));
  await screen.findByRole('alert');
  expect(mocks.handoff).toHaveBeenCalledWith({}, { serviceKey: 'kpa-society', origin: 'https://pharmacy.neture.co.kr', returnPath: '/businesses/network-a?store=store-a' });
});
it('첫 목록 밖의 선택 자료도 기존 권한 검사 상세 API로 읽고 내 매장으로 복사한다', async () => {
  render(<MemoryRouter initialEntries={['/store/pharmacy/contents?business=network-a&content=selected']}><PharmacyContentSourcesPage /></MemoryRouter>);
  await screen.findByText('선택 자료 본문');
  expect(mocks.getContent).toHaveBeenCalledWith('selected');
  const copy = screen.getByRole('button', { name: /사본|가져오기/ });
  fireEvent.click(copy);
  await waitFor(() => expect(mocks.copyContent).toHaveBeenCalledWith('selected'));
  expect(await screen.findByRole('link', { name: '내 매장 자료함에서 보기' })).toBeTruthy();
});
it('사업과 맞지 않는 선택 자료를 표시하거나 복사하지 않는다', async () => {
  mocks.getContent.mockResolvedValue({ ...content, semiFranchiseKey: 'network-b' });
  render(<MemoryRouter initialEntries={['/store/pharmacy/contents?business=network-a&content=selected']}><PharmacyContentSourcesPage /></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.queryByText('선택한 자료')).toBeNull();
  expect(mocks.copyContent).not.toHaveBeenCalled();
});

it('매장을 바꾸면 이전 매장의 늦은 자료 응답을 버린다', async () => {
  let release!: (value: unknown) => void;
  mocks.listContents.mockReturnValueOnce(new Promise(resolve => { release = resolve; })).mockResolvedValue({ items: [], total: 0 });
  const tree = () => <MemoryRouter><PharmacyContentSourcesPage /></MemoryRouter>;
  const { rerender } = render(tree());
  mocks.organizationId = 'store-b';
  rerender(tree());
  await screen.findByText('이용할 수 있는 협업체 콘텐츠가 없습니다.');
  await act(async () => release({ items: [content], total: 1 }));
  expect(screen.queryByText('선택한 자료')).toBeNull();
});

it('직원에게는 가입자 공간 대신 매장 상품·자료 진입을 유지한다', async () => {
  mocks.role = 'staff';
  render(<MemoryRouter><SemiFranchisesPage /></MemoryRouter>);
  const section = await screen.findByRole('region', { name: '가입한 약국 협력사업' });
  expect(within(section).queryByRole('button', { name: '가입자 공간' })).toBeNull();
  expect(within(section).getByRole('link', { name: '자료 가져오기' })).toBeTruthy();
});

it('복사 실패는 자료 목록을 숨기지 않고 같은 자료에서 바로 재시도한다', async () => {
  mocks.listContents.mockResolvedValue({ items: [content], total: 1 });
  mocks.copyContent.mockRejectedValueOnce(new Error('Unavailable'));
  render(<MemoryRouter><PharmacyContentSourcesPage /></MemoryRouter>);
  await screen.findByText('선택한 자료');
  fireEvent.click(screen.getByRole('button', { name: /사본|가져오기/ }));
  await screen.findByRole('alert');
  expect(screen.getByText('선택한 자료')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /사본|가져오기/ }));
  await screen.findByRole('link', { name: '내 매장 자료함에서 보기' });
  expect(mocks.copyContent).toHaveBeenCalledTimes(2);
});

it.each(['page', 'search'])('링크 선택 자료는 %s 변경 뒤 결과에 다시 삽입하지 않는다', async mode => {
  render(<MemoryRouter initialEntries={['/store/pharmacy/contents?business=network-a&content=selected']}><PharmacyContentSourcesPage /></MemoryRouter>);
  await screen.findByText('선택한 자료');
  expect(mocks.getContent).toHaveBeenCalledTimes(1);
  if (mode === 'page') fireEvent.click(screen.getByRole('button', { name: '다음' }));
  else {
    fireEvent.change(screen.getByPlaceholderText('제목 · 요약 검색'), { target: { value: '새 검색' } });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));
  }
  await screen.findByText(mode === 'search' ? '검색 조건에 맞는 자료가 없습니다.' : 'network-a가 제공한 자료가 아직 없습니다.');
  expect(screen.queryByText('선택한 자료')).toBeNull();
  expect(mocks.getContent).toHaveBeenCalledTimes(1);
});
it('새 조회가 시작되면 이전 복사 오류와 늦은 복사 응답을 버린다', async () => {
  mocks.listContents.mockResolvedValue({ items: [content], total: 1 });
  mocks.copyContent.mockRejectedValueOnce(new Error('Unavailable'));
  render(<MemoryRouter><PharmacyContentSourcesPage /></MemoryRouter>);
  await screen.findByText('선택한 자료');
  fireEvent.click(screen.getByRole('button', { name: /사본|가져오기/ }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: /새로고침/ }));
  await screen.findByText('선택한 자료');
  expect(screen.queryByRole('alert')).toBeNull();
  let reject!: (error: Error) => void;
  mocks.copyContent.mockReturnValueOnce(new Promise((_yes, no) => { reject = no; }));
  fireEvent.click(screen.getByRole('button', { name: /사본|가져오기/ }));
  fireEvent.click(screen.getByRole('button', { name: /새로고침/ }));
  await screen.findByText('선택한 자료');
  await act(async () => reject(new Error('Old request')));
  expect(screen.queryByRole('alert')).toBeNull();
});

it('이용 불가한 자료 딥링크여도 성공한 목록은 유지하고 다른 자료를 복사할 수 있다', async () => {
  mocks.listContents.mockResolvedValue({ items: [{ ...content, id: 'available', title: '이용 가능한 자료' }], total: 1 });
  mocks.getContent.mockRejectedValue({ status: 404 });
  render(<MemoryRouter initialEntries={['/store/pharmacy/contents?business=network-a&content=missing']}><PharmacyContentSourcesPage /></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.getByText('이용 가능한 자료')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /사본|가져오기/ }));
  await screen.findByRole('link', { name: '내 매장 자료함에서 보기' });
  expect(mocks.copyContent).toHaveBeenCalledWith('available');
});

it('CarePharm tags are sent to the server, clear linked content, and reset pagination', async () => {
  mocks.listSemiFranchises.mockResolvedValue([business('carepharm'),business('pharmacy')]);
  mocks.listContents.mockResolvedValue({items:[],total:25});
  render(<MemoryRouter initialEntries={['/store/pharmacy/contents?business=carepharm&page=2&content=old']}><PharmacyContentSourcesPage /></MemoryRouter>);
  await screen.findByRole('combobox',{name:'자료 태그'});
  fireEvent.change(screen.getByRole('combobox',{name:'자료 태그'}),{target:{value:'자료 묶음'}});
  await waitFor(() => expect(mocks.listContents).toHaveBeenLastCalledWith(expect.objectContaining({sf:'carepharm',tag:'자료 묶음',page:1})));
  expect(mocks.getContent).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'검색 초기화'}));
  await waitFor(() => expect(mocks.listContents.mock.calls[mocks.listContents.mock.calls.length - 1]?.[0].tag).toBeUndefined());
});
it('does not show a late result from an old CarePharm tag query', async () => {
  let finish!: (value:unknown) => void;
  mocks.listSemiFranchises.mockResolvedValue([business('carepharm')]);
  mocks.listContents.mockReturnValueOnce(new Promise(resolve => {finish=resolve;})).mockResolvedValue({items:[{...content,title:'현재 태그 자료',semiFranchiseKey:'carepharm'}],total:1});
  render(<MemoryRouter initialEntries={['/store/pharmacy/contents?business=carepharm']}><PharmacyContentSourcesPage /></MemoryRouter>);
  fireEvent.change(screen.getByRole('combobox',{name:'자료 태그'}),{target:{value:'약국 운영'}});
  await screen.findByText('현재 태그 자료');
  await act(async () => finish({items:[{...content,title:'이전 태그 자료',semiFranchiseKey:'carepharm'}],total:1}));
  expect(screen.queryByText('이전 태그 자료')).toBeNull();
});
it('rejects another business material even when returned by the filtered list', async () => {
  mocks.listContents.mockResolvedValue({items:[{...content,semiFranchiseKey:'pharmacy'}],total:1});
  render(<MemoryRouter initialEntries={['/store/pharmacy/contents?business=carepharm&tag=자료 묶음']}><PharmacyContentSourcesPage /></MemoryRouter>);
  await screen.findByRole('alert'); expect(screen.queryByText(content.title)).toBeNull();
});
