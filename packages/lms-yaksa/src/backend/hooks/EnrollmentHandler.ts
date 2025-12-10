import type { EnrollmentCreatedEvent } from '../../types/events.js';
import type { CourseAssignmentService } from '../services/CourseAssignmentService.js';
import type { RequiredCoursePolicyService } from '../services/RequiredCoursePolicyService.js';

/**
 * EnrollmentHandler
 *
 * Handles lms-core.enrollment.created events.
 * Links enrollment to assignment and updates status.
 */
export class EnrollmentHandler {
  constructor(
    private courseAssignmentService: CourseAssignmentService,
    private policyService: RequiredCoursePolicyService
  ) {}

  /**
   * Handle enrollment created event
   *
   * Processing:
   * 1. Find existing assignment for user + course
   * 2. If found and status is PENDING, update to IN_PROGRESS
   * 3. Link enrollmentId to assignment
   * 4. Check if this is a required course and auto-assign if needed
   */
  async handle(event: EnrollmentCreatedEvent): Promise<void> {
    const {
      userId,
      courseId,
      enrollmentId,
      enrolledAt,
      organizationId,
    } = event;

    console.log(`[EnrollmentHandler] Processing enrollment for user ${userId}, course ${courseId}`);

    try {
      // 1. Find existing assignment
      const assignments = await this.courseAssignmentService.getAssignmentsByUser(userId);
      const assignment = assignments.find(
        a => a.courseId === courseId && a.isActive()
      );

      if (assignment) {
        // 2 & 3. Link enrollment and update status
        await this.courseAssignmentService.linkEnrollment(assignment.id, enrollmentId);
        console.log(`[EnrollmentHandler] Linked enrollment ${enrollmentId} to assignment ${assignment.id}`);
      } else if (organizationId) {
        // 4. Check if this is a required course
        const isRequired = await this.policyService.isCourseRequired(organizationId, courseId);

        if (isRequired) {
          // Auto-create assignment for required course
          const newAssignment = await this.courseAssignmentService.assignCourse(
            userId,
            organizationId,
            courseId,
            {
              isMandatory: true,
              note: `Auto-assigned on enrollment for required course`,
            }
          );

          // Link enrollment
          await this.courseAssignmentService.linkEnrollment(newAssignment.id, enrollmentId);
          console.log(`[EnrollmentHandler] Auto-assigned required course and linked enrollment`);
        }
      }

      console.log(`[EnrollmentHandler] Successfully processed enrollment for user ${userId}`);
    } catch (error) {
      console.error(`[EnrollmentHandler] Error processing enrollment:`, error);
      throw error;
    }
  }
}
