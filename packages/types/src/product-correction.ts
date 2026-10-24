/** 관리자 보정 준비 공간의 계약. 상품 원본/공식 설명서 적용 API가 아니다. */
export type ProductCorrectionCheck =
  | { kind: 'missing_field'; field: 'manufacturer_name' | 'specification' | 'barcode' }
  | { kind: 'missing_description' }
  | { kind: 'stale_description'; days: number }
  | { kind: 'text'; terms: string[]; match: 'any' | 'all' }
  | { kind: 'copied_b2b' }
  | { kind: 'manual' };

export interface ProductCorrectionRuleInput {
  title: string;
  instructions: string;
  purpose: 'professional' | 'ai-support' | 'consumer-qr';
  regulatoryTypes: string[];
  descriptionType: 'STORE' | 'B2B' | 'B2C' | 'SUPPLIER_STORE';
  language: string;
  cadenceDays: number;
  enabled: boolean;
  check: ProductCorrectionCheck;
}
export interface ProductCorrectionRule extends ProductCorrectionRuleInput {
  id: string;
  revision: number;
  updatedAt: string;
  updatedBy: string;
}
export interface ProductCorrectionScope {
  search: string;
  page: number;
}
export interface ProductCorrectionMatch {
  runId?: string;
  id: string;
  name: string;
  regulatoryType: string;
  manufacturerName: string | null;
  specification: string | null;
  barcode: string | null;
  descriptionId: string | null;
  descriptionUpdatedAt: string | null;
  sourceType: string | null;
  sourceRefId: string | null;
  sourceContent: string;
  sourceTruncated: boolean;
  fingerprint: string;
  reason: string;
}
export interface ProductCorrectionPreview {
  runId?: string;
  ruleRevision: number;
  total: number;
  page: number;
  pageSize: number;
  items: ProductCorrectionMatch[];
}
export type ProductCorrectionTaskState =
  | 'pending'
  | 'in_progress'
  | 'needs_source'
  | 'review_ready'
  | 'deferred'
  | 'no_change'
  | 'reviewed'
  | 'excluded';
export interface ProductCorrectionTask {
  id: string;
  product: ProductCorrectionMatch;
  state: ProductCorrectionTaskState;
  draft: string;
  notes: string;
  sources: string;
  updatedAt: string;
  updatedBy: string;
  followUpAt?: string | null;
  reviewedAt?: string | null;
  nextReviewAt?: string | null;
}
export interface ProductCorrectionBatch {
  id: string;
  revision: number;
  title: string;
  ruleSnapshot: ProductCorrectionRule;
  scope: ProductCorrectionScope;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  items: ProductCorrectionTask[];
}
export interface ProductCorrectionBatchSummary {
  id: string;
  title: string;
  ruleId: string;
  ruleRevision: number;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

export interface ProductCorrectionBatchResult extends ProductCorrectionBatch {
  selectionResult?: {
    createdCount: number;
    reused: Array<{ batchId: string; taskId: string; productName: string }>;
  };
}
export interface ProductCorrectionRun {
  id: string;
  ruleSnapshot: ProductCorrectionRule;
  scope: ProductCorrectionScope;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  actorId: string;
  totalCandidates: number | null;
  returnedCount: number;
  result?: ProductCorrectionPreview;
  errorCode?: string;
  retryOf?: string;
}
export type ProductCorrectionRunSummary = Omit<ProductCorrectionRun, 'ruleSnapshot' | 'result'> & {
  ruleTitle: string;
  ruleId: string;
  ruleRevision: number;
};
export type ProductCorrectionOperationFilter = 'all' | 'open' | 'due' | 'followup' | 'reviewed' | 'outdated';
export interface ProductCorrectionOperation {
  batchId: string;
  taskId: string;
  productId: string;
  productName: string;
  ruleId: string;
  ruleTitle: string;
  ruleRevision: number;
  state: ProductCorrectionTaskState;
  followUpAt: string | null;
  reviewedAt: string | null;
  nextReviewAt: string | null;
  outdated: boolean;
}
export interface ProductCorrectionOperations {
  counts: {
    total: number;
    products: number;
    open: number;
    due: number;
    followup: number;
    reviewed: number;
    outdated: number;
  };
  items: ProductCorrectionOperation[];
  page: number;
  pageSize: number;
  total: number;
}
export interface ProductCorrectionTaskVersion {
  batchId: string;
  batchRevision: number;
  task: ProductCorrectionTask;
}
