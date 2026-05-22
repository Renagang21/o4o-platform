/**
 * WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
 */
import type { AppreciationTargetType } from '../entities/AppreciationSend.js';

export interface SendAppreciationDto {
  targetType: AppreciationTargetType;
  targetId: string;
  amount: number;
  message?: string;
}

export interface AppreciationSummary {
  targetType: AppreciationTargetType;
  targetId: string;
  totalAmount: number;
  count: number;
}
