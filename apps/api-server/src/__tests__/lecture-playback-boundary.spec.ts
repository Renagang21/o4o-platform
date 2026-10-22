const mockEnrollment = jest.fn();
const mockLesson = jest.fn();
const mockScope = jest.fn();
const mockRead = jest.fn();
const mockSave = jest.fn();
jest.mock('../modules/lms/services/EnrollmentService.js', () => ({ EnrollmentService: { getInstance: () => ({ getEnrollmentByUserAndCourse: mockEnrollment }) } }));
jest.mock('../modules/lms/services/LessonService.js', () => ({ LessonService: { getInstance: () => ({ getLesson: mockLesson }) } }));
jest.mock('../modules/lms/services/PlaybackService.js', () => ({ readPlayback: (...args: unknown[]) => mockRead(...args), savePlayback: (...args: unknown[]) => mockSave(...args), validPlaybackPosition: (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 604800 }));
jest.mock('../database/connection.js', () => ({ AppDataSource: { getRepository: () => ({ findOne: (...args: unknown[]) => mockLesson(...args) }) } }));
jest.mock('../modules/lms/utils/lms-scope-guard.js', () => ({ guardCourseScope: (...args: unknown[]) => mockScope(...args) }));
import { EnrollmentController } from '../modules/lms/controllers/EnrollmentController.js';
function response() { const res: any = { statusCode: 200, body: null, status(code: number) { res.statusCode = code; return res; }, json(body: unknown) { res.body = body; return res; } }; return res; }
function request(patch: Record<string, unknown> = {}): any { return { method: 'POST', user: { id: 'current-user' }, params: { courseId: 'course' }, query: {}, body: { lessonId: 'lesson', positionSeconds: 31 }, ...patch }; }
beforeEach(() => { jest.clearAllMocks(); mockScope.mockResolvedValue(true); mockEnrollment.mockResolvedValue({ id: 'own-enrollment', status: 'in_progress' }); mockLesson.mockResolvedValue({ id: 'lesson', courseId: 'course', isPublished: true, type: 'video' }); mockSave.mockResolvedValue({ lessonId: 'lesson', positionSeconds: 31 }); });
it('derives ownership from the authenticated user and ignores body identities', async () => {
 const res = response(); await EnrollmentController.playback(request({ body: { lessonId: 'lesson', positionSeconds: 31, userId: 'other', enrollmentId: 'other' } }), res);
 expect(mockEnrollment).toHaveBeenCalledWith('current-user', 'course'); expect(mockSave).toHaveBeenCalledWith('own-enrollment', 'lesson', 31); expect(res.statusCode).toBe(200);
});
it.each(['pending', 'rejected', 'cancelled', 'expired'])('refuses playback writes for %s registrations', async status => {
 mockEnrollment.mockResolvedValue({ id: 'own-enrollment', status }); const res = response(); await EnrollmentController.playback(request(), res); expect(res.statusCode).toBe(403); expect(mockSave).not.toHaveBeenCalled();
});
it.each([NaN, Infinity, -1, 604801, '31'])('rejects invalid positions %s', async value => {
 const res = response(); await EnrollmentController.playback(request({ body: { lessonId: 'lesson', positionSeconds: value } }), res); expect(res.statusCode).toBe(400); expect(mockSave).not.toHaveBeenCalled();
});
it.each([{ courseId: 'other', isPublished: true }, { courseId: 'course', isPublished: false }])('refuses foreign or unpublished lessons', async lesson => {
 mockLesson.mockResolvedValue({ ...lesson, type: 'video' }); const res = response(); await EnrollmentController.playback(request(), res); expect(res.statusCode).toBe(404); expect(mockSave).not.toHaveBeenCalled();
});
it('stops before reading enrollment when the service scope is denied', async () => { mockScope.mockResolvedValue(false); await EnrollmentController.playback(request(), response()); expect(mockEnrollment).not.toHaveBeenCalled(); });
it('refuses unsigned requests', async () => { const res = response(); await EnrollmentController.playback(request({ user: null }), res); expect(res.statusCode).toBe(401); expect(mockSave).not.toHaveBeenCalled(); });
it('reads only the current enrollment bookmark', async () => { const res = response(); mockRead.mockResolvedValue(null); await EnrollmentController.playback(request({ method: 'GET', query: { lessonId: 'lesson' } }), res); expect(mockRead).toHaveBeenCalledWith('own-enrollment', 'course', 'lesson'); expect(mockSave).not.toHaveBeenCalled(); });
