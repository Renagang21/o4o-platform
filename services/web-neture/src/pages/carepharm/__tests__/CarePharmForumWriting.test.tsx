import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForumWritePage } from '../../forum/ForumWritePage';

const api = vi.hoisted(() => ({ create:vi.fn(), categories:vi.fn(), contacts:vi.fn(), read:vi.fn() }));
vi.mock('../../../contexts', () => ({ useAuth:() => ({isAuthenticated:true,user:{id:'synthetic-owner'}}),useLoginModal:() => ({openLoginModal:vi.fn()}) }));
vi.mock('../../../services/forumApi', () => ({createForumPost:api.create,fetchForumCategories:api.categories,fetchUserContactSettings:api.contacts,fetchForumPostBySlug:api.read,updateForumPost:vi.fn(),extractTextContent:vi.fn()}));
vi.mock('@o4o/content-editor', () => ({ RichTextEditor:({value,onChange}: {value:string;onChange:(value:{html:string})=>void}) => <textarea aria-label="본문 편집" value={value} onChange={event=>onChange({html:event.target.value})} />, ContentRenderer:()=>null }));

beforeEach(() => {
  vi.resetAllMocks();
  api.categories.mockResolvedValue({data:[{id:'case-board',slug:'cases',name:'운영 사례',tags:[]},{id:'request-board',slug:'requests',name:'자료 요청',tags:[]}]});
  api.contacts.mockResolvedValue(null); api.create.mockResolvedValue({success:true,data:{slug:'created'}});
});
afterEach(cleanup);
function mount(context:'carepharm'|null='carepharm',search='') {
  return render(<MemoryRouter initialEntries={[`/communities/business%3Acarepharm/forum/write${search}`]}><ForumWritePage communityLabel="회원 공간" backPath="/communities/business%3Acarepharm/forum" writingContext={context ?? undefined} /></MemoryRouter>);
}
it('requires explicit board selection and posts to that board while guide changes preserve the draft', async () => {
  mount(); await screen.findByRole('option',{name:'자료 요청'});
  fireEvent.change(screen.getByPlaceholderText('제목을 입력하세요'),{target:{value:'안내물 요청'}});
  fireEvent.change(screen.getByLabelText('본문 편집'),{target:{value:'<p>약국 진열에 사용할 안내물 자료가 필요합니다.</p>'}});
  fireEvent.click(screen.getByRole('button',{name:'자료 요청 작성 도움'}));
  expect(screen.getByDisplayValue('안내물 요청')).toBeTruthy();
  expect(screen.getByLabelText('본문 편집').textContent).toContain('약국 진열');
  expect(api.create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'등록하기'}));
  await screen.findByText('현재 글을 등록할 수 있는 게시판이 없습니다. 잠시 후 다시 시도해주세요.');
  expect(api.create).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('combobox',{name:'게시할 게시판'}),{target:{value:'request-board'}});
  fireEvent.click(screen.getByRole('button',{name:'등록하기'}));
  await waitFor(()=>expect(api.create).toHaveBeenCalledOnce());
  expect(api.create.mock.calls[0][0]).toMatchObject({forumId:'request-board',title:'안내물 요청'});
  expect(api.create.mock.calls[0][0]).not.toHaveProperty('type');
});
it('does not silently select a different board for a missing board link', async () => {
  mount('carepharm','?forum=missing'); await screen.findByRole('option',{name:'자료 요청'});
  expect((screen.getByRole('combobox',{name:'게시할 게시판'}) as HTMLSelectElement).value).toBe('');
});
it('preselects an existing board link without creating a post or board', async () => {
  mount('carepharm','?forum=cases');
  await waitFor(()=>expect((screen.getByRole('combobox',{name:'게시할 게시판'}) as HTMLSelectElement).value).toBe('case-board'));
  expect(api.create).not.toHaveBeenCalled();
});
it('does not add CarePharm controls to the regular community writer', async () => {
  mount(null); await screen.findByText('운영 사례');
  expect(screen.queryByRole('region',{name:'CarePharm 회원 글 작성 도움'})).toBeNull();
  expect(screen.queryByRole('combobox',{name:'게시할 게시판'})).toBeNull();
});
