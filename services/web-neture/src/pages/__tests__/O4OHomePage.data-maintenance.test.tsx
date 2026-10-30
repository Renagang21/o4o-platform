import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const mocks=vi.hoisted(()=>({send:vi.fn(),login:vi.fn(),auth:{user:{id:'synthetic-user',name:'Synthetic',email:'synthetic@example.invalid',roles:[] as string[]},isAuthenticated:true,isLoading:false,pendingPolicyAcceptances:[] as unknown[],logout:vi.fn()},scope:{serviceKey:'neture',workspace:'home'}}));
vi.mock('../../contexts',()=>({useAuth:()=>mocks.auth,useLoginModal:()=>({openLoginModal:mocks.login}),useWorkScope:()=>({workScope:mocks.scope,isResolvingStore:false})}));
vi.mock('../../lib/home-entry',()=>({useHomeEntry:()=>({data:null,loading:false,error:null,reload:vi.fn()})}));
vi.mock('../../components/home/HomeServiceNews',()=>({default:()=>null}));
vi.mock('../../components/home/HomeEntryPanel',()=>({default:()=>null}));
vi.mock('../../lib/apiClient',()=>({api:{get:async()=>({data:{success:true,data:null}})}}));
vi.mock('../../lib/footerLegal',()=>({loadFooterLegal:vi.fn(async()=>null)}));
vi.mock('../../lib/ai/unified-request',async original=>({...await original<typeof import('../../lib/ai/unified-request')>(),sendUnifiedRequest:mocks.send}));
import O4OHomePage from '../O4OHomePage';
const page=()=> <MemoryRouter><O4OHomePage /></MemoryRouter>;
const work={kind:'work',work:{goal:{goalId:'goal',status:'waiting_for_user',siteId:'synthetic-site',displayName:'합성 대상'},progress:'needs_user',takeover:null,neededInput:'포장 수량을 확인해 주세요',stepCount:0,aiPlanCount:0,path:null,history:[],message:'확인 필요',errorCode:null,target:null,runId:'g_synthetic',resumable:true}};
beforeEach(()=>{vi.clearAllMocks();mocks.auth.user={id:'synthetic-user',name:'Synthetic',email:'synthetic@example.invalid',roles:[]};mocks.auth.isAuthenticated=true;mocks.send.mockResolvedValue(work);});
afterEach(cleanup);
function prepare(){
 fireEvent.change(screen.getByTestId('home-composer-input'),{target:{value:'합성 상품은 500정 2포장으로 수정해 주세요'}});
}
it('starts from ordinary conversation without a separate data maintenance menu or form',()=>{
 render(page());
 expect(screen.queryByRole('button',{name:'데이터 정비',exact:true})).toBeNull();
 expect(screen.queryByRole('region',{name:'업무 데이터 정비'})).toBeNull();
 prepare();expect(mocks.send).not.toHaveBeenCalled();
 expect(screen.getByTestId('home-composer-input')).toHaveProperty('value','합성 상품은 500정 2포장으로 수정해 주세요');
});
it('reuses the waiting run, original target, scope and attachments, including after a transport error',async()=>{
 render(page());fireEvent.change(screen.getByTestId('home-composer-input'),{target:{value:'상품 준비'}});fireEvent.click(screen.getByTestId('home-composer-submit'));
 await waitFor(()=>expect(screen.getByTestId('home-composer-submit')).toHaveProperty('disabled',true));
 await screen.findByText('확인 필요');
 fireEvent.change(screen.getByTestId('home-composer-file'),{target:{files:[new File(['synthetic'], 'fixture.txt',{type:'text/plain'})]}});
 prepare();mocks.send.mockRejectedValueOnce(new Error('일시 오류'));
 fireEvent.click(screen.getByTestId('home-composer-submit'));await screen.findByText('일시 오류');
 expect(mocks.send.mock.calls[1][0]).toMatchObject({runId:'g_synthetic',resumeTargetId:'synthetic-site',workScope:mocks.scope,attachments:[{name:'fixture.txt'}]});
 expect(screen.getByTestId('home-composer-input')).toHaveProperty('value',expect.stringContaining('500정 2포장'));
 fireEvent.click(screen.getByTestId('home-composer-submit'));await waitFor(()=>expect(mocks.send).toHaveBeenCalledTimes(3));
 expect(mocks.send.mock.calls[2][0].runId).toBe('g_synthetic');
});
it('keeps the existing login gate for an ordinary correction',()=>{
 mocks.auth.isAuthenticated=false;render(page());prepare();fireEvent.click(screen.getByTestId('home-composer-submit'));
 expect(mocks.login).toHaveBeenCalled();expect(mocks.send).not.toHaveBeenCalled();
});
