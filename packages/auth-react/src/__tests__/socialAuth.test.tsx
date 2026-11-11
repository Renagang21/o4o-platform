const TERMS = { policyDocumentId: '11111111-1111-4111-8111-111111111111', version: 1, title: 'Fixture agreement', termsHref: 'https://neture.co.kr/terms' };
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, renderHook, act } from '@testing-library/react';
let callback: any = null; let credential: ((value: string) => void) | undefined;
vi.mock('@o4o/auth-client', async original => ({ ...(await original<any>()), takeSocialCallback: () => { const value=callback;callback=null;return value; }, redirectToKakao: vi.fn(), renderGoogleButton: vi.fn(async (options:any)=>{credential=options.onCredential;return ()=>{};}) }));
import { KakaoContinue } from '../KakaoContinue';
import { SocialAccountConnections } from '../SocialAccountConnections';
import { useServiceAuth } from '../useServiceAuth';
beforeEach(()=>{callback=null;credential=undefined;});afterEach(cleanup);
it('hides unconfigured Kakao and rejects no normal login method',async()=>{
 render(<KakaoContinue client={{getSignupTerms:async()=>TERMS,getKakaoAuthConfig:async()=>({enabled:false}),startKakaoLogin:vi.fn()}} loginWithKakao={vi.fn()} signupWithKakao={vi.fn()} onSuccess={vi.fn()} />);
 await waitFor(()=>expect(screen.queryByRole('button',{name:'카카오로 계속하기'})).toBeNull());
});
it('Kakao callback signup asks only for consent, sends only consents and finishes with the session (S1 · 2026-11-11)',async()=>{
 callback={token:'state',code:'code',kind:'kakao-login',cancelled:false};const success=vi.fn();const signup=vi.fn(async()=>({success:true,user:{id:'synthetic-user'}}));
 render(<KakaoContinue client={{getSignupTerms:async()=>TERMS,getKakaoAuthConfig:async()=>({enabled:true}),startKakaoLogin:vi.fn()}} loginWithKakao={async()=>({success:false,nextStep:'signup',signupTicket:'ticket',email:'synthetic@fixture.invalid'})} signupWithKakao={signup} onSuccess={success} privacyHref="/old-service-privacy" />);
 await screen.findByRole('link',{name:'내용 보기 · 버전 1'});expect(screen.getByTestId('kakao-continue').querySelector('a[href="https://neture.co.kr/privacy"]')?.getAttribute('target')).toBe('_blank');expect(screen.queryByLabelText(/이메일|닉네임|이름|휴대전화/)).toBeNull();
 fireEvent.click(screen.getByLabelText(/이용약관/));fireEvent.click(screen.getByLabelText(/개인정보 처리방침/));fireEvent.submit(screen.getByRole('button',{name:'동의하고 가입하기'}).closest('form')!);
 await waitFor(()=>expect(success).toHaveBeenCalledWith({id:'synthetic-user'}));expect(signup).toHaveBeenCalledWith('ticket',{consents:{terms:true,privacy:true,marketing:false,termsPolicy:{policyDocumentId:TERMS.policyDocumentId,version:TERMS.version}}});
});
it('cancelled OAuth never exchanges code',async()=>{
 callback={token:'state',kind:'kakao-login',cancelled:true};const login=vi.fn();render(<KakaoContinue client={{getSignupTerms:async()=>TERMS,getKakaoAuthConfig:async()=>({enabled:true}),startKakaoLogin:vi.fn()}} loginWithKakao={login} signupWithKakao={vi.fn()} onSuccess={vi.fn()} />);await screen.findByText(/인증을 취소/);expect(login).not.toHaveBeenCalled();
});
it('Demo shows status and cannot start reauthentication or linking',async()=>{
 const client={getSocialAccounts:async()=>({providers:[],hasPassword:true,canManage:false,googleEnabled:true,kakaoEnabled:true}),reauthenticateSocialPassword:vi.fn()} as any;
 render(<SocialAccountConnections client={client}/>);await screen.findByText(/테스트 계정의 로그인 수단/);expect(screen.queryByRole('button',{name:'현재 계정 확인'})).toBeNull();expect(client.reauthenticateSocialPassword).not.toHaveBeenCalled();
});
it('password reauthentication and fresh Google proof do not write until confirmation',async()=>{
 const client={getSocialAccounts:vi.fn(async()=>({providers:[],hasPassword:true,canManage:true,googleEnabled:true,kakaoEnabled:false})),reauthenticateSocialPassword:vi.fn(async()=>({token:'permit'})),startSocialLink:vi.fn(async()=>({token:'proof',nonce:'fresh'})),getGoogleAuthConfig:async()=>({enabled:true,clientId:'synthetic'}),verifySocialLink:vi.fn(async()=>({token:'confirm',provider:'google'})),confirmSocialLink:vi.fn(async()=>({linked:true}))} as any;
 render(<SocialAccountConnections client={client}/>);await screen.findByLabelText('현재 비밀번호');fireEvent.change(screen.getByLabelText('현재 비밀번호'),{target:{value:'synthetic-password'}});fireEvent.submit(screen.getByRole('button',{name:'현재 계정 확인'}).closest('form')!);
 await screen.findByRole('button',{name:'Google 계정 인증'});expect(client.startSocialLink).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Google 계정 인증'}));await waitFor(()=>expect(credential).toBeDefined());await act(async()=>{credential!('id-token');});await screen.findByRole('button',{name:'확인하고 연결'});expect(client.confirmSocialLink).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'확인하고 연결'}));await screen.findByText('로그인 수단을 연결했습니다.');expect(client.confirmSocialLink).toHaveBeenCalledWith('confirm');
});
it('signup/email verification notices never authenticate the shared context',async()=>{
 const authenticated=vi.fn();const client={api:{get:vi.fn(),post:vi.fn()},logout:vi.fn(),loginWithKakao:async()=>({nextStep:'signup',signupTicket:'ticket'}),signupWithKakao:async()=>({nextStep:'verify-email',mailSent:true})} as any;
 const {result}=renderHook(()=>useServiceAuth({authClient:client,getAccessToken:()=>null,toUser:x=>x,onAuthenticated:authenticated}));
 await act(async()=>{expect(await result.current.loginWithKakao({token:'t',code:'c'})).toMatchObject({success:false,nextStep:'signup'});});
 await act(async()=>{expect(await result.current.signupWithKakao('t',{} as any)).toMatchObject({success:false,nextStep:'verify-email'});});expect(result.current.isAuthenticated).toBe(false);expect(authenticated).not.toHaveBeenCalled();
});

