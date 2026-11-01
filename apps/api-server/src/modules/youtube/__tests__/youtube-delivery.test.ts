import { YoutubeTaskDelivery } from '../task-delivery.js';
const previous={...Object.fromEntries(['GOOGLE_CLOUD_PROJECT','YOUTUBE_TASKS_REGION','YOUTUBE_TASKS_QUEUE','YOUTUBE_TASKS_SERVICE_ACCOUNT'].map(key=>[key,process.env[key]]))};
beforeEach(()=>{process.env.GOOGLE_CLOUD_PROJECT='synthetic-project';process.env.YOUTUBE_TASKS_REGION='test-region';process.env.YOUTUBE_TASKS_QUEUE='synthetic-queue';process.env.YOUTUBE_TASKS_SERVICE_ACCOUNT='worker@synthetic-project.iam.gserviceaccount.com';});
afterAll(()=>{for(const [key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
it('requires a serial queue and sends a deterministic, OIDC-authenticated wake-up',async()=>{
  const request=jest.fn().mockResolvedValueOnce(new Response(JSON.stringify({rateLimits:{maxConcurrentDispatches:1}}))).mockResolvedValueOnce(new Response('{}'));
  const auth={getAccessToken:jest.fn().mockResolvedValue('synthetic')};
  await new YoutubeTaskDelivery(request,auth as any).enqueue('job-a-1',30);
  const task=JSON.parse(request.mock.calls[1][1].body).task;
  expect(task.name).toContain('/tasks/yt-job-a-1');expect(task.httpRequest.url).toBe('https://api.neture.co.kr/api/v1/youtube/worker');expect(task.httpRequest.oidcToken.audience).toBe(task.httpRequest.url);
});
it('rejects a parallel queue instead of relying on the browser',async()=>{
  const request=jest.fn().mockResolvedValue(new Response(JSON.stringify({rateLimits:{maxConcurrentDispatches:2}})));
  await expect(new YoutubeTaskDelivery(request,{getAccessToken:async()=> 'synthetic'} as any).enqueue('job-a-1')).rejects.toMatchObject({code:'YOUTUBE_QUEUE_MUST_BE_SERIAL'});
  expect(request).toHaveBeenCalledTimes(1);
});
