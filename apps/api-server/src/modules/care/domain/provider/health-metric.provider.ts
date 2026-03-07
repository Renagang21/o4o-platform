/**
 * HealthMetricProvider — Extension-level provider for non-glucose metrics
 *
 * WO-O4O-CARE-MULTI-METRIC-ANALYSIS-V1
 *
 * Independent of CgmProvider (Core). Provides blood pressure and weight readings
 * from the health_readings table.
 */

export interface BpReading {
  timestamp: string; // ISO 8601
  systolic: number;  // mmHg
  diastolic: number; // mmHg
}

export interface WeightReading {
  timestamp: string; // ISO 8601
  weight: number;    // kg
}

export interface HealthMetricProvider {
  getBpReadings(patientId: string, from: Date, to: Date): Promise<BpReading[]>;
  getWeightReadings(patientId: string, from: Date, to: Date): Promise<WeightReading[]>;
}