it('Kakao signup hides privacy links until the server supplies the policy owner', async () => {
  callback={token:'state',kind:'kakao-login'};
  let resolve!: (doc: typeof TERMS) => void;
  const policy=new Promise<typeof TERMS>(r=>{resolve=r;});
  const loadPolicy=vi.fn(()=>policy);
  render(<KakaoContinue client={{getSignupTerms:loadPolicy,getKakaoAuthConfig:async()=>({enabled:true}),startKakaoLogin:vi.fn()}} loginWithKakao={async()=>({success:false,nextStep:'signup',signupTicket:'ticket',email:'synthetic@fixture.invalid'})} signupWithKakao={vi.fn()} onSuccess={vi.fn()} privacyHref="/privacy" />);
  await screen.findByText(/카카오 계정으로 가입합니다/);
  // The heading may render before the policy effect starts on a busy CI runner.
  await waitFor(()=>expect(loadPolicy).toHaveBeenCalled());
  expect(screen.queryByRole('link',{name:'내용 보기'})).toBeNull();
  await act(async()=>{const doc={...TERMS,privacyHref:'https://pharmacy.neture.co.kr/privacy'};resolve(doc);});
  expect((await screen.findByRole('link',{name:'내용 보기'})).getAttribute('href')).toBe('https://pharmacy.neture.co.kr/privacy');
});

