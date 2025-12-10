import type { EventEmitter } from 'events';
import type { DataSource } from 'typeorm';

import type {
  CourseCompletedEvent,
  CertificateIssuedEvent,
  EnrollmentCreatedEvent,
  ProgressUpdatedEvent,
} from '../../types/events.js';
import { LMS_CORE_EVENTS } from '../../types/events.js';

import { LicenseProfileService } from '../services/LicenseProfileService.js';
import { RequiredCoursePolicyService } from '../services/RequiredCoursePolicyService.js';
import { CreditRecordService } from '../services/CreditRecordService.js';
import { CourseAssignmentService } from '../services/CourseAssignmentService.js';

import { CourseCompletionHandler } from './CourseCompletionHandler.js';
import { CertificateIssuedHandler } from './CertificateIssuedHandler.js';
import { EnrollmentHandler } from './EnrollmentHandler.js';
import { ProgressSyncHandler } from './ProgressSyncHandler.js';

/**
 * EventBus interface for flexibility
 * Compatible with Node.js EventEmitter or custom implementations
 */
export interface EventBusInterface {
  on(event: string, listener: (...args: any[]) => void): this;
  off?(event: string, listener: (...args: any[]) => void): this;
  emit?(event: string, ...args: any[]): boolean;
}

/**
 * LmsCoreEventHandlers
 *
 * Main handler class that integrates all LMS Core event handlers.
 * Provides unified interface for registering and managing event subscriptions.
 */
export class LmsCoreEventHandlers {
  private courseCompletionHandler: CourseCompletionHandler;
  private certificateIssuedHandler: CertificateIssuedHandler;
  private enrollmentHandler: EnrollmentHandler;
  private progressSyncHandler: ProgressSyncHandler;

  private boundHandlers: Map<string, (...args: any[]) => void> = new Map();
  private eventBus: EventBusInterface | null = null;

  constructor(
    private creditRecordService: CreditRecordService,
    private courseAssignmentService: CourseAssignmentService,
    private licenseProfileService: LicenseProfileService,
    private policyService: RequiredCoursePolicyService
  ) {
    // Initialize individual handlers
    this.courseCompletionHandler = new CourseCompletionHandler(
      creditRecordService,
      courseAssignmentService,
      licenseProfileService,
      policyService
    );

    this.certificateIssuedHandler = new CertificateIssuedHandler(
      creditRecordService,
      courseAssignmentService,
      licenseProfileService
    );

    this.enrollmentHandler = new EnrollmentHandler(
      courseAssignmentService,
      policyService
    );

    this.progressSyncHandler = new ProgressSyncHandler(
      courseAssignmentService
    );
  }

  /**
   * Register all event handlers with an event bus
   */
  registerHandlers(eventBus: EventBusInterface | EventEmitter): void {
    this.eventBus = eventBus;

    // Create bound handlers for later cleanup
    const courseCompletedHandler = this.onCourseCompleted.bind(this);
    const certificateIssuedHandler = this.onCertificateIssued.bind(this);
    const enrollmentCreatedHandler = this.onEnrollmentCreated.bind(this);
    const progressUpdatedHandler = this.onProgressUpdated.bind(this);

    // Store bound handlers
    this.boundHandlers.set(LMS_CORE_EVENTS.COURSE_COMPLETED, courseCompletedHandler);
    this.boundHandlers.set(LMS_CORE_EVENTS.CERTIFICATE_ISSUED, certificateIssuedHandler);
    this.boundHandlers.set(LMS_CORE_EVENTS.ENROLLMENT_CREATED, enrollmentCreatedHandler);
    this.boundHandlers.set(LMS_CORE_EVENTS.ENROLLMENT_PROGRESS, progressUpdatedHandler);

    // Register with event bus
    eventBus.on(LMS_CORE_EVENTS.COURSE_COMPLETED, courseCompletedHandler);
    eventBus.on(LMS_CORE_EVENTS.CERTIFICATE_ISSUED, certificateIssuedHandler);
    eventBus.on(LMS_CORE_EVENTS.ENROLLMENT_CREATED, enrollmentCreatedHandler);
    eventBus.on(LMS_CORE_EVENTS.ENROLLMENT_PROGRESS, progressUpdatedHandler);

    console.log('[LmsCoreEventHandlers] Event handlers registered');
  }

  /**
   * Unregister all event handlers
   */
  unregisterHandlers(): void {
    if (!this.eventBus || !this.eventBus.off) {
      console.warn('[LmsCoreEventHandlers] Cannot unregister - no event bus or off method');
      return;
    }

    for (const [event, handler] of this.boundHandlers) {
      this.eventBus.off(event, handler);
    }

    this.boundHandlers.clear();
    this.eventBus = null;

    console.log('[LmsCoreEventHandlers] Event handlers unregistered');
  }

  /**
   * Handle course completion event
   */
  async onCourseCompleted(event: CourseCompletedEvent): Promise<void> {
    try {
      await this.courseCompletionHandler.handle(event);
    } catch (error) {
      console.error('[LmsCoreEventHandlers] Error in onCourseCompleted:', error);
      // Don't rethrow - event handlers should not break the main flow
    }
  }

  /**
   * Handle certificate issued event
   */
  async onCertificateIssued(event: CertificateIssuedEvent): Promise<void> {
    try {
      await this.certificateIssuedHandler.handle(event);
    } catch (error) {
      console.error('[LmsCoreEventHandlers] Error in onCertificateIssued:', error);
    }
  }

  /**
   * Handle enrollment created event
   */
  async onEnrollmentCreated(event: EnrollmentCreatedEvent): Promise<void> {
    try {
      await this.enrollmentHandler.handle(event);
    } catch (error) {
      console.error('[LmsCoreEventHandlers] Error in onEnrollmentCreated:', error);
    }
  }

  /**
   * Handle progress updated event
   */
  async onProgressUpdated(event: ProgressUpdatedEvent): Promise<void> {
    try {
      await this.progressSyncHandler.handle(event);
    } catch (error) {
      console.error('[LmsCoreEventHandlers] Error in onProgressUpdated:', error);
    }
  }

  /**
   * Get list of events this handler listens to
   */
  static getListenedEvents(): string[] {
    return [
      LMS_CORE_EVENTS.COURSE_COMPLETED,
      LMS_CORE_EVENTS.CERTIFICATE_ISSUED,
      LMS_CORE_EVENTS.ENROLLMENT_CREATED,
      LMS_CORE_EVENTS.ENROLLMENT_PROGRESS,
    ];
  }
}

/**
 * Factory function to create LmsCoreEventHandlers with DataSource
 */
export function createHooks(dataSource: DataSource): LmsCoreEventHandlers {
  const creditRecordService = new CreditRecordService(dataSource);
  const courseAssignmentService = new CourseAssignmentService(dataSource);
  const licenseProfileService = new LicenseProfileService(dataSource);
  const policyService = new RequiredCoursePolicyService(dataSource);

  return new LmsCoreEventHandlers(
    creditRecordService,
    courseAssignmentService,
    licenseProfileService,
    policyService
  );
}

/**
 * Factory function with pre-initialized services
 */
export function createHooksWithServices(services: {
  creditRecordService: CreditRecordService;
  courseAssignmentService: CourseAssignmentService;
  licenseProfileService: LicenseProfileService;
  policyService: RequiredCoursePolicyService;
}): LmsCoreEventHandlers {
  return new LmsCoreEventHandlers(
    services.creditRecordService,
    services.courseAssignmentService,
    services.licenseProfileService,
    services.policyService
  );
}
