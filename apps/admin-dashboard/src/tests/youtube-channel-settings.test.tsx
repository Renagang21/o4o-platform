import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('../api/unified-client',()=>({unifiedApi:{raw:api}}));
import Page from '../pages/settings/YoutubeChannelSettings';
beforeEach(()=>{vi.clearAllMocks();api.get.mockImplementation(async(path:string)=>({data:{success:true,data:path.endsWith('/requests')?[]:{connection:{channelId:'UCG9wb2OKmCBZ63g_ONuFkzg',configured:true,connected:false},delivery:{ready:false,deliveryConfigured:false}}}}));api.post.mockResolvedValue({data:{success:true,data:{connected:true}}});window.history.replaceState(null,'','/settings/youtube');});
afterEach(()=>{cleanup();window.history.replaceState(null,'','/');});
it('offers the exact channel connection and reports missing background setup',async()=>{
  render(<Page/>);await screen.findByRole('button',{name:'Google 채널 연결'});
  expect(screen.getByRole('link',{name:'운영 채널 열기 ↗'}).getAttribute('href')).toBe('https://studio.youtube.com/channel/UCG9wb2OKmCBZ63g_ONuFkzg');
  expect(screen.getByText(/Cloud Tasks 설정 필요/)).toBeTruthy();expect(api.post).not.toHaveBeenCalled();
});
it('clears transient OAuth parameters and exchanges a callback once under StrictMode',async()=>{
  window.history.replaceState(null,'','/settings/youtube/callback?code=synthetic-code&state=synthetic-state');
  render(<StrictMode><Page/></StrictMode>);
  await screen.findByText('지정한 YouTube 채널을 연결했습니다.');
  await waitFor(()=>expect(api.post).toHaveBeenCalledTimes(1));
  expect(api.post).toHaveBeenCalledWith('/v1/platform/youtube/complete',{code:'synthetic-code',state:'synthetic-state'});expect(window.location.search).toBe('');
});
