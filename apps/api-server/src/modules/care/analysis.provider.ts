import type { CareInsightDto } from './dto.js';

export interface AnalysisProvider {
  analyzePatient(patientId: string): Promise<CareInsightDto>;
}
