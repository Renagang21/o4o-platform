import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VideoRegistration } from '@o4o/store-ui-core';

afterEach(cleanup);
const answer = JSON.stringify({name: '약국 안내', description: '입력한 안내', tags: ['안내'], sourceUrl: 'https://evil.test/video.mp4'});
function setup() {
  const ask = vi.fn().mockResolvedValue(answer);
  const save = vi.fn().mockResolvedValue({id:'saved',name:'약국 안내'});
  const props = {contextKey:'store-a', ask, save, onSaved:vi.fn(), mediaApi: {list:vi.fn(),upload:vi.fn(),moveToFolder:vi.fn(),deleteAsset:vi.fn()}};
  return props;
}
function enter() {
  fireEvent.change(screen.getByLabelText('개별 영상 주소'), {target:{value:'https://youtu.be/abcdefghijk'}});
  fireEvent.change(screen.getByPlaceholderText('이 영상을 매장 안내 영상으로 등록해 줘'), {target:{value:'이 영상 등록해 줘'}});
  fireEvent.click(screen.getByRole('button',{name:'AI로 등록'}));
}
describe('one request video registration', () => {
  it('prepares metadata and actually saves once, preserving the user URL', async () => {
    const props = setup(); render(<VideoRegistration {...props}/>); enter();
    await screen.findByText('“약국 안내” 목록 등록 완료');
    expect(props.ask).toHaveBeenCalledTimes(1);
    expect(props.save).toHaveBeenCalledTimes(1);
    expect(props.save.mock.calls[0][0]).toMatchObject({name:'약국 안내', sourceUrl:'https://youtu.be/abcdefghijk'});
    expect(props.onSaved).toHaveBeenCalledTimes(1);
  });
  it('keeps the prepared metadata and request ID after a failed save', async () => {
    const props = setup(); props.save.mockRejectedValueOnce(new Error('응답 유실'));
    render(<VideoRegistration {...props}/>); enter(); await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button',{name:'AI로 등록'}));
    await screen.findByText('“약국 안내” 목록 등록 완료');
    expect(props.ask).toHaveBeenCalledTimes(1);
    expect(props.save.mock.calls[0][0]).toEqual(props.save.mock.calls[1][0]);
  });
  it('does not save after an account/store context change during AI preparation', async () => {
    const props = setup(); let resolve!: (value:string)=>void;
    props.ask.mockImplementation(() => new Promise(r => {resolve=r;}));
    const view = render(<VideoRegistration {...props}/>); enter();
    await waitFor(() => expect(props.ask).toHaveBeenCalledTimes(1));
    view.rerender(<VideoRegistration {...props} contextKey="store-b"/>); resolve(answer);
    await waitFor(() => expect((screen.getByLabelText('개별 영상 주소') as HTMLInputElement).value).toBe(''));
    expect(props.save).not.toHaveBeenCalled();
  });
  it('blocks channel URLs and explains that upload/processing is external', async () => {
    const props = setup();render(<VideoRegistration {...props}/>);
    fireEvent.change(screen.getByLabelText('개별 영상 주소'),{target:{value:'https://studio.youtube.com/channel/UCG9wb2OKmCBZ63g_ONuFkzg'}});
    fireEvent.change(screen.getByPlaceholderText('이 영상을 매장 안내 영상으로 등록해 줘'),{target:{value:'등록해 줘'}});
    fireEvent.click(screen.getByRole('button',{name:'AI로 등록'}));
    await screen.findByRole('alert');expect(props.ask).not.toHaveBeenCalled();expect(props.save).not.toHaveBeenCalled();
    expect(screen.getByText(/O4O는 YouTube 처리 진행률을 알 수 없습니다/)).toBeTruthy();
  });
});

async function selectStoredVideo(props: ReturnType<typeof setup>) {
  props.mediaApi.list.mockResolvedValue({success:true,data:[{id:'90000000-0000-4000-a000-000000000001',originalName:'fixture.mp4',url:'https://storage.example.test/fixture.mp4',assetType:'video',mimeType:'video/mp4',storageType:'internal',gcsPath:'fixture.mp4',isLibraryPublic:true,consentedAt:'2026-11-01'}]});
  fireEvent.click(screen.getByRole('button',{name:'O4O 영상 보관·선택'}));
  fireEvent.click(screen.getByRole('button',{name:/라이브러리/}));
  fireEvent.click(await screen.findByText('fixture.mp4'));
  fireEvent.click(screen.getByRole('button',{name:/^선택$/}));
}
it('accepts a YouTube request without calling the catalog saved before background completion',async()=>{
  const props=setup();const youtube={enqueue:vi.fn().mockResolvedValue({id:'job',name:'약국 안내',queued:true,state:'queued'}),list:vi.fn().mockResolvedValue({availability:{ready:true},items:[]}),retry:vi.fn()};
  render(<VideoRegistration {...props} youtube={youtube}/>);await selectStoredVideo(props);
  fireEvent.change(screen.getByPlaceholderText('이 영상을 매장 안내 영상으로 등록해 줘'),{target:{value:'이 영상 채널에 등록해 줘'}});
  fireEvent.click(screen.getByRole('button',{name:'AI로 등록'}));
  await screen.findByText(/YouTube 등록 요청 접수 · 완료되면/);
  expect(youtube.enqueue).toHaveBeenCalledTimes(1);expect(props.save).not.toHaveBeenCalled();expect(props.onSaved).not.toHaveBeenCalled();
  expect(screen.queryByText('“약국 안내” 목록 등록 완료')).toBeNull();
});
it('does not spend AI cost or claim progress when automatic upload is not connected',async()=>{
  const props=setup();const youtube={enqueue:vi.fn(),list:vi.fn().mockResolvedValue({availability:{ready:false},items:[]}),retry:vi.fn()};
  render(<VideoRegistration {...props} youtube={youtube}/>);await selectStoredVideo(props);
  fireEvent.change(screen.getByPlaceholderText('이 영상을 매장 안내 영상으로 등록해 줘'),{target:{value:'이 영상 채널에 등록해 줘'}});
  fireEvent.click(screen.getByRole('button',{name:'AI로 등록'}));
  await screen.findByRole('alert');expect(props.ask).not.toHaveBeenCalled();expect(youtube.enqueue).not.toHaveBeenCalled();expect(props.save).not.toHaveBeenCalled();
});
