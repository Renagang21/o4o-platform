import type { TimestampedGlucose, CgmEvent } from '../analysis/cgm-event.types.js';

/**
 * CgmEventDataProvider
 *
 * Interface for fetching glucose readings and events from storage.
 *
 * WO-O4O-CARE-CGM-EVENT-INTEGRATION-V1
 */
export interface CgmEventDataProvider {
  getGlucoseReadings(patientId: string, from: Date, to: Date): Promise<TimestampedGlucose[]>;
  getEvents(patientId: string, from: Date, to: Date): Promise<CgmEvent[]>;
}
