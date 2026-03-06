export interface CareInsightDto {
  patientId: string;
  tir: number;
  cv: number;
  riskLevel: 'low' | 'moderate' | 'high';
  insights: string[];
}
