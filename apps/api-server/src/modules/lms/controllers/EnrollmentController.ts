import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { EnrollmentService } from '../services/EnrollmentService.js';
import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';
import { CompletionService } from '../services/CompletionService.js';

/**
 * EnrollmentController
 * LMS Module - Enrollment Management
 * Handles course enrollment and student management
 */
export class EnrollmentController extends BaseController {
  static async enrollCourse(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const data = { courseId, userId };
      const service = EnrollmentService.getInstance();

      const enrollment = await service.enrollCourse(data);

      return BaseController.created(res, { enrollment });
    } catch (error: any) {
      logger.error('[EnrollmentController.enrollCourse] Error', { error: error.message });

      if (error.message && error.message.includes('already enrolled')) {
        return BaseController.error(res, error.message, 409);
      }

      if (error.message && (error.message.includes('full') || error.message.includes('not available'))) {
        return BaseController.error(res, error.message, 400);
      }

      return BaseController.error(res, error);
    }
  }

  static async getEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = EnrollmentService.getInstance();

      const enrollment = await service.getEnrollment(id);

      if (!enrollment) {
        return BaseController.notFound(res, 'Enrollment not found');
      }

      return BaseController.ok(res, { enrollment });
    } catch (error: any) {
      logger.error('[EnrollmentController.getEnrollment] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listEnrollments(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = EnrollmentService.getInstance();

      const { enrollments, total } = await service.listEnrollments(filters as any);

      return BaseController.okPaginated(res, enrollments, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[EnrollmentController.listEnrollments] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getMyEnrollments(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const filters: any = { ...req.query, userId };
      const service = EnrollmentService.getInstance();

      const { enrollments, total } = await service.listEnrollments(filters);

      return BaseController.okPaginated(res, enrollments, {
        total,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        totalPages: Math.ceil(total / (Number(req.query.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[EnrollmentController.getMyEnrollments] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = EnrollmentService.getInstance();

      const enrollment = await service.updateEnrollment(id, data);

      return BaseController.ok(res, { enrollment });
    } catch (error: any) {
      logger.error('[EnrollmentController.updateEnrollment] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async startEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = EnrollmentService.getInstance();

      const enrollment = await service.startEnrollment(id);

      return BaseController.ok(res, { enrollment, message: 'Enrollment started successfully' });
    } catch (error: any) {
      logger.error('[EnrollmentController.startEnrollment] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async completeEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { finalScore } = req.body;
      const service = EnrollmentService.getInstance();

      const enrollment = await service.completeEnrollment(id, finalScore);

      return BaseController.ok(res, { enrollment, message: 'Enrollment completed successfully' });
    } catch (error: any) {
      logger.error('[EnrollmentController.completeEnrollment] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async cancelEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = EnrollmentService.getInstance();

      const enrollment = await service.cancelEnrollment(id);

      return BaseController.ok(res, { enrollment, message: 'Enrollment cancelled successfully' });
    } catch (error: any) {
      logger.error('[EnrollmentController.cancelEnrollment] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1
  static async getMyEnrollmentForCourse(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) return BaseController.unauthorized(res, 'User not authenticated');

      const service = EnrollmentService.getInstance();
      const enrollment = await service.getEnrollmentByUserAndCourse(userId, courseId);

      if (!enrollment) return BaseController.notFound(res, 'Enrollment not found');

      return BaseController.ok(res, { enrollment });
    } catch (error: any) {
      logger.error('[EnrollmentController.getMyEnrollmentForCourse] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1
  // WO-O4O-LMS-LESSON-TYPE-COMPLETION-RULES-V1: lesson type별 완료 정책 분기
  static async updateLessonProgress(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const userId = (req as any).user?.id;
      const {
        lessonId,
        completed,
        // WO-O4O-LMS-LESSON-TYPE-COMPLETION-RULES-V1: type별 완료 메트릭
        watchedSeconds,
        progressRatio,
        scrolledRatio,
        dwellTimeSeconds,
      } = req.body;

      if (!userId) return BaseController.unauthorized(res, 'User not authenticated');

      const service = EnrollmentService.getInstance();
      const enrollment = await service.getEnrollmentByUserAndCourse(userId, courseId);

      if (!enrollment) return BaseController.notFound(res, 'Enrollment not found');

      if (completed && lessonId) {
        // WO-O4O-LMS-LESSON-TYPE-COMPLETION-RULES-V1: lesson.type별 완료 정책 강제
        // - quiz/assignment/live: 전용 제출/참여 API에서만 완료 처리 (직접 호출 거부)
        // - video: watchedSeconds 또는 progressRatio 기반, 70% 임계
        // - article: scrolledRatio 0.8 또는 dwellTimeSeconds 30초, 둘 다 미충족 시 거부
        //
        // WO-O4O-LMS-COMPLETION-RULES-BACKWARD-COMPAT-V1: legacy 클라이언트 호환성 보강
        // - video/article에서 메트릭이 전혀 전달되지 않은 호출은 legacy fallback으로 완료 허용
        // - 일부라도 전달되면 strict 정책 그대로 적용
        // - quiz/assignment/live는 fallback 없이 strict 유지 (전용 API 사용 강제)
        // - fallback은 GlycoPharm/K-Cosmetics 프론트가 메트릭 전송 적용되면 제거 가능
        const lessonRepo = AppDataSource.getRepository('Lesson');
        const lesson: any = await lessonRepo.findOne({ where: { id: lessonId } });
        if (!lesson) return BaseController.notFound(res, 'Lesson not found');

        if (lesson.type === 'quiz' || lesson.type === 'assignment' || lesson.type === 'live') {
          return BaseController.error(
            res,
            `${lesson.type} 레슨은 전용 제출/참여 API를 통해서만 완료 처리됩니다.`,
            400,
            'LESSON_TYPE_REQUIRES_DEDICATED_API',
          );
        }

        if (lesson.type === 'video') {
          const hasAnyVideoMetric =
            typeof watchedSeconds === 'number' || typeof progressRatio === 'number';
          if (!hasAnyVideoMetric) {
            // WO-O4O-LMS-COMPLETION-RULES-BACKWARD-COMPAT-V1: legacy fallback
            logger.warn('[LMS] legacy LMS completion fallback used (video) — deprecated, transition to metrics-aware client', {
              userId, courseId, lessonId, lessonType: 'video',
            });
          } else {
            const VIDEO_THRESHOLD = 0.7;
            let satisfied = false;
            let code: 'VIDEO_DURATION_UNKNOWN' | 'VIDEO_THRESHOLD_NOT_MET' = 'VIDEO_THRESHOLD_NOT_MET';

            if (typeof progressRatio === 'number' && progressRatio >= VIDEO_THRESHOLD) {
              satisfied = true;
            } else if (typeof watchedSeconds === 'number' && watchedSeconds > 0) {
              // videoDuration(초) 우선, fallback duration(분 → 초)
              const baseSeconds =
                lesson.videoDuration && lesson.videoDuration > 0
                  ? lesson.videoDuration
                  : lesson.duration && lesson.duration > 0
                    ? lesson.duration * 60
                    : null;
              if (baseSeconds === null) {
                code = 'VIDEO_DURATION_UNKNOWN';
              } else if (watchedSeconds >= baseSeconds * VIDEO_THRESHOLD) {
                satisfied = true;
              } else {
                code = 'VIDEO_THRESHOLD_NOT_MET';
              }
            }

            if (!satisfied) {
              return BaseController.error(
                res,
                '비디오 시청 기준(70% 이상)을 충족하지 않았습니다.',
                400,
                code,
              );
            }
          }
        }

        if (lesson.type === 'article') {
          const hasAnyArticleMetric =
            typeof scrolledRatio === 'number' || typeof dwellTimeSeconds === 'number';
          if (!hasAnyArticleMetric) {
            // WO-O4O-LMS-COMPLETION-RULES-BACKWARD-COMPAT-V1: legacy fallback
            logger.warn('[LMS] legacy LMS completion fallback used (article) — deprecated, transition to metrics-aware client', {
              userId, courseId, lessonId, lessonType: 'article',
            });
          } else {
            const ARTICLE_SCROLL_THRESHOLD = 0.8;
            const ARTICLE_DWELL_SECONDS = 30;
            const scrollOk =
              typeof scrolledRatio === 'number' && scrolledRatio >= ARTICLE_SCROLL_THRESHOLD;
            const dwellOk =
              typeof dwellTimeSeconds === 'number' && dwellTimeSeconds >= ARTICLE_DWELL_SECONDS;
            if (!scrollOk && !dwellOk) {
              return BaseController.error(
                res,
                '학습 시간(30초 이상) 또는 스크롤(80% 이상) 기준 중 하나를 충족해야 합니다.',
                400,
                'ARTICLE_THRESHOLD_NOT_MET',
              );
            }
          }
        }

        // ── 정책 통과 → 기존 완료 처리 흐름 (변경 없음) ──
        // Track completed lesson IDs in metadata
        const completedIds: string[] = enrollment.metadata?.completedLessonIds || [];
        if (!completedIds.includes(lessonId)) {
          completedIds.push(lessonId);
          // WO-O4O-LMS-INTEGRITY-PATCH-V1: 레슨 추가/삭제 반영을 위해 현재 시점 공개 레슨 수 동적 조회
          const currentTotalLessons = await AppDataSource.getRepository('Lesson')
            .createQueryBuilder('lesson')
            .where('lesson.courseId = :courseId', { courseId })
            .andWhere('lesson.isPublished = :isPublished', { isPublished: true })
            .getCount();
          const totalLessons = currentTotalLessons || enrollment.totalLessons || 1;
          const completedLessons = completedIds.length;
          // WO-LMS-PROGRESS-COMPLETION-AUTO-CHAIN-V1: progressPercentage 자동 계산
          const progressPercentage = totalLessons > 0
            ? Math.floor((completedLessons / totalLessons) * 100)
            : 0;
          await service.updateEnrollment(enrollment.id, {
            completedLessons,
            totalLessons,
            progressPercentage,
          });
          // Save metadata separately via repo.update
          const repo = (service as any).enrollmentRepository;
          await repo.update(enrollment.id, {
            metadata: { ...enrollment.metadata, completedLessonIds: completedIds },
          });

          // WO-LMS-PROGRESS-COMPLETION-AUTO-CHAIN-V1: 마지막 레슨 완료 시 자동 수료 체인
          if (completedLessons >= totalLessons && enrollment.status !== 'completed') {
            try {
              const completedEnrollment = await service.completeEnrollment(enrollment.id);
              const completionService = CompletionService.getInstance();
              await completionService.createCompletion(
                userId,
                courseId,
                completedEnrollment.id,
              );
              logger.info('[LMS] Auto-completion chain triggered', { userId, courseId });
            } catch (chainErr) {
              // 체인 실패는 진도 저장을 롤백하지 않음 — 로그만 기록
              logger.warn('[LMS] Auto-completion chain error', {
                error: (chainErr as Error).message,
                userId,
                courseId,
              });
            }
          }
        }
      }

      const updated = await service.getEnrollment(enrollment.id);
      return BaseController.ok(res, { enrollment: updated });
    } catch (error: any) {
      logger.error('[EnrollmentController.updateLessonProgress] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
