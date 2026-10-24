jest.mock('@o4o/lms-core', () => ({ CourseStatus: { PUBLISHED: 'published' }, CourseVisibility: { PUBLIC: 'public' } }), { virtual: true });
const mockCourse = jest.fn();
const mockLessons = jest.fn();
const mockActive = jest.fn();
jest.mock('../modules/lms/services/CourseService.js', () => ({ CourseService: { getInstance: () => ({ getCourse: mockCourse }) } }));
jest.mock('../modules/lms/services/LessonService.js', () => ({ LessonService: { getInstance: () => ({ listLessonsByCourse: mockLessons }) } }));
jest.mock('../modules/lms/services/QuizService.js', () => ({ QuizService: {} }));
jest.mock('../modules/lms/services/AssignmentService.js', () => ({ AssignmentService: {} }));
jest.mock('../modules/lms/middleware/lecture-access.js', () => ({ isActiveLectureLearner: (...args: unknown[]) => mockActive(...args), isPlatformSuperAdmin: () => false, hasLectureOperatorRole: () => false, hasLectureInstructorRole: () => false, hasLectureAdminRole: () => false }));
import { CourseController } from '../modules/lms/controllers/CourseController.js';
function response() { const res: any = { statusCode: 200, body: null, status(code: number) { res.statusCode = code; return res; }, json(body: unknown) { res.body = body; return res; } }; return res; }
function req(user?: unknown): any { return { user, params: { id: 'course' }, query: { includeCurriculum: 'true' }, lmsServiceKey: 'lecture', baseUrl: '/api/v1/lms' }; }
beforeEach(() => { jest.clearAllMocks(); mockActive.mockResolvedValue(false); mockCourse.mockResolvedValue({ id: 'course', status: 'published', visibility: 'public', serviceKey: 'lecture' }); mockLessons.mockResolvedValue({ total: 1, lessons: [{ id: 'lesson', title: '영상 소개', type: 'video', order: 1, duration: 10, isFree: true, videoUrl: 'PRIVATE_VIDEO', content: 'PRIVATE_BODY', attachments: ['PRIVATE_ATTACHMENT'] }] }); });
it('returns only introduction fields for a signed-out public course', async () => { const res = response(); await CourseController.getCourse(req(), res); expect(res.statusCode).toBe(200); expect(res.body.data.curriculum).toEqual([{ id: 'lesson', title: '영상 소개', type: 'video', order: 1, duration: 10 }]); expect(JSON.stringify(res.body)).not.toMatch(/PRIVATE_|isFree/); expect(mockLessons).toHaveBeenCalledWith('course', { isPublished: true, limit: 1000 }); });
it('does not fetch a members-only outline for an unsigned viewer', async () => { mockCourse.mockResolvedValue({ id: 'course', status: 'published', visibility: 'members', serviceKey: 'lecture' }); const res = response(); await CourseController.getCourse(req(), res); expect(res.statusCode).toBe(401); expect(mockLessons).not.toHaveBeenCalled(); });
it('requires active membership for members-only introduction', async () => { mockCourse.mockResolvedValue({ id: 'course', status: 'published', visibility: 'members', serviceKey: 'lecture' }); const res = response(); await CourseController.getCourse(req({ id: 'not-member' }), res); expect(res.statusCode).toBe(403); expect(mockLessons).not.toHaveBeenCalled(); });
it('does not disclose an unpublished course outline', async () => { mockCourse.mockResolvedValue({ id: 'course', status: 'draft', visibility: 'public', serviceKey: 'lecture' }); const res = response(); await CourseController.getCourse(req(), res); expect(res.statusCode).toBe(404); expect(mockLessons).not.toHaveBeenCalled(); });

it('keeps ordinary course reads independent of curriculum availability', async () => { mockLessons.mockRejectedValue(new Error('outline unavailable')); const request = req(); request.query = {}; const res = response(); await CourseController.getCourse(request, res); expect(res.statusCode).toBe(200); expect(mockLessons).not.toHaveBeenCalled(); });
