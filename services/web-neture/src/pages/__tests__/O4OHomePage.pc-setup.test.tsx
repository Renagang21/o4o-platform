import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const mocks=vi.hoisted(()=>({send:vi.fn(),login:vi.fn(),card:vi.fn(),auth:{user:{id:'synthetic-user',name:'Synthetic',email:'synthetic@example.invalid',roles:[] as string[]},isAuthenticated:true,isLoading:false,pendingPolicyAcceptances:[] as unknown[],logout:vi.fn()},scope:{serviceKey:'neture',workspace:'home'}}));
vi.mock('../../contexts',()=>({useAuth:()=>mocks.auth,useLoginModal:()=>({openLoginModal:mocks.login}),useWorkScope:()=>({workScope:mocks.scope,isResolvingStore:false})}));
vi.mock('../../lib/home-entry',()=>({useHomeEntry:()=>({data:null,loading:false,error:null,reload:vi.fn()})}));
vi.mock('../../components/home/HomeServiceNews',()=>({default:()=>null}));
vi.mock('../../components/home/HomeEntryPanel',()=>({default:()=>null}));
vi.mock('../../lib/apiClient',()=>({api:{get:async()=>({data:{success:true,data:null}})}}));
vi.mock('../../lib/footerLegal',()=>({loadFooterLegal:vi.fn(async()=>null)}));
vi.mock('../../components/mypage/LocalAgentCard',()=>({default:()=>{mocks.card();return <p>기존 설치·연결 카드</p>}}));
vi.mock('../../lib/ai/unified-request',async original=>({...await original<typeof import('../../lib/ai/unified-request')>(),sendUnifiedRequest:mocks.send}));
import O4OHomePage from '../O4OHomePage';
const page=()=> <MemoryRouter><O4OHomePage /></MemoryRouter>;
const unavailable={kind:'work',work:{goal:{goalId:'goal',status:'waiting_for_user',siteId:'synthetic-site',displayName:'합성 대상'},progress:'needs_user',takeover:null,neededInput:null,stepCount:0,aiPlanCount:0,path:null,history:[],message:'PC 준비 필요',errorCode:'LOCAL_AGENT_NO_DEVICE',target:null,runId:null,resumable:false}};
const completed={kind:'work',work:{...unavailable.work,progress:'completed',errorCode:null,message:'완료'}};
beforeEach(()=>{vi.clearAllMocks();mocks.send.mockReset();mocks.auth.user={id:'synthetic-user',name:'Synthetic',email:'synthetic@example.invalid',roles:[]};mocks.auth.isAuthenticated=true;mocks.scope={serviceKey:'neture',workspace:'home'};vi.spyOn(navigator,'platform','get').mockReturnValue('Win32');mocks.send.mockResolvedValue(completed);});
afterEach(()=>{cleanup();vi.restoreAllMocks()});
async function send(text='합성 프로그램에서 주문을 준비해 줘'){
 fireEvent.change(screen.getByTestId('home-composer-input'),{target:{value:text}});
 await waitFor(()=>expect((screen.getByTestId('home-composer-submit') as HTMLButtonElement).disabled).toBe(false));
 fireEvent.click(screen.getByTestId('home-composer-submit'));
}
it('opens inline on first pre-action PC failure, preserves confirmed request/attachment, and retries only by explicit action',async()=>{
 mocks.send.mockResolvedValueOnce({kind:'confirm',confirm:{message:'이 작업을 진행할까요?'}}).mockResolvedValueOnce(unavailable).mockResolvedValueOnce(completed);
 render(page());const file=new File(['code,name\n0001,합성'], 'fixture.csv',{type:'text/csv'});
 fireEvent.change(screen.getByTestId('home-composer-file'),{target:{files:[file]}});
 await send();await screen.findByText('이 작업을 진행할까요?');fireEvent.click(screen.getByRole('button',{name:'진행',exact:true}));
 await screen.findByRole('region',{name:'자동화 PC 설치·연결 준비'});
 expect(screen.getByTestId('home-composer-input')).toHaveProperty('value','합성 프로그램에서 주문을 준비해 줘');
 expect(screen.getByTestId('home-composer-attachments').textContent).toContain('fixture.csv');expect(mocks.send).toHaveBeenCalledTimes(2);
 expect(mocks.card).toHaveBeenCalled();expect(screen.queryByText('Chrome 의 현재 화면에서 직접 이어서 진행하세요.')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'설치·연결 후 요청 계속'}));await screen.findByText('완료');
 expect(mocks.send).toHaveBeenCalledTimes(3);expect(mocks.send.mock.calls[2][0]).toMatchObject({text:'합성 프로그램에서 주문을 준비해 줘',routeHint:'work',attachments:[{file}]});
 expect(screen.queryByRole('region',{name:'자동화 PC 설치·연결 준비'})).toBeNull();expect(screen.getByTestId('home-composer-input')).toHaveProperty('value','');
});
it('does not force local installation for chat or an available execution node',async()=>{
 mocks.send.mockResolvedValueOnce({kind:'chat',chat:{message:'대화 응답'}}).mockResolvedValueOnce(completed);render(page());
 await send('안내를 설명해 줘');await screen.findByText('대화 응답');expect(mocks.card).not.toHaveBeenCalled();
 await send();await screen.findByText('완료');expect(mocks.card).not.toHaveBeenCalled();
});
it('mobile opens execution-PC instructions without mounting localhost pairing and can explicitly retry after remote setup',async()=>{
 vi.spyOn(navigator,'platform','get').mockReturnValue('iPhone');mocks.send.mockResolvedValueOnce(unavailable).mockResolvedValueOnce(completed);render(page());
 await send();await screen.findByText(/업무를 실행할 Windows PC에서 같은 계정/);expect(mocks.card).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'설치·연결 후 요청 계속'}));await screen.findByText('완료');expect(mocks.send).toHaveBeenCalledTimes(2);
});
it('does not offer first-action replay after any executed step',async()=>{
 mocks.send.mockResolvedValueOnce({kind:'work',work:{...unavailable.work,errorCode:'LOCAL_AGENT_OFFLINE',stepCount:1,history:[{step:1,kind:'action',status:'success'}],message:'이어서 직접 확인'}});render(page());await send();await screen.findByText('이어서 직접 확인');
 expect(screen.queryByRole('region',{name:'자동화 PC 설치·연결 준비'})).toBeNull();expect(mocks.card).not.toHaveBeenCalled();
});
it('provides a Main setup entry without starting AI and closes setup on account/scope changes',async()=>{
 const view=render(page());fireEvent.click(screen.getByRole('button',{name:'PC 연결 준비',exact:true}));await screen.findByRole('region',{name:'자동화 PC 설치·연결 준비'});expect(mocks.send).not.toHaveBeenCalled();
 mocks.scope={...mocks.scope,workspace:'other'};view.rerender(page());await waitFor(()=>expect(screen.queryByRole('region',{name:'자동화 PC 설치·연결 준비'})).toBeNull());
 mocks.send.mockResolvedValueOnce(unavailable);await send();await screen.findByRole('region',{name:'자동화 PC 설치·연결 준비'});
 mocks.auth.user={...mocks.auth.user,id:'other-user'};view.rerender(page());await waitFor(()=>expect(screen.queryByRole('region',{name:'자동화 PC 설치·연결 준비'})).toBeNull());expect(screen.getByTestId('home-composer-input')).toHaveProperty('value','');
});
it('retains login gate and does not probe or mount setup for visitors',async()=>{
 mocks.auth.isAuthenticated=false;render(page());await send();expect(mocks.login).toHaveBeenCalled();expect(mocks.send).not.toHaveBeenCalled();expect(mocks.card).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'PC 연결 준비',exact:true})).toBeNull();
});

