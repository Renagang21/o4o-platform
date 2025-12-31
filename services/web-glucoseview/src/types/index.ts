// Re-export all types
export * from './patient';

// Additional types for components
export interface GlucoseInsight {
  id: string;
  insight_type: string;
  description: string;
  generated_by: 'system' | 'pharmacist' | 'ai';
  reference_period?: string;
  created_at: string;
}
