import { afterEach, expect, it, vi } from 'vitest';
import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ResumeVideo } from '../../../../../packages/lms-ui/src/views/ResumeVideo';
import { readCaptionTracks, validCaptionTrack } from '../../../../../packages/lms-ui/src/views/captionTracks';
import { LessonMediaFields } from '../../components/LessonMediaFields';
import type { LmsLearnerPort } from '@o4o/lms-ui';
afterEach(cleanup);
const track = { src: 'https://example.invalid/ko.vtt?signature=fixture', srcLang: 'ko', label: '한국어' };
it('projects only safe WebVTT tracks and rejects malformed or credential URLs', () => {
 expect(readCaptionTracks([track, null, { ...track, src: 'javascript:alert(1)' }, { ...track, src: 'https://u:p@example.invalid/a.vtt' }, { ...track, src: 'https://example.invalid/a.mp4' }, { ...track, srcLang: '' }])).toEqual([track]);
 expect(validCaptionTrack({ ...track, srcLang: 'en-US' })).toBe(true);
 expect(readCaptionTracks(Array(12).fill(track))).toHaveLength(8);
 expect(readCaptionTracks({})).toEqual([]);
});
it('renders optional captions and reports track failure without removing the video', () => {
 const ref = createRef<HTMLVideoElement>();
 render(<ResumeVideo videoRef={ref} src="https://example.invalid/a.mp4" courseId="c" lessonId="l" captions={[track]} enabled={false} port={{} as LmsLearnerPort} onTimeUpdate={vi.fn()} />);
 const element = ref.current!.querySelector('track')!;
 expect(element.getAttribute('srclang')).toBe('ko');
 expect(element.getAttribute('src')).toBe(track.src);
 fireEvent.error(element);
 expect(screen.getByRole('alert').textContent).toContain('자막을 불러오지 못했습니다');
 expect(ref.current).not.toBeNull();
});
it('preserves unrelated lesson metadata while adding and removing caption inputs', () => {
 const onChange = vi.fn();
 const value = { title: 'fixture', type: 'video' as const, metadata: { unrelated: 'keep', captions: [track] } };
 render(<LessonMediaFields value={value} onChange={onChange} />);
 fireEvent.change(screen.getByLabelText('자막 이름 1'), { target: { value: '영어' } });
 expect(onChange.mock.lastCall![0].metadata).toEqual({ unrelated: 'keep', captions: [{ ...track, label: '영어' }] });
 fireEvent.click(screen.getByRole('button', { name: '자막 1 삭제' }));
 expect(onChange.mock.lastCall![0].metadata).toEqual({ unrelated: 'keep', captions: [] });
});

it('keeps the legacy video CORS behavior when captions are absent', () => {
 const ref = createRef<HTMLVideoElement>();
 render(<ResumeVideo videoRef={ref} src="https://example.invalid/a.mp4" courseId="c" lessonId="l" enabled={false} port={{} as LmsLearnerPort} onTimeUpdate={vi.fn()} />);
 expect(ref.current!.hasAttribute('crossorigin')).toBe(false);
 expect(ref.current!.querySelectorAll('track')).toHaveLength(0);
});
