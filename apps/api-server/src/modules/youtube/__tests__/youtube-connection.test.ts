import { randomBytes } from 'node:crypto';
import { YoutubeConnectionService } from '../connection.service.js';
import { YOUTUBE_CHANNEL_ID } from '../contracts.js';
const keys=['ENCRYPTION_KEY','YOUTUBE_OAUTH_CLIENT_ID','YOUTUBE_OAUTH_CLIENT_SECRET','YOUTUBE_OAUTH_REDIRECT_URI'];
const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
beforeEach(()=>{process.env.ENCRYPTION_KEY=randomBytes(32).toString('hex');process.env.YOUTUBE_OAUTH_CLIENT_ID='synthetic-client';process.env.YOUTUBE_OAUTH_CLIENT_SECRET=randomBytes(24).toString('hex');process.env.YOUTUBE_OAUTH_REDIRECT_URI='https://admin.neture.co.kr/settings/youtube/callback';});
afterAll(()=>{for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}});
function fixture(){
  const values=new Map<string,any>();
  const repo={save:jest.fn(async(value:any)=>{values.set(value.key,{...value,updatedAt:new Date()});return value;}),findOneBy:jest.fn(async({key}:any)=>values.get(key)??null),findOne:jest.fn(async({where}:any)=>values.get(where.key)??null),delete:jest.fn(async({key}:any)=>values.delete(key))};
  const db={getRepository:()=>repo,query:jest.fn(async()=>[]),transaction:async(fn:any)=>fn({getRepository:()=>repo})} as any;
  const request=jest.fn().mockResolvedValueOnce(new Response(JSON.stringify({access_token:randomBytes(8).toString('hex'),refresh_token:randomBytes(8).toString('hex')}))).mockResolvedValueOnce(new Response(JSON.stringify({items:[{id:YOUTUBE_CHANNEL_ID}]})));
  return{service:new YoutubeConnectionService(db,request),values,repo,request};
}
it('uses PKCE and actor-bound one-time state, then stores only encrypted channel credentials',async()=>{
  const {service,values,request}=fixture();const begin=await service.begin('admin-a');const url=new URL(begin.url);
  expect(url.origin).toBe('https://accounts.google.com');expect(url.searchParams.get('code_challenge_method')).toBe('S256');expect(url.searchParams.has('client_secret')).toBe(false);
  const state=url.searchParams.get('state')!;
  await expect(service.complete('admin-b',{state,code:'synthetic-code'})).rejects.toMatchObject({code:'YOUTUBE_INVALID_OAUTH_STATE'});expect(request).not.toHaveBeenCalled();
  const result=await service.complete('admin-a',{state,code:'synthetic-code'});expect(result.connected).toBe(true);
  const connection=[...values.values()].find(row=>row.type==='youtube-credential');expect(Object.keys(connection.value)).toEqual(['cipher']);
  await expect(service.complete('admin-a',{state,code:'synthetic-code'})).rejects.toMatchObject({code:'YOUTUBE_INVALID_OAUTH_STATE'});expect(request).toHaveBeenCalledTimes(2);
});
it('refuses a different selected Google channel without replacing the connection',async()=>{
  const {service,request,values}=fixture();request.mockReset().mockResolvedValueOnce(new Response(JSON.stringify({access_token:'synthetic',refresh_token:'synthetic'}))).mockResolvedValueOnce(new Response(JSON.stringify({items:[{id:'another-channel'}]})));
  const begin=await service.begin('admin-a');await expect(service.complete('admin-a',{state:new URL(begin.url).searchParams.get('state'),code:'synthetic'})).rejects.toMatchObject({code:'YOUTUBE_CHANNEL_MISMATCH'});
  expect([...values.values()].filter(row=>row.type==='youtube-credential')).toHaveLength(0);
});
it('reports unavailable configuration instead of pretending to upload',async()=>{
  const {service}=fixture();delete process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  expect(await service.status()).toMatchObject({configured:false,connected:false});await expect(service.begin('admin-a')).rejects.toMatchObject({code:'YOUTUBE_OAUTH_NOT_CONFIGURED'});
});
