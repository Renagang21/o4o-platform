import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const state=vi.hoisted(()=>({user:{id:'member'} as {id:string}|null,items:[] as any[],get:vi.fn(),post:vi.fn(),handoff:vi.fn()}));
vi.mock('../../../contexts',()=>({useAuth:()=>({user:state.user})}));
vi.mock('../../../lib/apiClient',()=>({API_BASE_URL:'https://api.example.test',api:{get:state.get,post:state.post}}));
vi.mock('../../../lib/api/media',()=>({mediaApi:{list:vi.fn(),upload:vi.fn(),moveToFolder:vi.fn(),deleteAsset:vi.fn()}}));
vi.mock('@o4o/auth-react',()=>({requestServiceHandoff:state.handoff}));
import Page from '../CommunitySignagePage';
const existing={id:'90000000-0000-4000-a000-000000000001',name:'공유 영상',sourceType:'youtube',sourceUrl:'https://youtu.be/abcdefghijk'};
beforeEach(()=>{
  vi.clearAllMocks();state.user={id:'member'};state.items=[existing];
  state.get.mockImplementation(async()=>({data:{data:{items:state.items,hasNext:false,canRegister:!!state.user}}}));
  state.post.mockImplementation(async(path,body)=>{
    if(path==='/api/ai/query')return {data:{success:true,answer:JSON.stringify({name:'새 공유 영상',description:'입력 자료',tags:['안내']})}};
    const row={...body,id:'saved',sourceType:'youtube'};state.items=[row];return {data:{success:true,data:row}};
  });
});
afterEach(cleanup);
it('uses the shared registration flow and refreshes the actual saved catalog',async()=>{
  render(<MemoryRouter><Page/></MemoryRouter>);await screen.findByRole('heading',{name:'AI 동영상 등록'});
  fireEvent.change(screen.getByLabelText('개별 영상 주소'),{target:{value:'https://youtu.be/abcdefghijk'}});
  fireEvent.change(screen.getByPlaceholderText('이 영상을 매장 안내 영상으로 등록해 줘'),{target:{value:'이 영상 등록해 줘'}});
  fireEvent.click(screen.getByRole('button',{name:'AI로 등록'}));
  await screen.findByRole('heading',{name:'새 공유 영상'});
  expect(state.post.mock.calls.map(call=>call[0])).toEqual(['/api/ai/query','/communities/community/signage']);
  expect(state.post.mock.calls[1][1]).toMatchObject({sourceUrl:'https://youtu.be/abcdefghijk',name:'새 공유 영상'});
});
it('hands off through existing authentication to an explicit selected-store import screen',async()=>{
  render(<MemoryRouter><Page/></MemoryRouter>);await screen.findByText('공유 영상');
  fireEvent.click(screen.getByRole('button',{name:'내 매장에서 이용'}));
  await waitFor(()=>expect(state.handoff).toHaveBeenCalledWith(expect.anything(),{workspace:'store',origin:'https://store.neture.co.kr',returnPath:expect.stringMatching(new RegExp(`^/store/marketing/signage/videos\\?communityVideo=${existing.id}&communityRequest=[a-f0-9-]+$`))}));
});
it('keeps the shared catalog visible to visitors without a false registration control',async()=>{
  state.user=null;render(<MemoryRouter><Page/></MemoryRouter>);await screen.findByText('공유 영상');
  expect(screen.queryByRole('heading',{name:'AI 동영상 등록'})).toBeNull();expect(state.post).not.toHaveBeenCalled();
});