it('Kakao requires fresh privacy acknowledgement after a policy version mismatch', async () => {
  callback={token:'state',kind:'kakao-login'};
  const load=vi.fn().mockResolvedValueOnce(TERMS).mockResolvedValue({...TERMS,version:2,privacyPolicy:{policyDocumentId:'22222222-2222-4222-8222-222222222222',version:2,title:'Updated privacy'}});
  const signup=vi.fn(async()=>({success:false,code:'POLICY_VERSION_MISMATCH',error:'Changed'}));
  render(<KakaoContinue client={{getSignupTerms:load,getKakaoAuthConfig:async()=>({enabled:true}),startKakaoLogin:vi.fn()}} loginWithKakao={async()=>({success:false,nextStep:'signup',signupTicket:'ticket',email:'synthetic@fixture.invalid'})} signupWithKakao={signup} onSuccess={vi.fn()} />);
  await screen.findByRole('link',{name:'내용 보기 · 버전 1'});
  fireEvent.click(screen.getAllByRole('checkbox')[0]);fireEvent.click(screen.getAllByRole('checkbox')[1]);
  fireEvent.submit(screen.getByRole('button',{name:'동의하고 가입하기'}).closest('form')!);
  await screen.findByRole('link',{name:'내용 보기 · 버전 2'});
  expect((screen.getAllByRole('checkbox')[1] as HTMLInputElement).checked).toBe(false);
  fireEvent.click(screen.getAllByRole('checkbox')[0]);expect((screen.getByRole('button',{name:'동의하고 가입하기'}) as HTMLButtonElement).disabled).toBe(true);expect(signup).toHaveBeenCalledTimes(1);
});

// WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T1 · T2
function renderKakaoSignup(signup: ReturnType<typeof vi.fn>) {
  callback={token:'state',kind:'kakao-login'};
  render(<KakaoContinue client={{getSignupTerms:async()=>TERMS,getKakaoAuthConfig:async()=>({enabled:true}),startKakaoLogin:vi.fn()}} loginWithKakao={async()=>({success:false,nextStep:'signup',signupTicket:'ticket',email:'synthetic@fixture.invalid'})} signupWithKakao={signup as any} onSuccess={vi.fn()} />);
}
async function submitKakaoSignup() {
  await screen.findByRole('link',{name:'내용 보기 · 버전 1'});
  fireEvent.click(screen.getAllByRole('checkbox')[0]);fireEvent.click(screen.getAllByRole('checkbox')[1]);
  fireEvent.submit(screen.getByRole('button',{name:'동의하고 가입하기'}).closest('form')!);
}

it('a Kakao account created earlier with a typed, unverified email still gets the verification notice', async () => {
  const signup=vi.fn(async()=>({success:false,nextStep:'verify-email' as const,mailSent:true}));
  renderKakaoSignup(signup);
  await submitKakaoSignup();
  await screen.findByText(/확인 메일을 보냈습니다/);
  const input=(signup.mock.calls[0] as unknown as [string, Record<string, unknown>])[1];
  for (const key of ['email','name','nickname','phone']) expect(input).not.toHaveProperty(key);
});

it('Kakao signup EMAIL_IN_USE shows link guidance directly above the submit button and keeps the form', async () => {
  const signup=vi.fn(async()=>({success:false,code:'EMAIL_IN_USE',status:409,error:'이미 사용 중인 이메일입니다.'}));
  renderKakaoSignup(signup);
  await submitKakaoSignup();
  const alert=await screen.findByTestId('kakao-signup-error');
  expect(alert.textContent).toContain('계정 설정에서 카카오를 연결');
  expect(alert.nextElementSibling?.textContent).toBe('동의하고 가입하기');
  expect(screen.getByRole('button',{name:'동의하고 가입하기'})).toBeTruthy();
});

it('Kakao signup with an expired ticket closes the form and offers to start again', async () => {
  const signup=vi.fn(async()=>({success:false,code:'SOCIAL_FLOW_INVALID',status:401,error:'인증을 다시 시작해 주시기 바랍니다.'}));
  renderKakaoSignup(signup);
  await submitKakaoSignup();
  await screen.findByRole('button',{name:'카카오로 계속하기'});
  expect(screen.queryByRole('button',{name:'동의하고 가입하기'})).toBeNull();
  expect(screen.getByRole('alert').textContent).toContain('카카오로 다시 시작');
});
