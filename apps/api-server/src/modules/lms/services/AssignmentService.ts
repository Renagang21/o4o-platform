import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  Assignment,
  Submission,
  Lesson,
  Progress,
  ProgressStatus,
  Enrollment,
} from '@o4o/lms-core';
import logger from '../../../utils/logger.js';
import { CompletionService } from './CompletionService.js';
// WO-O4O-LMS-COURSE-REAPPROVAL-FLOW-V1
import { CourseService } from './CourseService.js';

/**
 * AssignmentService
 *
 * WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
 *
 * Minimal assignment flow:
 *   - Instructor: upsertAssignment(lessonId, instructions, dueDate)
 *   - Learner: submitAssignment(assignmentId, userId, content)
 *     → creates/updates Submission row + auto-completes lesson Progress
 *     → if all lessons done, triggers Completion (mirrors QuizService).
 */

export interface UpsertAssignmentRequest {
  lessonId: string;
  instructions?: string;
  dueDate?: Date | string | null;
}

export interface SubmitAssignmentRequest {
  content: string;
}

export class AssignmentService {
  private static instance: AssignmentService;
  private assignmentRepository: Repository<Assignment>;
  private submissionRepository: Repository<Submission>;
  private lessonRepository: Repository<Lesson>;
  private progressRepository: Repository<Progress>;
  private enrollmentRepository: Repository<Enrollment>;

  constructor() {
    this.assignmentRepository = AppDataSource.getRepository(Assignment);
    this.submissionRepository = AppDataSource.getRepository(Submission);
    this.lessonRepository = AppDataSource.getRepository(Lesson);
    this.progressRepository = AppDataSource.getRepository(Progress);
    this.enrollmentRepository = AppDataSource.getRepository(Enrollment);
  }

  static getInstance(): AssignmentService {
    if (!AssignmentService.instance) {
      AssignmentService.instance = new AssignmentService();
    }
    return AssignmentService.instance;
  }

  /**
   * Upsert assignment by lessonId (1:1).
   * If exists → update; else → create.
   */
  async upsertAssignment(data: UpsertAssignmentRequest): Promise<Assignment> {
    const dueDate = data.dueDate ? new Date(data.dueDate) : undefined;

    // WO-O4O-LMS-COURSE-REAPPROVAL-FLOW-V1: lesson → course 역추적해 재검토 트리거 후보 확보
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const lesson = await lessonRepo.findOne({
      where: { id: data.lessonId },
      select: ['id', 'courseId'],
    });

    const existing = await this.assignmentRepository.findOne({
      where: { lessonId: data.lessonId },
    });

    let saved: Assignment;
    if (existing) {
      existing.instructions = data.instructions;
      existing.dueDate = dueDate;
      saved = await this.assignmentRepository.save(existing);
      logger.info('[Assignment] Updated', { id: saved.id, lessonId: data.lessonId });
    } else {
      const assignment = this.assignmentRepository.create({
        lessonId: data.lessonId,
        instructions: data.instructions,
        submissionType: 'text',
        dueDate,
      });
      saved = await this.assignmentRepository.save(assignment);
      logger.info('[Assignment] Created', { id: saved.id, lessonId: data.lessonId });
    }

    // WO-O4O-LMS-COURSE-REAPPROVAL-FLOW-V1
    if (lesson?.courseId) {
      await CourseService.getInstance().maybeRevertToPendingReview(lesson.courseId);
    }

    return saved;
  }

  async getAssignmentByLesson(lessonId: string): Promise<Assignment | null> {
    return this.assignmentRepository.findOne({ where: { lessonId } });
  }

  async getAssignment(id: string): Promise<Assignment | null> {
    return this.assignmentRepository.findOne({ where: { id } });
  }

  /**
   * Submit (or re-submit) an assignment as the learner.
   * Auto-marks the lesson as completed in the user's enrollment progress.
   * Triggers completion + certificate when all lessons done (mirrors QuizService).
   */
  async submitAssignment(
    assignmentId: string,
    userId: string,
    data: SubmitAssignmentRequest,
  ): Promise<{ submission: Submission; lessonCompleted: boolean }> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });
    if (!assignment) throw new Error('Assignment not found');

    const lesson = await this.lessonRepository.findOne({
      where: { id: assignment.lessonId },
      select: ['id', 'courseId'],
    });
    if (!lesson) throw new Error('Lesson not found for this assignment');

    // Re-submit → upsert
    let submission = await this.submissionRepository.findOne({
      where: { assignmentId, userId },
    });

    if (submission) {
      submission.content = data.content;
      submission.submittedAt = new Date();
      submission.status = 'submitted';
    } else {
      submission = this.submissionRepository.create({
        assignmentId,
        userId,
        lessonId: assignment.lessonId,
        content: data.content,
        submittedAt: new Date(),
        status: 'submitted',
      });
    }
    submission = await this.submissionRepository.save(submission);

    const lessonCompleted = await this.completeLessonProgress(
      assignment.lessonId,
      lesson.courseId,
      userId,
    );

    logger.info('[Assignment] Submitted', {
      submissionId: submission.id,
      assignmentId,
      userId,
      lessonId: assignment.lessonId,
      lessonCompleted,
    });

    return { submission, lessonCompleted };
  }

  async getMySubmission(assignmentId: string, userId: string): Promise<Submission | null> {
    return this.submissionRepository.findOne({
      where: { assignmentId, userId },
    });
  }

  /**
   * Mark lesson as completed in user's enrollment progress.
   * Mirrors QuizService.completeLessonProgress() — minus quiz scoring/credits.
   */
  private async completeLessonProgress(
    lessonId: string,
    courseId: string | undefined,
    userId: string,
  ): Promise<boolean> {
    if (!courseId) return false;

    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });
    if (!enrollment) return false;

    let progress = await this.progressRepository.findOne({
      where: { enrollmentId: enrollment.id, lessonId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        enrollmentId: enrollment.id,
        lessonId,
        status: ProgressStatus.IN_PROGRESS,
        startedAt: new Date(),
      });
    }

    progress.complete();
    progress.attempts = (progress.attempts || 0) + 1;
    await this.progressRepository.save(progress);

    const completedCount = await this.progressRepository.count({
      where: { enrollmentId: enrollment.id, status: ProgressStatus.COMPLETED },
    });
    const totalLessons = await this.lessonRepository.count({
      where: { courseId, isPublished: true },
    });

    enrollment.updateProgress(completedCount, totalLessons);

    if (completedCount >= totalLessons && totalLessons > 0) {
      enrollment.complete(enrollment.averageQuizScore ?? undefined);
      try {
        const completionService = CompletionService.getInstance();
        await completionService.createCompletion(userId, courseId, enrollment.id);
      } catch (err) {
        logger.warn('[Assignment] Completion creation failed', {
          courseId,
          userId,
          error: (err as Error).message,
        });
      }
    }

    await this.enrollmentRepository.save(enrollment);
    return true;
  }
}
