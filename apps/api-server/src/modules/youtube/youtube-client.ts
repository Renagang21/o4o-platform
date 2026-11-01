import type { Readable } from 'node:stream';
import { YoutubeError, YOUTUBE_CHANNEL_ID, type YoutubeFetch } from './contracts.js';
const API='https://www.googleapis.com/youtube/v3';
const UPLOAD='https://www.googleapis.com/upload/youtube/v3/videos';
export class YoutubeClient {
  constructor(private request:YoutubeFetch=fetch){}
  private async call(url:string,init:RequestInit={},timeoutMs=20000){
    const response=await this.request(url,{...init,signal:AbortSignal.timeout(timeoutMs)});
    if(!response.ok&&response.status!==308)throw new YoutubeError(response.status===401?'YOUTUBE_RECONNECT_REQUIRED':response.status===404||response.status===410?'YOUTUBE_RESULT_UNCERTAIN':'YOUTUBE_API_FAILED');
    return response;
  }
  async channel(token:string){
    const response=await this.call(`${API}/channels?part=id&mine=true`,{headers:{Authorization:`Bearer ${token}`}});
    const data=await response.json() as {items?:Array<{id:string}>};
    if(!Array.isArray(data.items)||data.items.length!==1||data.items[0].id!==YOUTUBE_CHANNEL_ID)throw new YoutubeError('YOUTUBE_CHANNEL_MISMATCH',403);
  }
  async start(token:string,input:{name:string;description:string;tags:string[];mimeType:string;size:number}){
    await this.channel(token);
    const response=await this.call(`${UPLOAD}?uploadType=resumable&part=snippet,status`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Upload-Content-Type':input.mimeType,'X-Upload-Content-Length':String(input.size)},body:JSON.stringify({snippet:{title:input.name.slice(0,100),description:input.description,tags:input.tags},status:{privacyStatus:'public',selfDeclaredMadeForKids:false}})});
    const location=response.headers.get('location');
    if(!location||!this.validSession(location))throw new YoutubeError('YOUTUBE_INVALID_UPLOAD_SESSION');
    return location;
  }
  private validSession(value:string){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='www.googleapis.com'&&u.pathname==='/upload/youtube/v3/videos'&&!u.username&&!u.password&&!u.port;}catch{return false;}}
  async probe(token:string,session:string,size:number):Promise<{offset:number;videoId?:string}>{
    if(!this.validSession(session))throw new YoutubeError('YOUTUBE_INVALID_UPLOAD_SESSION');
    const response=await this.call(session,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Length':'0','Content-Range':`bytes */${size}`}});
    if(response.status!==308){const data=await response.json() as {id?:string};if(!data.id||!/^[-\w]{11}$/.test(data.id))throw new YoutubeError('YOUTUBE_RESULT_UNCERTAIN');return{offset:size,videoId:data.id};}
    const range=response.headers.get('range');const match=range?.match(/^bytes=0-(\d+)$/);if(range&&!match)throw new YoutubeError('YOUTUBE_RESULT_UNCERTAIN');const offset=match?Number(match[1])+1:0;
    if(!Number.isSafeInteger(offset)||offset<0||offset>size)throw new YoutubeError('YOUTUBE_RESULT_UNCERTAIN');return{offset};
  }
  async upload(token:string,session:string,input:{mimeType:string;size:number;offset:number;stream:Readable}):Promise<string>{
    if(!this.validSession(session))throw new YoutubeError('YOUTUBE_INVALID_UPLOAD_SESSION');
    const response=await this.call(session,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':input.mimeType,'Content-Length':String(input.size-input.offset),'Content-Range':`bytes ${input.offset}-${input.size-1}/${input.size}`},body:input.stream as unknown as BodyInit,duplex:'half'} as RequestInit,120000);
    if(response.status===308)throw new YoutubeError('YOUTUBE_UPLOAD_INCOMPLETE');
    const data=await response.json() as {id?:string};if(!data.id||!/^[-\w]{11}$/.test(data.id))throw new YoutubeError('YOUTUBE_RESULT_UNCERTAIN');return data.id;
  }
  async ready(token:string,id:string){
    if(!/^[-\w]{11}$/.test(id))throw new YoutubeError('YOUTUBE_RESULT_UNCERTAIN');
    const response=await this.call(`${API}/videos?part=status,processingDetails,snippet&id=${id}`,{headers:{Authorization:`Bearer ${token}`}});
    const data=await response.json() as {items?:Array<{snippet:{channelId:string};status:{uploadStatus:string;privacyStatus:string;embeddable?:boolean};processingDetails?:{processingStatus:string}}>};
    const video=data.items?.[0];if(!video||video.snippet.channelId!==YOUTUBE_CHANNEL_ID)throw new YoutubeError('YOUTUBE_CHANNEL_MISMATCH',403);
    if(['failed','rejected','deleted'].includes(video.status.uploadStatus)||['failed','terminated'].includes(video.processingDetails?.processingStatus??''))throw new YoutubeError('YOUTUBE_PROCESSING_FAILED');
    if(video.status.uploadStatus!=='processed'||(video.processingDetails&&video.processingDetails.processingStatus!=='succeeded'))return false;
    if(!['public','unlisted'].includes(video.status.privacyStatus)||video.status.embeddable!==true)throw new YoutubeError('YOUTUBE_SHARING_REVIEW_REQUIRED');
    return video.status.uploadStatus==='processed'&&(!video.processingDetails||video.processingDetails.processingStatus==='succeeded');
  }
}
