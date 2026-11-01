import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { YoutubeError, type YoutubeFetch } from './contracts.js';
export function youtubeDeliveryConfig(){
  const project=process.env.GOOGLE_CLOUD_PROJECT,region=process.env.YOUTUBE_TASKS_REGION,queue=process.env.YOUTUBE_TASKS_QUEUE,account=process.env.YOUTUBE_TASKS_SERVICE_ACCOUNT;
  const url='https://api.neture.co.kr/api/v1/youtube/worker';
  if(!project||!region||!queue||!account||![project,region,queue].every(value=>/^[a-zA-Z0-9_-]{1,100}$/.test(value))||!account.endsWith('.iam.gserviceaccount.com'))throw new YoutubeError('YOUTUBE_DELIVERY_NOT_CONFIGURED');
  return{parent:`projects/${project}/locations/${region}/queues/${queue}`,account,url};
}
/** Cloud Tasks wakes scale-to-zero instances; the DB channel lock additionally serializes workers. */
export class YoutubeTaskDelivery {
  constructor(private request:YoutubeFetch=fetch,private auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']})){}
  async enqueue(key:string,delaySeconds=0){
    const cfg=youtubeDeliveryConfig(),token=await this.auth.getAccessToken();
    if(!token)throw new YoutubeError('YOUTUBE_DELIVERY_NOT_CONFIGURED');
    const queue=await this.request(`https://cloudtasks.googleapis.com/v2/${cfg.parent}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
    if(!queue.ok)throw new YoutubeError('YOUTUBE_DELIVERY_UNAVAILABLE');
    const settings=await queue.json() as {rateLimits?:{maxConcurrentDispatches?:number}};
    if(settings.rateLimits?.maxConcurrentDispatches!==1)throw new YoutubeError('YOUTUBE_QUEUE_MUST_BE_SERIAL');
    const response=await this.request(`https://cloudtasks.googleapis.com/v2/${cfg.parent}/tasks`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({task:{name:`${cfg.parent}/tasks/yt-${key}`,scheduleTime:new Date(Date.now()+delaySeconds*1000).toISOString(),dispatchDeadline:'300s',httpRequest:{httpMethod:'POST',url:cfg.url,headers:{'Content-Type':'application/json'},body:Buffer.from('{}').toString('base64'),oidcToken:{serviceAccountEmail:cfg.account,audience:cfg.url}}}}),signal:AbortSignal.timeout(15000)});
    if(!response.ok&&response.status!==409)throw new YoutubeError('YOUTUBE_DELIVERY_UNAVAILABLE');
  }
}
export async function verifyYoutubeWorker(header:string|undefined){
  if(!header?.startsWith('Bearer '))return false;
  try{const cfg=youtubeDeliveryConfig();const ticket=await new OAuth2Client().verifyIdToken({idToken:header.slice(7),audience:cfg.url});const payload=ticket.getPayload();return payload?.email===cfg.account&&payload.email_verified===true;}catch{return false;}
}
