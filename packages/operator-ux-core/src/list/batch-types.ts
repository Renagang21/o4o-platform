/**
 * Batch Action Types
 *
 * WO-O4O-TABLE-STANDARD-V3
 */

export interface BatchResultItem {
  id: string;
  status: 'success' | 'skipped' | 'failed';
  error?: string;
}

export interface BatchResult {
  results: BatchResultItem[];
  successCount: number;
  failedCount: number;
  skippedCount: number;
}
