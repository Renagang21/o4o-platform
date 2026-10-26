import { afterEach, beforeEach, expect, it, vi, describe } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { configurePharmacyManagementClient } from '@o4o/operator-core-ui/modules/pharmacy-management';
const mocks = vi.hoisted(() => ({ user: { id: 'operator-a' } as { id: string } | null, get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../../../lib/apiClient', () => ({ api: mocks, authClient: { api: mocks } }));
vi.mock('@o4o/auth-react', () => ({ requestServiceHandoff: vi.fn() }));
vi.mock('@o4o/content-editor', async (importOriginal) => ({ ...(await importOriginal<typeof import('@o4o/content-editor')>()), RichTextEditor: () => <div>본문 편집기</div> }));
import NeturePage from '../OperatorSemiFranchisePage';
import NetureEditor from '../SemiFranchiseContentFormPage';
import { PharmacyOperatorPage as PharmacyPage, PharmacyOperatorContentPage as PharmacyEditor } from '../../../../../web-pharmacy-business/src/pages/business/PharmacyOperatorPages';
vi.mock('../../../../../web-pharmacy-business/src/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }), authClient: { api: mocks } }));
const envelope = (data: unknown) => ({ data: { success: true, data } });
const sf = { key: 'pharmacy', name: '담당 사업 A', status: 'active', community_key: 'business:pharmacy' };
describe.each([['Neture compatibility', NeturePage, NetureEditor], ['Pharmacy', PharmacyPage, PharmacyEditor]] as const)('%s operator account scope', (_label, Page, Editor) => {
  const tree = (edit = false) => <MemoryRouter initialEntries={[edit ? '/operator/semi-franchises/pharmacy/contents/content-a/edit' : '/operator/semi-franchises?tab=memberships']}><Routes>
    <Route path="/operator/semi-franchises" element={<Page />} />
    <Route path="/operator/semi-franchises/:key/contents/:id/edit" element={<Editor />} />
  </Routes></MemoryRouter>;
  beforeEach(() => { mocks.user = { id: 'operator-a' }; mocks.get.mockReset(); mocks.post.mockReset(); mocks.patch.mockReset();
    configurePharmacyManagementClient({ ...mocks, put: vi.fn(), delete: vi.fn() });
  });
  afterEach(cleanup);
  it('drops the previous operators rows and late list response after account switch', async () => {
    let resolve!: (value: unknown) => void;
    mocks.get.mockImplementation(async (path: string) => path.endsWith('/semi-franchises') ? envelope([sf]) : new Promise(r => { resolve = r; }));
    const view = render(tree());
    await waitFor(() => expect(mocks.get.mock.calls.some(([p]) => p.includes('/memberships'))).toBe(true));
    mocks.user = { id: 'operator-b' }; mocks.get.mockResolvedValue(envelope([]));
    view.rerender(tree());
    await screen.findByText('담당으로 지정된 약국 협력사업이 없습니다. 전체 관리자에게 담당 지정을 요청하세요.');
    await act(async () => { resolve(envelope([{ id: 'old', organizationName: '이전 약국', status: 'pending' }])); });
    expect(screen.queryByText('이전 약국')).toBeNull();
    expect(screen.queryByLabelText('담당 사업')).toBeNull();
  });
  it('clears the previous operators draft and ignores its late save after account switch', async () => {
    mocks.get.mockResolvedValue(envelope({ id: 'content-a', title: '이전 운영자 자료', status: 'draft', semiFranchiseKey: 'pharmacy', semiFranchiseName: '담당 사업 A', tags: [], attachments: [] }));
    let resolve!: (value: unknown) => void;
    mocks.patch.mockImplementation(() => new Promise(r => { resolve = r; }));
    const view = render(tree(true));
    await screen.findByDisplayValue('이전 운영자 자료');
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));
    await waitFor(() => expect(mocks.patch).toHaveBeenCalledTimes(1));
    mocks.user = { id: 'operator-b' }; mocks.get.mockRejectedValue(new Error('담당 사업이 아닙니다.'));
    view.rerender(tree(true));
    await screen.findByRole('alert');
    await act(async () => { resolve(envelope({ id: 'content-a' })); });
    expect(screen.queryByDisplayValue('이전 운영자 자료')).toBeNull();
    expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '담당 약국 협력사업' })).toBeNull();
  });

});

describe('CarePharm operator adapter model scope', () => {
  beforeEach(() => {
    mocks.user = { id: 'carepharm-operator' }; mocks.get.mockReset(); mocks.post.mockReset(); mocks.patch.mockReset();
    configurePharmacyManagementClient({ ...mocks, put: vi.fn(), delete: vi.fn() });
  });
  afterEach(cleanup);
  it('forwards the requested model instead of showing every assigned business', async () => {
    mocks.get.mockImplementation(async (path: string) => envelope(path.endsWith('/semi-franchises') ? [sf, { ...sf, key: 'carepharm', name: '만성질환관리' }] : []));
    render(<MemoryRouter initialEntries={['/operator/semi-franchises?tab=memberships']}><NeturePage businessKey="carepharm" /></MemoryRouter>);
    await waitFor(() => expect(mocks.get.mock.calls.some(([path]) => path.includes('/carepharm/memberships'))).toBe(true));
    expect(mocks.get.mock.calls.some(([path]) => path.includes('/pharmacy/memberships'))).toBe(false);
  });
  it('does not load a different model content editor through a direct URL', () => {
    render(<MemoryRouter initialEntries={['/operator/semi-franchises/pharmacy/contents/content-a/edit']}><Routes><Route path="/operator/semi-franchises/:key/contents/:id/edit" element={<NetureEditor businessKey="carepharm" />} /></Routes></MemoryRouter>);
    expect(screen.getByText('이 사업의 콘텐츠가 아닙니다.')).toBeTruthy();
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
