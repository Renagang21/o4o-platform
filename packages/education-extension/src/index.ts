/**
 * Education Extension
 *
 * Enrollment, Progress, Certificate, Event, Attendance
 *
 * @package @o4o/education-extension
 * @version 1.0.0
 */

// Entities
export * from './entities/index.js';

// Entity list for TypeORM
import * as Entities from './entities/index.js';
export const entities = Object.values(Entities).filter(
  (item) => typeof item === 'function' && item.prototype
);
