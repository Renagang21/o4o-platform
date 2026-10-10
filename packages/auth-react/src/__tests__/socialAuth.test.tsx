import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, renderHook, act } from '@testing-library/react';
let callback: any = null; let credential: ((value: string) => void) | undefined;
vi.mock('@o4o/auth-client', async original => ({ ...(await original<any>()), takeSocialCallback: () => { const value=callback;callback=null;return value; }, redirectToKakao: vi.fn(), renderGoogleButton: vi.fn(async (options:any)=>{credential=options.onCredential;return ()=>{};}) }));
import { KakaoContinue } from '../KakaoContinue';
import { SocialAccountConnections } from '../SocialAccountConnections';
import { useServiceAuth } from '../useServiceAuth';
beforeEach(()=>{callback=null;credential=undefined;});afterEach(cleanup);
it('hides unconfigured Kakao and rejects no normal login method',async()=>{
 render(<KakaoContinue client={{getKakaoAuthConfig:async()=>({enabled:false}),startKakaoLogin:vi.fn()}} loginWithKakao={vi.fn()} signupWithKakao={vi.fn()} onSuccess={vi.fn()} />);
 await waitFor(()=>expect(screen.queryByRole('button',{name:'카카오로 계속하기'})).toBeNull());
});
it('Kakao callback signup requires explicit consent, then shows email verification without logging in',async()=>{
 callback={token:'state',code:'code',kind:'kakao-login',cancelled:false};const success=vi.fn();const signup=vi.fn(async()=>({success:false,nextStep:'verify-email' as const,mailSent:true}));
 render(<KakaoContinue client={{getKakaoAuthConfig:async()=>({enabled:true}),startKakaoLogin:vi.fn()}} loginWithKakao={async()=>({success:false,nextStep:'signup',signupTicket:'ticket',email:'synthetic@fixture.invalid'})} signupWithKakao={signup} onSuccess={success} />);
 await screen.findByLabelText('이메일');fireEvent.change(screen.getByLabelText('이름'),{target:{value:'Synthetic'}});fireEvent.change(screen.getByLabelText('개인 휴대전화'),{target:{value:'01000000000'}});
 fireEvent.click(screen.getByLabelText(/이용약관/));fireEvent.click(screen.getByLabelText(/개인정보 처리방침/));fireEvent.submit(screen.getByRole('button',{name:'동의하고 계정 만들기'}).closest('form')!);
 await screen.findByText(/확인 메일을 보냈습니다/);expect(signup).toHaveBeenCalledWith('ticket',expect.objectContaining({consents:{terms:true,privacy:true,marketing:false}}));expect(success).not.toHaveBeenCalled();
});
it('cancelled OAuth never exchanges code',async()=>{
 callback={token:'state',kind:'kakao-login',cancelled:true};const login=vi.fn();render(<KakaoContinue client={{getKakaoAuthConfig:async()=>({enabled:true}),startKakaoLogin:vi.fn()}} loginWithKakao={login} signupWithKakao={vi.fn()} onSuccess={vi.fn()} />);await screen.findByText(/인증을 취소/);expect(login).not.toHaveBeenCalled();
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
