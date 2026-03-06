export interface CgmReading {
  timestamp: string; // ISO 8601
  glucose: number;   // mg/dL
}

export interface CgmProvider {
  getReadings(patientId: string, from: Date, to: Date): Promise<CgmReading[]>;
}
