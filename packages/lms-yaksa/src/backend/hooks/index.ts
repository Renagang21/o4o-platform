/**
 * LMS-Yaksa Hooks Exports
 *
 * Event handlers for LMS Core integration
 */

// Individual handlers
export { CourseCompletionHandler } from './CourseCompletionHandler.js';
export { CertificateIssuedHandler } from './CertificateIssuedHandler.js';
export { EnrollmentHandler } from './EnrollmentHandler.js';
export { ProgressSyncHandler } from './ProgressSyncHandler.js';

// Main event handler class
export {
  LmsCoreEventHandlers,
  createHooks,
  createHooksWithServices,
  type EventBusInterface,
} from './LmsCoreEventHandlers.js';
