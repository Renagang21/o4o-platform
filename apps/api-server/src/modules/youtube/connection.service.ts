import { createHash, randomBytes } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { Settings } from '../../entities/Settings.js';
import { encrypt, decrypt, isEncryptionKeyConfigured } from '../../utils/crypto.js';
import { YoutubeClient } from './youtube-client.js';
import { YoutubeError, YOUTUBE_CHANNEL_ID, type YoutubeFetch } from './contracts.js';
const CONNECTION_KEY=`youtube.channel.${YOUTUBE_CHANNEL_ID}`;
const SCOPES='https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
function config(){
  const clientId=process.env.YOUTUBE_OAUTH_CLIENT_ID,clientSecret=process.env.YOUTUBE_OAUTH_CLIENT_SECRET,redirectUri=process.env.YOUTUBE_OAUTH_REDIRECT_URI;
  if(!clientId||!clientSecret||!redirectUri||!isEncryptionKeyConfigured())throw new YoutubeError('YOUTUBE_OAUTH_NOT_CONFIGURED');
  const redirect=new URL(redirectUri);
  if(redirect.origin!=='https://admin.neture.co.kr'||redirect.pathname!=='/settings/youtube/callback'||redirect.search||redirect.hash)throw new YoutubeError('YOUTUBE_OAUTH_NOT_CONFIGURED');
  return{clientId,clientSecret,redirectUri};
}
interface StoredConnection {channelId:string;clientId:string;refreshToken:string;connectedAt:string;actorId:string}
export class YoutubeConnectionService {
  private lastCipher:string|null=null;
  constructor(private db:DataSource,private request:YoutubeFetch=fetch){}
  async status(){
    let configured=true;try{config();}catch{configured=false;}
    const row=await this.db.getRepository(Settings).findOneBy({key:CONNECTION_KEY});
    let connected=false;
    if(configured&&row&&!(row.value as {needsReconnect?:boolean})?.needsReconnect){try{const stored=JSON.parse(decrypt((row.value as {cipher:string}).cipher)) as StoredConnection;connected=stored.channelId===YOUTUBE_CHANNEL_ID&&stored.clientId===config().clientId&&!!stored.refreshToken;}catch{connected=false;}}
    return{channelId:YOUTUBE_CHANNEL_ID,configured,connected,connectedAt:connected?row?.updatedAt?.toISOString()??null:null};
  }
  async begin(actorId:string){
    const cfg=config(),state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
    await this.db.query(`DELETE FROM settings WHERE type='youtube-oauth-state' AND CASE WHEN jsonb_typeof(value->'expiresAt')='number' THEN (value->>'expiresAt')::numeric<$1 ELSE false END`,[Date.now()]);
    await this.db.getRepository(Settings).save({key:`youtube.oauth.${createHash('sha256').update(state).digest('hex')}`,type:'youtube-oauth-state',value:{actorId,verifier:encrypt(verifier),clientId:cfg.clientId,expiresAt:Date.now()+600000}});
    const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
    Object.entries({client_id:cfg.clientId,redirect_uri:cfg.redirectUri,response_type:'code',scope:SCOPES,access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).forEach(([key,value])=>url.searchParams.set(key,value));
    return{url:url.href};
  }
  private async tokens(body:URLSearchParams){
    const response=await this.request('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new YoutubeError([400,401].includes(response.status)?'YOUTUBE_RECONNECT_REQUIRED':'YOUTUBE_OAUTH_TEMPORARILY_UNAVAILABLE');
    const value=await response.json() as {access_token?:string;refresh_token?:string};
    if(typeof value.access_token!=='string'||!value.access_token)throw new YoutubeError('YOUTUBE_RECONNECT_REQUIRED');return value;
  }
  async complete(actorId:string,input:{state?:unknown;code?:unknown}){
    const cfg=config();
    if(typeof input.state!=='string'||!/^[\w-]{43}$/.test(input.state)||typeof input.code!=='string'||input.code.length>4096)throw new YoutubeError('YOUTUBE_INVALID_OAUTH_STATE',400);
    const key=`youtube.oauth.${createHash('sha256').update(input.state).digest('hex')}`;
    const pending=await this.db.transaction(async manager=>{
      const repo=manager.getRepository(Settings),row=await repo.findOne({where:{key},lock:{mode:'pessimistic_write'}});
      const value=row?.value as {actorId?:string;verifier?:string;clientId?:string;expiresAt?:number}|undefined;
      if(!value||value.actorId!==actorId||value.clientId!==cfg.clientId||!value.verifier||!value.expiresAt||value.expiresAt<Date.now())throw new YoutubeError('YOUTUBE_INVALID_OAUTH_STATE',400);
      await repo.delete({key});return value.verifier;
    });
    const token=await this.tokens(new URLSearchParams({client_id:cfg.clientId,client_secret:cfg.clientSecret,redirect_uri:cfg.redirectUri,grant_type:'authorization_code',code:input.code,code_verifier:decrypt(pending)}));
    await new YoutubeClient(this.request).channel(token.access_token!);
    if(typeof token.refresh_token!=='string'||!token.refresh_token)throw new YoutubeError('YOUTUBE_REFRESH_CONSENT_REQUIRED');
    const value:StoredConnection={channelId:YOUTUBE_CHANNEL_ID,clientId:cfg.clientId,refreshToken:token.refresh_token,connectedAt:new Date().toISOString(),actorId};
    await this.db.getRepository(Settings).save({key:CONNECTION_KEY,type:'youtube-credential',value:{cipher:encrypt(JSON.stringify(value))}});
    return this.status();
  }
  async invalidate(){if(this.lastCipher)await this.db.query(`UPDATE settings SET value=jsonb_set(value,'{needsReconnect}','true'::jsonb,true) WHERE key=$1 AND value->>'cipher'=$2`,[CONNECTION_KEY,this.lastCipher]);}
  async accessToken(){
    const cfg=config();const row=await this.db.getRepository(Settings).findOneBy({key:CONNECTION_KEY});
    const cipher=(row?.value as {cipher?:string}|null)?.cipher;if(!cipher)throw new YoutubeError('YOUTUBE_NOT_CONNECTED');
    if((row!.value as {needsReconnect?:boolean}).needsReconnect)throw new YoutubeError('YOUTUBE_RECONNECT_REQUIRED');
    this.lastCipher=cipher;
    const stored=JSON.parse(decrypt(cipher)) as StoredConnection;
    if(stored.channelId!==YOUTUBE_CHANNEL_ID||stored.clientId!==cfg.clientId||!stored.refreshToken)throw new YoutubeError('YOUTUBE_RECONNECT_REQUIRED');
    try{const value=await this.tokens(new URLSearchParams({client_id:cfg.clientId,client_secret:cfg.clientSecret,grant_type:'refresh_token',refresh_token:stored.refreshToken}));return value.access_token!;}catch(error){if(error instanceof YoutubeError&&error.code==='YOUTUBE_RECONNECT_REQUIRED')await this.invalidate();throw error;}
  }
}
