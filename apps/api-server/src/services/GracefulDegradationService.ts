/**
 * GracefulDegradationService — Barrel Re-export
 *
 * WO-O4O-INCIDENT-DEGRADATION-SERVICE-SPLIT-V1
 * Original 968-line file split into degradation/ directory.
 * This file preserves the original import path for all consumers.
 */

export * from './degradation/degradation.types.js';
export { GracefulDegradationService, gracefulDegradationService } from './degradation/graceful-degradation.facade.js';
