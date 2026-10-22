import { afterEach, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResumeVideo } from '../../../../../packages/lms-ui/src/views/ResumeVideo';
import type { LmsLearnerPort } from '@o4o/lms-ui';
afterEach(cleanup);
function port() { return { getPlayback: vi.fn(async () => ({ lessonId: 'lesson', positionSeconds: 42 })), savePlayback: vi.fn(async () => undefined), updateProgress: vi.fn() } as unknown as LmsLearnerPort; }
it('restores a per-lesson bookmark without updating course completion', async () => {
 const api = port(); const ref = createRef<HTMLVideoElement>();
 render(<ResumeVideo videoRef={ref} src="https://example.org/video.mp4" courseId="course" lessonId="lesson" enabled port={api} onTimeUpdate={vi.fn()} />);
 Object.defineProperty(ref.current!, 'duration', { configurable: true, value: 180 });
 fireEvent.click(await screen.findByRole('button', { name: /42초부터 이어보기/ }));
 expect(ref.current!.currentTime).toBe(42); expect(api.updateProgress).not.toHaveBeenCalled();
 fireEvent.timeUpdate(ref.current!);
 await waitFor(() => expect(api.savePlayback).toHaveBeenCalledWith('course', 'lesson', 42));
 expect(api.updateProgress).not.toHaveBeenCalled();
});
it('shows failed saves with an explicit retry and keeps video playback available', async () => {
 const api = port(); vi.mocked(api.savePlayback!).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce();
 const ref = createRef<HTMLVideoElement>();
 render(<ResumeVideo videoRef={ref} src="https://example.org/video.mp4" courseId="course" lessonId="lesson" enabled port={api} onTimeUpdate={vi.fn()} />);
 ref.current!.currentTime = 18; fireEvent.timeUpdate(ref.current!);
 await screen.findByText('이어보기 위치 저장에 실패했습니다. 다시 저장해 주세요.');
 fireEvent.click(screen.getByRole('button', { name: '현재 위치 저장' }));
 await screen.findByText('이어보기 위치를 저장했습니다.');
 expect(api.savePlayback).toHaveBeenCalledTimes(2);
});
it('does not load or save account bookmarks for unsigned viewers', async () => {
 const api = port(); const ref = createRef<HTMLVideoElement>();
 render(<ResumeVideo videoRef={ref} src="https://example.org/video.mp4" courseId="course" lessonId="lesson" enabled={false} port={api} onTimeUpdate={vi.fn()} />);
 fireEvent.timeUpdate(ref.current!); expect(api.getPlayback).not.toHaveBeenCalled(); expect(api.savePlayback).not.toHaveBeenCalled();
});
it('ignores a late bookmark from a disposed account instance', async () => {
 let done!: (value: { lessonId: string; positionSeconds: number }) => void;
 const api = port(); vi.mocked(api.getPlayback!).mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
 const ref = createRef<HTMLVideoElement>();
 const view = render(<ResumeVideo key="account-a" videoRef={ref} src="https://example.org/video.mp4" courseId="course" lessonId="lesson" enabled port={api} onTimeUpdate={vi.fn()} />);
 view.rerender(<ResumeVideo key="account-b" videoRef={ref} src="https://example.org/video.mp4" courseId="course" lessonId="lesson" enabled={false} port={api} onTimeUpdate={vi.fn()} />);
 await act(async () => done({ lessonId: 'lesson', positionSeconds: 99 }));
 expect(screen.queryByRole('button', { name: /이어보기/ })).toBeNull();
});

it('flushes the latest forced position after an in-flight periodic save', async () => {
 let done!: () => void;
 const api = port(); vi.mocked(api.savePlayback!).mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
 const ref = createRef<HTMLVideoElement>();
 render(<ResumeVideo videoRef={ref} src="https://example.org/video.mp4" courseId="course" lessonId="lesson" enabled port={api} onTimeUpdate={vi.fn()} />);
 ref.current!.currentTime = 18; fireEvent.timeUpdate(ref.current!);
 ref.current!.currentTime = 42; fireEvent.pause(ref.current!);
 ref.current!.currentTime = 47; fireEvent.ended(ref.current!);
 expect(api.savePlayback).toHaveBeenCalledTimes(1);
 await act(async () => done());
 await waitFor(() => expect(api.savePlayback).toHaveBeenCalledTimes(2));
 expect(api.savePlayback).toHaveBeenLastCalledWith('course', 'lesson', 47);
});
it('does not flush a disposed account queue with the next account credentials', async () => {
 let done!: () => void;
 const api = port(); vi.mocked(api.savePlayback!).mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
 const ref = createRef<HTMLVideoElement>();
 const view = render(<ResumeVideo key="account-a" videoRef={ref} src="https://example.org/video.mp4" courseId="course" lessonId="lesson" enabled port={api} onTimeUpdate={vi.fn()} />);
 ref.current!.currentTime = 18; fireEvent.timeUpdate(ref.current!);
 ref.current!.currentTime = 42; fireEvent.pause(ref.current!);
 view.rerender(<ResumeVideo key="account-b" videoRef={ref} src="https://example.org/video.mp4" courseId="course" lessonId="lesson" enabled={false} port={api} onTimeUpdate={vi.fn()} />);
 await act(async () => done());
 expect(api.savePlayback).toHaveBeenCalledTimes(1);
});
