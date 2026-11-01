import { Readable } from 'node:stream';
import { YoutubeClient } from '../youtube-client.js';
import { YOUTUBE_CHANNEL_ID } from '../contracts.js';
const session='https://www.googleapis.com/upload/youtube/v3/videos?upload_id=synthetic';
const json=(value:unknown,status=200,headers:Record<string,string>={})=>new Response(JSON.stringify(value),{status,headers});
it('verifies the exact managed channel before creating a public resumable upload',async()=>{
  const request=jest.fn().mockResolvedValueOnce(json({items:[{id:YOUTUBE_CHANNEL_ID}]})).mockResolvedValueOnce(json({},200,{Location:session}));
  const result=await new YoutubeClient(request).start('synthetic',{name:'Video',description:'Provided',tags:['tag'],mimeType:'video/mp4',size:4});
  expect(result).toBe(session);expect(request.mock.calls[0][0]).toContain('mine=true');
  const body=JSON.parse(request.mock.calls[1][1].body);expect(body.status.privacyStatus).toBe('public');
});
it('never uploads to a different channel or arbitrary session host',async()=>{
  const request=jest.fn().mockResolvedValue(json({items:[{id:'other-channel'}]}));
  await expect(new YoutubeClient(request).start('synthetic',{name:'Video',description:'',tags:[],mimeType:'video/mp4',size:4})).rejects.toMatchObject({code:'YOUTUBE_CHANNEL_MISMATCH'});
  expect(request).toHaveBeenCalledTimes(1);
  await expect(new YoutubeClient(request).probe('synthetic','https://attacker.example/upload',4)).rejects.toMatchObject({code:'YOUTUBE_INVALID_UPLOAD_SESSION'});
  expect(request).toHaveBeenCalledTimes(1);
});
it('resumes at the acknowledged byte rather than creating another video',async()=>{
  const request=jest.fn().mockResolvedValueOnce(new Response(null,{status:308,headers:{Range:'bytes=0-1'}})).mockResolvedValueOnce(json({id:'abcdefghijk'}));
  const client=new YoutubeClient(request),position=await client.probe('synthetic',session,4);
  expect(position.offset).toBe(2);
  expect(await client.upload('synthetic',session,{mimeType:'video/mp4',size:4,offset:2,stream:Readable.from([Buffer.from([2,3])])})).toBe('abcdefghijk');
  expect(request.mock.calls[1][1].headers['Content-Range']).toBe('bytes 2-3/4');
  expect(request.mock.calls.every(call=>call[0]===session)).toBe(true);
});
it('recovers the video ID when upload completed but the response was lost',async()=>{
  const request=jest.fn().mockResolvedValue(json({id:'abcdefghijk'}));
  expect(await new YoutubeClient(request).probe('synthetic',session,4)).toEqual({offset:4,videoId:'abcdefghijk'});
});
it('holds uncertain expired sessions without silently starting another upload',async()=>{
  const request=jest.fn().mockResolvedValue(json({},404));
  await expect(new YoutubeClient(request).probe('synthetic',session,4)).rejects.toMatchObject({code:'YOUTUBE_RESULT_UNCERTAIN'});
  expect(request).toHaveBeenCalledTimes(1);
});
it('requires actual processing and sharing/embedding readiness for completion',async()=>{
  const video=(uploadStatus:string,privacyStatus='public')=>({items:[{snippet:{channelId:YOUTUBE_CHANNEL_ID},status:{uploadStatus,privacyStatus,embeddable:true},processingDetails:{processingStatus:uploadStatus==='processed'?'succeeded':'processing'}}]});
  const request=jest.fn().mockResolvedValueOnce(json(video('uploaded','private'))).mockResolvedValueOnce(json(video('processed'))).mockResolvedValueOnce(json(video('processed','private')));
  const client=new YoutubeClient(request);expect(await client.ready('synthetic','abcdefghijk')).toBe(false);expect(await client.ready('synthetic','abcdefghijk')).toBe(true);
  await expect(client.ready('synthetic','abcdefghijk')).rejects.toMatchObject({code:'YOUTUBE_SHARING_REVIEW_REQUIRED'});
});

it('rejects ambiguous multi-channel credentials before inserting a video',async()=>{
  const request=jest.fn().mockResolvedValue(json({items:[{id:YOUTUBE_CHANNEL_ID},{id:'another-channel'}]}));
  await expect(new YoutubeClient(request).start('synthetic',{name:'Video',description:'',tags:[],mimeType:'video/mp4',size:4})).rejects.toMatchObject({code:'YOUTUBE_CHANNEL_MISMATCH'});
  expect(request).toHaveBeenCalledTimes(1);
});
