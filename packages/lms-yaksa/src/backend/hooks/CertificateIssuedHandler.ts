import type { CertificateIssuedEvent } from '../../types/events.js';
import type { CreditRecordService } from '../services/CreditRecordService.js';
import type { CourseAssignmentService } from '../services/CourseAssignmentService.js';
import type { LicenseProfileService } from '../services/LicenseProfileService.js';
import { CreditType } from '../entities/CreditRecord.entity.js';

/**
 * CertificateIssuedHandler
 *
 * Handles lms-core.certificate.issued events.
 * Links certificate to credit records and ensures assignment completion.
 */
export class CertificateIssuedHandler {
  constructor(
    private creditRecordService: CreditRecordService,
    private courseAssignmentService: CourseAssignmentService,
    private licenseProfileService: LicenseProfileService
  ) {}

  /**
   * Handle certificate issued event
   *
   * Processing:
   * 1. Check if credit record exists for this course
   * 2. If exists, link certificateId to the record
   * 3. If not exists, create new credit record with certificate
   * 4. Ensure assignment is marked as completed
   * 5. Recalculate total credits
   */
  async handle(event: CertificateIssuedEvent): Promise<void> {
    const {
      userId,
      courseId,
      certificateId,
      enrollmentId,
      issuedAt,
      courseTitle,
      credits,
    } = event;

    console.log(`[CertificateIssuedHandler] Processing certificate for user ${userId}, course ${courseId}`);

    try {
      // 1. Check if credit record exists
      const hasExistingCredit = await this.creditRecordService.hasCreditForCourse(userId, courseId);

      if (hasExistingCredit) {
        // 2. Link certificateId to existing record
        const userCredits = await this.creditRecordService.getCredits(userId);
        const existingRecord = userCredits.find(c => c.courseId === courseId);

        if (existingRecord && !existingRecord.certificateId) {
          await this.creditRecordService.updateCreditRecord(existingRecord.id, {
            certificateId,
          });
          console.log(`[CertificateIssuedHandler] Linked certificate ${certificateId} to existing credit record`);
        }
      } else {
        // 3. Create new credit record with certificate
        const creditAmount = credits ?? 0;

        if (creditAmount > 0) {
          await this.creditRecordService.addCreditRecord(
            userId,
            courseId,
            creditAmount,
            certificateId,
            {
              creditType: CreditType.COURSE_COMPLETION,
              courseTitle,
              enrollmentId,
              earnedAt: issuedAt,
              note: `Auto-recorded on certificate issuance`,
            }
          );
          console.log(`[CertificateIssuedHandler] Credit record created with certificate: ${creditAmount} credits`);
        }
      }

      // 4. Ensure assignment is completed
      const assignments = await this.courseAssignmentService.getAssignmentsByUser(userId);
      const assignment = assignments.find(a => a.courseId === courseId && !a.isCompleted);

      if (assignment) {
        await this.courseAssignmentService.markCompleted(assignment.id, enrollmentId);
        console.log(`[CertificateIssuedHandler] Assignment ${assignment.id} marked as completed`);
      }

      // 5. Recalculate total credits
      await this.licenseProfileService.recalculateCredits(userId);

      console.log(`[CertificateIssuedHandler] Successfully processed certificate for user ${userId}`);
    } catch (error) {
      console.error(`[CertificateIssuedHandler] Error processing certificate:`, error);
      throw error;
    }
  }
}
