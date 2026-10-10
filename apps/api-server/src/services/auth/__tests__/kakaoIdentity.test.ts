jest.mock('../../../database/connection.js',()=>({AppDataSource:{getRepository:jest.fn()}}));
import { loadKakaoIdentityConfig, KAKAO_CALLBACK_PATH } from '../../../config/kakao-identity.config.js';
import { KakaoIdentityService, parseKakaoIdentity } from '../kakao-identity.service.js';
import { safeSocialReturnTo, socialOrigin, setSocialBinding, clearSocialBinding } from '../../../modules/auth/controllers/social-auth.helpers.js';
import { resolveSessionServiceKey } from '../../../utils/session-origin.js';
import { GoogleIdentityService } from '../google-identity.service.js';
import { redactSensitive } from '../../../utils/security-log-redaction.js';
const config=()=>({clientId:'synthetic-client',clientSecret:'synthetic-secret',redirectUri:'https://api.neture.co.kr'+KAKAO_CALLBACK_PATH,enabled:true});
describe('Kakao confidential REST and social boundaries',()=>{
 it('requires complete server-owned configuration and production callback',()=>{
  const env={NODE_ENV:'production',KAKAO_CLIENT_ID:'client',KAKAO_CLIENT_SECRET:'secret',KAKAO_REDIRECT_URI:'https://api.neture.co.kr'+KAKAO_CALLBACK_PATH};expect(loadKakaoIdentityConfig(env).enabled).toBe(true);
  for(const value of ['https://attacker.invalid'+KAKAO_CALLBACK_PATH,'http://localhost:3001'+KAKAO_CALLBACK_PATH,env.KAKAO_REDIRECT_URI+'?next=x',env.KAKAO_REDIRECT_URI+'#x'])expect(loadKakaoIdentityConfig({...env,KAKAO_REDIRECT_URI:value}).enabled).toBe(false);
  expect(loadKakaoIdentityConfig({...env,KAKAO_CLIENT_SECRET:''}).enabled).toBe(false);
 });
 it('fixes provider host/client/callback, binds state and forces reauthentication prompt',()=>{
  const url=new URL(new KakaoIdentityService(undefined,config).authorizationUrl('state',true));expect(url.origin).toBe('https://kauth.kakao.com');expect(url.searchParams.get('redirect_uri')).toBe(config().redirectUri);expect(url.searchParams.get('state')).toBe('state');expect(url.searchParams.get('prompt')).toBe('login');expect(url.searchParams.has('client_secret')).toBe(false);
 });
 it('exchanges on server only and trusts email only with both provider verification flags',async()=>{
  const http={post:jest.fn(async()=>({data:{access_token:'synthetic-provider-token'}})),get:jest.fn(async()=>({data:{id:123,kakao_account:{email:'test@fixture.invalid',is_email_valid:true,is_email_verified:true}}}))};
  const result=await new KakaoIdentityService(http as any,config).exchangeCode('synthetic-code');expect(result).toEqual({providerId:'123',email:'test@fixture.invalid',emailVerified:true});
  expect(http.post).toHaveBeenCalledWith('https://kauth.kakao.com/oauth/token',expect.stringContaining('client_secret=synthetic-secret'),expect.objectContaining({timeout:10000,maxRedirects:0}));expect(http.get).toHaveBeenCalledWith('https://kapi.kakao.com/v2/user/me',expect.objectContaining({headers:{Authorization:'Bearer synthetic-provider-token'}}));expect(JSON.stringify(result)).not.toContain('synthetic-provider-token');
 });
 it('never exposes HTTP credentials, provider response or raw error on failure',async()=>{
  const http={post:jest.fn(async()=>{throw new Error('synthetic-private-response')}),get:jest.fn()};await expect(new KakaoIdentityService(http as any,config).exchangeCode('x')).rejects.toMatchObject({code:'KAKAO_AUTH_INVALID'});
  try{await new KakaoIdentityService(http as any,config).exchangeCode('x');}catch(error){expect((error as Error).message).not.toContain('synthetic-private-response');}
 });
 it.each([null,{}, {id:0},{id:-1},{id:1.5},{id:Number.MAX_SAFE_INTEGER+1},{id:'01'},{id:'not-an-id'}])('rejects invalid provider ID %p',data=>{expect(()=>parseKakaoIdentity(data)).toThrow();});
 it.each([{email:'hint@fixture.invalid'},{email:'hint@fixture.invalid',is_email_verified:true},{email:'hint@fixture.invalid',is_email_valid:true}])('never promotes email hints %p',account=>{expect(parseKakaoIdentity({id:123,kakao_account:account}).emailVerified).toBe(false);});
 it.each(['https://attacker.invalid','//attacker.invalid','/%2f/attacker.invalid','/\\attacker.invalid','/%5cattacker.invalid','/%00','/%','/\n'])('rejects unsafe return %p',path=>{expect(()=>safeSocialReturnTo(path)).toThrow();});
 it('allows only a relative return and a known user origin, rejects administrator/forged host',()=>{
  expect(safeSocialReturnTo('/mypage/settings?x=1')).toBe('/mypage/settings?x=1');
  for(const origin of ['https://admin.neture.co.kr','https://neture.co.kr.attacker.invalid','https://neture.co.kr/path','null'])expect(()=>socialOrigin({get:()=>origin} as any)).toThrow();
  expect(socialOrigin({get:()=> 'https://supplier.neture.co.kr'} as any).serviceKey).toBe('supplier');
 });
 it.each([['https://www.neture.co.kr','neture'],['https://kpa-society.co.kr','kpa-society'],['https://www.kpa-society.co.kr','kpa-society']])('maintained alias %s uses the same login/link/logout scope', (origin,key)=>{
  expect(socialOrigin({get:()=>origin} as any)).toEqual({origin,serviceKey:key});
  expect(resolveSessionServiceKey(origin)).toBe(key);
 });
 it.each(['https://www.neture.co.kr.attacker.invalid','https://www.admin.neture.co.kr','https://www.unknown.invalid'])('alias normalization does not admit forged/special host %s',origin=>{
  expect(()=>socialOrigin({get:()=>origin} as any)).toThrow();expect(resolveSessionServiceKey(origin)).toBeNull();
 });
 it('cross-site binding cookies are host-only HttpOnly Secure SameSite=None and clearing preserves scope',()=>{
  const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';
  try {const res={cookie:jest.fn(),clearCookie:jest.fn()};const grant={token:'synthetic-token',binding:'synthetic-binding'};
   setSocialBinding(res as any,grant);clearSocialBinding(res as any,grant.token);
   const options=res.cookie.mock.calls[0][2];expect(options).toMatchObject({httpOnly:true,secure:true,sameSite:'none',path:'/api/v1/auth/social',maxAge:300000});expect(options).not.toHaveProperty('domain');
   expect(res.clearCookie.mock.calls[0][0]).toBe(res.cookie.mock.calls[0][0]);expect(res.clearCookie.mock.calls[0][1]).toMatchObject({httpOnly:true,secure:true,sameSite:'none',path:'/api/v1/auth/social'});
  }finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
 });
 it('redacts OAuth credentials from structured diagnostics',()=>{expect(redactSensitive({code:'x',state:'y',nonce:'z'})).toEqual({code:'[REDACTED]',state:'[REDACTED]',nonce:'[REDACTED]'});});
});
describe('fresh Google identity proof',()=>{
 const now=Math.floor(Date.now()/1000);const payload={iss:'https://accounts.google.com',aud:'synthetic-client',sub:'synthetic-sub',exp:now+300,iat:now,nonce:'fresh-nonce'};
 const service=(over:object)=>new GoogleIdentityService({verifier:{verifyIdToken:async()=>({getPayload:()=>({...payload,...over})})},config:{isConfigured:()=>true,allowedClientIds:['synthetic-client']} as any,linkedAccountRepository:{findOne:jest.fn()}});
 it('accepts exact fresh nonce',async()=>{await expect(service({}).verifyGoogleIdToken('id-token',{nonce:'fresh-nonce',issuedAfter:new Date()})).resolves.toMatchObject({sub:'synthetic-sub'});});
 it.each([{nonce:'other'},{nonce:undefined},{iat:now-1000},{iat:undefined}])('rejects replay or missing challenge %p',async over=>{await expect(service(over).verifyGoogleIdToken('id-token',{nonce:'fresh-nonce',issuedAfter:new Date()})).rejects.toMatchObject({reason:'CHALLENGE_MISMATCH'});});
});
