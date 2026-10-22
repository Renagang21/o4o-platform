import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CourseDetailView, createLmsLabels, type LmsLearnerPort, type LmsViewConfig } from '@o4o/lms-ui';
import { LessonResources } from '../../../../../packages/lms-ui/src/views/LessonResources';
import { ProfessionalInfoSummary } from '../../components/ProfessionalInfoFields';
import { supportedVideoUrl } from '../../components/LessonMediaFields';
const auth = vi.hoisted(() => ({ user: null, isAuthenticated: false }));
const courses = vi.hoisted(() => vi.fn());
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../api/lecture', () => ({ learnerApi: { getCourses: courses } }));
vi.mock('../../lib/lmsViewAdapter', () => ({ LECTURE_ACCENT: '#302b73', coursePath: (id: string) => `/courses/${id}` }));
import CoursesPage from './CoursesPage';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const config: LmsViewConfig = { isAuthenticated: false, hubPath: '/courses', navigate: vi.fn(), notify: { success: vi.fn(), error: vi.fn() }, labels: createLmsLabels() };
function port(overrides: Partial<LmsLearnerPort> = {}): LmsLearnerPort {
 return { getCourse: vi.fn(async () => ({ id: 'course', title: '전문 강의', status: 'published', visibility: 'public' })), getLessons: vi.fn(async () => []), getCurriculum: vi.fn(async () => [{ id: 'lesson', title: '공개 목차', type: 'video' }]), getEnrollment: vi.fn(async () => null), enroll: vi.fn(async () => null), updateProgress: vi.fn(async () => null), ...overrides };
}
it('shows the public catalog together with the signed-out notice', async () => {
 courses.mockResolvedValue({ data: [{ id: 'course', title: '공개 전문 강의', visibility: 'public', status: 'published' }] });
 render(<MemoryRouter><CoursesPage /></MemoryRouter>);
 expect(await screen.findByText('공개 전문 강의')).toBeTruthy();
 expect(screen.getByText(/회원 전용 강의와 수강 신청은/)).toBeTruthy();
});
it('keeps a retryable catalog error below the notice', async () => {
 courses.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [] });
 render(<MemoryRouter><CoursesPage /></MemoryRouter>);
 const retry = await screen.findByRole('button', { name: /다시/ }); fireEvent.click(retry);
 expect(await screen.findByText('등록된 강의가 없습니다.')).toBeTruthy();
 expect(courses).toHaveBeenCalledTimes(2);
});
it('uses introduction-only curriculum without fetching protected lessons when signed out', async () => {
 const api = port(); render(<CourseDetailView courseId="course" port={api} config={config} />);
 expect(await screen.findByText('공개 목차')).toBeTruthy();
 expect(api.getLessons).not.toHaveBeenCalled(); expect(api.getEnrollment).not.toHaveBeenCalled();
});
it('distinguishes an outline outage from an empty curriculum and supports retry', async () => {
 const getCurriculum = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
 render(<CourseDetailView courseId="course" port={port({ getCurriculum })} config={config} />);
 expect(await screen.findByText('목차를 불러오지 못했습니다. 다시 시도해 주세요.')).toBeTruthy();
 expect(screen.queryByText('등록된 레슨이 아직 없습니다.')).toBeNull();
 fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
 expect(await screen.findByText('등록된 레슨이 아직 없습니다.')).toBeTruthy();
});
it('does not turn failed enrollment reads into a fresh enrollment action', async () => {
 render(<CourseDetailView courseId="course" port={port({ getEnrollment: vi.fn().mockRejectedValue(new Error('offline')) })} config={{ ...config, isAuthenticated: true }} />);
 expect(await screen.findByText('수강 정보를 확인하지 못했습니다.')).toBeTruthy();
 expect(screen.queryByRole('button', { name: '수강 신청하기' })).toBeNull();
});
it('does not disclose members-only course content after a denied course read', async () => {
 render(<CourseDetailView courseId="course" port={port({ getCourse: vi.fn().mockRejectedValue({ code: 'MEMBERS_ONLY' }) })} config={config} />);
 expect(await screen.findByText('회원 전용 강의입니다')).toBeTruthy();
 expect(screen.queryByText('공개 목차')).toBeNull();
});
it('renders expertise and outcomes as text and rejects executable attachment URLs', () => {
 render(<><ProfessionalInfoSummary value={{ audience: '실무 입문자', outcomes: '상담 사례 해석', instructorBio: '<script>unsafe</script>' }} /><LessonResources attachments={[{ name: '교재', url: 'https://example.org/material.pdf' }, { name: '불가', url: 'javascript:alert(1)' }]} /></>);
 expect(screen.getByText('실무 입문자')).toBeTruthy(); expect(screen.getByText('<script>unsafe</script>')).toBeTruthy();
 expect(screen.getByRole('link', { name: '교재 (새 창)' }).getAttribute('rel')).toContain('noopener');
 expect(screen.queryByRole('link', { name: /불가/ })).toBeNull();
});
it('accepts direct signed video URLs and rejects unsupported page or executable URLs', () => {
 expect(supportedVideoUrl('https://example.org/lesson.mp4?signature=test')).toBe(true);
 for (const url of ['https://youtube.com/watch?v=test', 'javascript:alert(1)', 'http://example.org/a.mp4', 'invalid']) expect(supportedVideoUrl(url)).toBe(false);
});
it('preserves a consumer that supplies only the existing lesson-list port', async () => {
 const api = port({ getLessons: vi.fn(async () => [{ id: 'legacy-lesson', title: '기존 port 목차' }]) }); delete api.getCurriculum;
 render(<CourseDetailView courseId="course" port={api} config={config} />);
 expect(await screen.findByText('기존 port 목차')).toBeTruthy(); expect(api.getLessons).toHaveBeenCalledWith('course');
});
it('does not make pending enrollment curriculum rows navigable', async () => {
 render(<CourseDetailView courseId="course" port={port({ getEnrollment: vi.fn(async () => ({ status: 'pending', progress: 0, completedLessonIds: [] })) })} config={{ ...config, isAuthenticated: true }} />);
 expect(await screen.findByText('승인 대기 중')).toBeTruthy(); expect(screen.queryByRole('link', { name: /공개 목차/ })).toBeNull();
});

it.each(['MEMBERSHIP_NOT_FOUND', 'MEMBERSHIP_NOT_ACTIVE'])('shows eligibility/inquiry for expected membership denial %s', async code => {
 const api = port({ getEnrollment: vi.fn().mockRejectedValue({ response: { status: 403, data: { code } } }) });
 render(<CourseDetailView courseId="course" port={api} config={{ ...config, isAuthenticated: true, enrollmentInquiryPath: '/contact' }} />);
 expect(await screen.findByText('강의 서비스 이용 자격이 필요합니다. 공개 강의와 목차는 계속 확인할 수 있습니다.')).toBeTruthy();
 expect(screen.getByText('공개 목차')).toBeTruthy();
 expect(screen.getByRole('link', { name: '이용 문의' }).getAttribute('href')).toBe('/contact');
 expect(screen.queryByRole('button', { name: '수강 신청하기' })).toBeNull();
 expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
});
it('keeps unexpected 403 enrollment failures retryable', async () => {
 render(<CourseDetailView courseId="course" port={port({ getEnrollment: vi.fn().mockRejectedValue({ response: { status: 403, data: { code: 'OTHER_DENIAL' } } }) })} config={{ ...config, isAuthenticated: true }} />);
 expect(await screen.findByText('수강 정보를 확인하지 못했습니다.')).toBeTruthy(); expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
});
