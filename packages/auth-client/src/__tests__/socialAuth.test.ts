import { describe, it, expect, beforeEach } from 'vitest';
import { AuthClient } from '../client';
import { takeSocialCallback } from '../social-redirect';
beforeEach(()=>{localStorage.clear();sessionStorage.clear();history.replaceState(null,'','/');});
describe('browser-bound social transport',()=>{
 it('consumes only the pending tab request, removes fragment before exchange, and cannot replay',()=>{
  sessionStorage.setItem('o4o-social-pending',JSON.stringify({token:'state',kind:'kakao-login',at:Date.now()}));history.replaceState(null,'','/login#social_kind=kakao-login&token=state&code=synthetic-code');expect(takeSocialCallback(['kakao-login'])).toMatchObject({token:'state',code:'synthetic-code'});expect(window.location.hash).toBe('');expect(sessionStorage.getItem('o4o-social-pending')).toBeNull();expect(takeSocialCallback(['kakao-login'])).toBeNull();
 });
 it.each(['missing','wrong-kind','expired'])('rejects %s callback without retaining credentials',kind=>{
  if(kind!=='missing')sessionStorage.setItem('o4o-social-pending',JSON.stringify({token:'state',kind:kind==='wrong-kind'?'link-proof':'kakao-login',at:Date.now()-(kind==='expired'?600000:0)}));history.replaceState(null,'','/login#social_kind=kakao-login&token=state&code=synthetic-code');expect(()=>takeSocialCallback(['kakao-login'])).toThrow();expect(window.location.hash).toBe('');expect(sessionStorage.getItem('o4o-social-pending')).toBeNull();
 });
 it('uses credentials for the binding, sends only proof fields, and never adopts a signup grant as a session',async()=>{
  const client=new AuthClient('http://api.test',{strategy:'localStorage'});let config:any;
  client.api.defaults.adapter=async c=>{config=c;return{status:200,statusText:'OK',headers:{},config:c,data:{success:true,data:{nextStep:'signup',signupTicket:'ticket',email:'synthetic@fixture.invalid'}}};};
  const result=await client.loginWithKakao({token:'state',code:'code',kind:'kakao-login',cancelled:false,userId:'forged'} as any);expect(result.nextStep).toBe('signup');expect(config.withCredentials).toBe(true);expect(JSON.parse(config.data)).toEqual({token:'state',code:'code',includeLegacyTokens:true});expect(localStorage.getItem('o4o_accessToken')).toBeNull();
 });
 it('one-use proof rejection is not retried by refreshing or clearing the current account session',async()=>{
  localStorage.setItem('o4o_accessToken','synthetic-access');localStorage.setItem('o4o_refreshToken','synthetic-refresh');const client=new AuthClient('http://api.test',{strategy:'localStorage'});const calls:string[]=[];
  client.api.defaults.adapter=async config=>{calls.push(config.url!);throw Object.assign(new Error('synthetic denial'),{response:{status:401,data:{code:'SOCIAL_FLOW_INVALID'}},config});};
  await expect(client.verifySocialLink({token:'state',idToken:'proof'})).rejects.toThrow('synthetic denial');expect(calls).toEqual(['/auth/social/link/verify']);expect(localStorage.getItem('o4o_accessToken')).toBe('synthetic-access');
 });
});
