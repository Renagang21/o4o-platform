import type { CourseCompletedEvent } from '../../types/events.js';
import type { CreditRecordService } from '../services/CreditRecordService.js';
import type { CourseAssignmentService } from '../services/CourseAssignmentService.js';
import type { LicenseProfileService } from '../services/LicenseProfileService.js';
import type { RequiredCoursePolicyService } from '../services/RequiredCoursePolicyService.js';
import { CreditType } from '../entities/CreditRecord.entity.js';

/**
 * CourseCompletionHandler
 *
 * Handles lms-core.course.completed events.
 * Automatically records credits and completes course assignments.
 */
export class CourseCompletionHandler {
  constructor(
    private creditRecordService: CreditRecordService,
    private courseAssignmentService: CourseAssignmentService,
    private licenseProfileService: LicenseProfileService,
    private policyService: RequiredCoursePolicyService
  ) {}

  /**
   * Handle course completion event
   *
   * Processing:
   * 1. Check if credit record already exists (idempotency)
   * 2. Create credit record if not exists
   * 3. Mark assignment as completed if exists
   * 4. Recalculate user's total credits
   * 5. Check renewal requirement
   */
  async handle(event: CourseCompletedEvent): Promise<void> {
    const {
      userId,
      courseId,
      enrollmentId,
      completedAt,
      courseTitle,
      courseCredits,
      organizationId,
    } = event;

    console.log(`[CourseCompletionHandler] Processing course completion for user ${userId}, course ${courseId}`);

    try {
      // 1. Check idempotency - skip if credit already recorded for this course
      const existingCredit = await this.creditRecordService.hasCreditForCourse(userId, courseId);

      if (!existingCredit) {
        // 2. Create credit record
        const credits = courseCredits ?? 0;

        if (credits > 0) {
          await this.creditRecordService.addCreditRecord(
            userId,
            courseId,
            credits,
            undefined, // certificateId will be linked later
            {
              creditType: CreditType.COURSE_COMPLETION,
              courseTitle,
              enrollmentId,
              earnedAt: completedAt,
              note: `Auto-recorded on course completion`,
            }
          );

          console.log(`[CourseCompletionHandler] Credit record created: ${credits} credits for user ${userId}`);
        }
      } else {
        console.log(`[CourseCompletionHandler] Credit already exists for user ${userId}, course ${courseId} - skipping`);
      }

      // 3. Mark assignment as completed if exists
      const assignments = await this.courseAssignmentService.getAssignmentsByUser(userId);
      const assignment = assignments.find(a => a.courseId === courseId && !a.isCompleted);

      if (assignment) {
        await this.courseAssignmentService.markCompleted(assignment.id, enrollmentId);
        console.log(`[CourseCompletionHandler] Assignment ${assignment.id} marked as completed`);
      }

      // 4. Recalculate total credits
      await this.licenseProfileService.recalculateCredits(userId);

      // 5. Check if renewal is required (updates profile)
      const profile = await this.licenseProfileService.getProfile(userId);
      if (profile) {
        // Get required credits from policy if organization exists
        let requiredCredits = 8; // default
        if (organizationId) {
          requiredCredits = await this.policyService.getRequiredCredits(organizationId);
        }
        await this.licenseProfileService.checkRenewalRequired(profile.id, requiredCredits);
      }

      console.log(`[CourseCompletionHandler] Successfully processed course completion for user ${userId}`);
    } catch (error) {
      console.error(`[CourseCompletionHandler] Error processing course completion:`, error);
      throw error;
    }
  }
}
