import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MediaSequence, VideoPlayback, useMediaSequence } from '@o4o/tablet-kiosk-core';
import { hostedVideo } from '@o4o/tablet-kiosk-core/video-embed';

beforeEach(() => { vi.useFakeTimers(); vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); delete (window as any).YT; });
it('plays a long native video to its end, advances, then repeats the list without reloading it', () => {
  render(<MediaSequence resetKey="manual" items={[{ id: 'a', type: 'video', url: '/a.mp4', durationMs: 10 }, { id: 'b', type: 'video', url: '/b.mp4' }]} />);
  const first = document.querySelector('video')!;
  expect(first.loop).toBe(false); fireEvent.playing(first);
  act(() => vi.advanceTimersByTime(600000));
  expect(document.querySelector('video')).toBe(first);
  fireEvent.ended(first); expect(document.querySelector('video')?.getAttribute('src')).toBe('/b.mp4');
  fireEvent.ended(document.querySelector('video')!); expect(document.querySelector('video')?.getAttribute('src')).toBe('/a.mp4');
});
it('replays a one-video list using a new playback instance', () => {
  render(<MediaSequence resetKey="one" items={[{ id: 'a', type: 'video', url: '/a.mp4' }]} />);
  const first = document.querySelector('video')!; fireEvent.ended(first);
  expect(document.querySelector('video')).not.toBe(first); expect(document.querySelector('video')?.getAttribute('src')).toBe('/a.mp4');
});
it('skips failed items, stops when all failed and offers an explicit retry', () => {
  render(<MediaSequence resetKey="errors" items={[{ id: 'a', type: 'video', url: '/a.mp4' }, { id: 'b', type: 'video', url: '/b.mp4' }]} />);
  fireEvent.error(document.querySelector('video')!); act(() => vi.advanceTimersByTime(2000));
  expect(document.querySelector('video')?.getAttribute('src')).toBe('/b.mp4');
  fireEvent.error(document.querySelector('video')!); expect(document.querySelector('video')).toBeNull();
  expect(screen.getByText('재생할 수 있는 영상이 없습니다.')).toBeTruthy();
  act(() => vi.advanceTimersByTime(600000)); expect(document.querySelector('video')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 재생' })); expect(document.querySelector('video')?.getAttribute('src')).toBe('/a.mp4');
});
it('ignores stale and duplicate ended callbacks, and resets only for a manually changed key/list', () => {
  const { result, rerender } = renderHook(({ key }) => useMediaSequence(['a', 'b'], key), { initialProps: { key: 'first' } });
  const old = result.current.token;
  act(() => { result.current.next(old); result.current.next(old); }); expect(result.current.index).toBe(1);
  act(() => result.current.fail('old error', old)); expect(result.current.failedCount).toBe(0);
  rerender({ key: 'applied' }); expect(result.current.index).toBe(0);
});
it('retains image duration through unrelated rerenders', () => {
  const items = () => [{ id: 'a', type: 'image' as const, url: '/a.png', durationMs: 5000 }, { id: 'b', type: 'video' as const, url: '/b.mp4' }];
  const view = render(<MediaSequence resetKey="images" items={items()} />);
  act(() => vi.advanceTimersByTime(4000)); view.rerender(<MediaSequence resetKey="images" items={items()} />);
  act(() => vi.advanceTimersByTime(1000)); expect(document.querySelector('video')?.getAttribute('src')).toBe('/b.mp4');
});
it('shows a user play action when autoplay is blocked, and does not mark the video as failed', async () => {
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
  const error = vi.fn(); render(<VideoPlayback url="/a.mp4" kind="video" onError={error} />);
  await act(async () => {});
  act(() => vi.advanceTimersByTime(60000)); expect(error).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '영상 재생 시작' })); expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});
it('uses YouTube SDK ended exactly once, has no individual loop, and destroys the old player', async () => {
  let options: any; const destroy = vi.fn(), playVideo = vi.fn();
  (window as any).YT = { Player: class { constructor(_node: unknown, opts: unknown) { options = opts; } playVideo = playVideo; destroy = destroy; } };
  const ended = vi.fn(), error = vi.fn();
  const view = render(<VideoPlayback url="https://youtu.be/abcdefghijk" kind="youtube" onEnded={ended} onError={error} />);
  await act(async () => {}); expect(options.playerVars.loop).toBeUndefined();
  act(() => { options.events.onReady(); options.events.onStateChange({ data: 1 }); vi.advanceTimersByTime(600000); });
  expect(error).not.toHaveBeenCalled(); expect(ended).not.toHaveBeenCalled();
  act(() => { options.events.onStateChange({ data: 0 }); options.events.onStateChange({ data: 0 }); });
  expect(ended).toHaveBeenCalledTimes(1); view.unmount(); expect(destroy).toHaveBeenCalledTimes(1);
  act(() => options.events.onError()); expect(error).not.toHaveBeenCalled();
});
it('accepts Vimeo completion only from the current player window and official origin', () => {
  const ended = vi.fn(); render(<VideoPlayback url="https://vimeo.com/123456" kind="vimeo" onEnded={ended} />);
  const source = document.querySelector('iframe')!.contentWindow;
  const send = (origin: string, from: MessageEventSource | null) => window.dispatchEvent(new MessageEvent('message', { origin, source: from, data: { event: 'ended' } }));
  act(() => { send('https://evil.test', source); send('https://player.vimeo.com', window); }); expect(ended).not.toHaveBeenCalled();
  act(() => { send('https://player.vimeo.com', source); send('https://player.vimeo.com', source); }); expect(ended).toHaveBeenCalledTimes(1);
  expect(document.querySelector('iframe')!.src).not.toContain('loop=1');
});
it.each(['https://www.youtube.com/channel/UCG9wb2OKmCBZ63g_ONuFkzg', 'https://youtube.com.evil.test/watch?v=abcdefghijk', 'javascript:alert(1)', 'https://user@youtube.com/watch?v=abcdefghijk'])('rejects non-video or spoofed hosted URL: %s', url => { expect(hostedVideo(url)).toBeNull(); });
