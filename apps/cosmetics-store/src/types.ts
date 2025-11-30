export interface CosmeticsFilters {
  skinType?: string[];
  concerns?: string[];
  certifications?: string[];
  category?: string;
  timeOfUse?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RoutineRequest {
  skinType: string;
  concerns: string[];
  timeOfUse: 'morning' | 'evening';
}

export interface RoutineStep {
  step: number;
  category: string;
  product: any;
  description: string;
  orderInRoutine: number;
}

export interface RoutineRecommendation {
  skinType: string;
  concerns: string[];
  timeOfUse: 'morning' | 'evening';
  routine: RoutineStep[];
  totalSteps: number;
  estimatedTime: string;
  tips: string[];
}
