export const YOUTUBE_CHANNEL_ID = 'UCG9wb2OKmCBZ63g_ONuFkzg';
export const YOUTUBE_JOB_KIND = 'o4o.youtube-upload';
export const YOUTUBE_ACTIVE_NOTES = ['YOUTUBE:QUEUED','YOUTUBE:UPLOADING','YOUTUBE:PROCESSING','YOUTUBE:RETRY'];
export type UploadState = 'queued'|'uploading'|'processing'|'completed'|'failed'|'needs-review'|'cancelled';
export interface UploadPayload {
  kind: typeof YOUTUBE_JOB_KIND; channelId: typeof YOUTUBE_CHANNEL_ID;
  actorId:string;serviceKey:string;organizationId?:string;community?:boolean;
  requestId:string;inputHash:string;assetId:string;name:string;description:string;tags:string[];
  state:UploadState;sessionCipher?:string;videoId?:string;mediaId?:string;
  attempts:number;dispatch:number;nextPollAt?:string;processingStartedAt?:string;errorCode?:string;notified?:boolean;
}
export class YoutubeError extends Error {
  constructor(readonly code:string,readonly statusCode=503){super(code);}
}
export type YoutubeFetch = (url:string,init?:RequestInit)=>Promise<Response>;