it('discards late setup responses after the work context changes',async()=>{
 let finish!:(value:unknown)=>void;mocks.send.mockReturnValueOnce(new Promise(resolve=>{finish=resolve}));const view=render(page());await send();
 mocks.scope={...mocks.scope,workspace:'other'};view.rerender(page());finish(unavailable);
 await waitFor(()=>expect(screen.queryByTestId('home-composer-pending')).toBeNull());expect(screen.queryByRole('region',{name:'자동화 PC 설치·연결 준비'})).toBeNull();expect(mocks.card).not.toHaveBeenCalled();
});
it('routes an edited request normally instead of carrying the previous work confirmation',async()=>{
 mocks.send.mockResolvedValueOnce({kind:'confirm',confirm:{message:'이 작업을 진행할까요?'}}).mockResolvedValueOnce(unavailable).mockResolvedValueOnce({kind:'chat',chat:{message:'새 질문 응답'}});render(page());await send();await screen.findByText('이 작업을 진행할까요?');fireEvent.click(screen.getByRole('button',{name:'진행',exact:true}));await screen.findByRole('region',{name:'자동화 PC 설치·연결 준비'});
 fireEvent.change(screen.getByTestId('home-composer-input'),{target:{value:'다른 질문을 설명해 줘'}});fireEvent.click(screen.getByRole('button',{name:'설치·연결 후 요청 계속'}));await screen.findByText('새 질문 응답');expect(mocks.send.mock.calls[2][0].routeHint).toBeUndefined();expect(mocks.send.mock.calls[2][0].text).toBe('다른 질문을 설명해 줘');
});
