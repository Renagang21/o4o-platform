import type { ProgressUpdatedEvent } from '../../types/events.js';
import type { CourseAssignmentService } from '../services/CourseAssignmentService.js';

/**
 * ProgressSyncHandler
 *
 * Handles lms-core.enrollment.progress events.
 * Synchronizes progress to Yaksa course assignments.
 */
export class ProgressSyncHandler {
  constructor(
    private courseAssignmentService: CourseAssignmentService
  ) {}

  /**
   * Handle progress update event
   *
   * Processing:
   * 1. Find assignment for user + course
   * 2. Update progressPercent on assignment
   * 3. If progress reaches 100%, auto-complete assignment
   */
  async handle(event: ProgressUpdatedEvent): Promise<void> {
    const {
      userId,
      courseId,
      enrollmentId,
      progressPercent,
      updatedAt,
    } = event;

    console.log(`[ProgressSyncHandler] Processing progress update for user ${userId}, course ${courseId}: ${progressPercent}%`);

    try {
      // 1. Find assignment for this user and course
      const assignments = await this.courseAssignmentService.getAssignmentsByUser(userId);
      const assignment = assignments.find(
        a => a.courseId === courseId && !a.isCompleted
      );

      if (!assignment) {
        console.log(`[ProgressSyncHandler] No active assignment found for user ${userId}, course ${courseId}`);
        return;
      }

      // 2 & 3. Update progress (auto-completes if 100%)
      await this.courseAssignmentService.updateProgress(assignment.id, progressPercent);

      // Link enrollment if not already linked
      if (!assignment.enrollmentId && enrollmentId) {
        await this.courseAssignmentService.linkEnrollment(assignment.id, enrollmentId);
      }

      if (progressPercent >= 100) {
        console.log(`[ProgressSyncHandler] Assignment ${assignment.id} auto-completed at 100% progress`);
      } else {
        console.log(`[ProgressSyncHandler] Assignment ${assignment.id} progress updated to ${progressPercent}%`);
      }
    } catch (error) {
      console.error(`[ProgressSyncHandler] Error processing progress update:`, error);
      throw error;
    }
  }
}
