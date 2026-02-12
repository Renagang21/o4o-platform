import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AppDataSource } from '../../../database/connection.js';
import { InstructorApplication, Course, CourseStatus } from '@o4o/lms-core';
import logger from '../../../utils/logger.js';

/**
 * InstructorPublicController
 *
 * WO-CONTENT-INSTRUCTOR-PUBLIC-PROFILE-V1
 *
 * 강사 공개 프로필 (인증 불필요)
 */
export class InstructorPublicController extends BaseController {
  /**
   * GET /instructors/:userId/public-profile
   * 공개 강사 프로필 + 게시된 강좌 목록
   */
  static async getPublicProfile(req: Request, res: Response): Promise<any> {
    try {
      const { userId } = req.params;

      // 1. 승인된 강사인지 확인
      const appRepo = AppDataSource.getRepository(InstructorApplication);
      const application = await appRepo.findOne({
        where: { userId, status: 'approved' },
        relations: ['user'],
      });

      if (!application || !application.user) {
        return BaseController.notFound(res, '강사를 찾을 수 없습니다', 'INSTRUCTOR_NOT_FOUND');
      }

      const user = application.user as any;

      // 2. 게시된 강좌 조회
      const courseRepo = AppDataSource.getRepository(Course);
      const courses = await courseRepo.find({
        where: {
          instructorId: userId,
          status: CourseStatus.PUBLISHED,
          isPublished: true,
        },
        order: { createdAt: 'DESC' },
      });

      // 3. 통계 계산
      const totalStudents = courses.reduce((sum, c) => sum + (c.currentEnrollments || 0), 0);
      const freeCourses = courses.filter(c => !c.isPaid).length;
      const paidCourses = courses.filter(c => c.isPaid).length;

      // 4. 공개 데이터만 반환 (email/password 제외)
      return BaseController.ok(res, {
        instructor: {
          id: user.id,
          name: user.name,
          nickname: user.nickname || null,
          avatar: user.avatar || null,
        },
        stats: {
          courseCount: courses.length,
          totalStudents,
          freeCourses,
          paidCourses,
        },
        courses: courses.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          thumbnail: c.thumbnail || null,
          level: c.level,
          duration: c.duration,
          isPaid: c.isPaid,
          price: c.price || null,
          credits: Number(c.credits) || 0,
          tags: c.tags || [],
          currentEnrollments: c.currentEnrollments,
          createdAt: c.createdAt,
          publishedAt: c.publishedAt,
        })),
      });
    } catch (error: any) {
      logger.error('[InstructorPublicController.getPublicProfile] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
