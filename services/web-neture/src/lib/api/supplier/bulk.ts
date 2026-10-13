import { api } from '../../apiClient';
import type { BulkCandidateRowInput, BulkCandidateSubmitResult } from './product.types';

/** 검증 통과 row 를 안전 후보(ProductCandidate)로 제출. 오류 row 는 호출 전 제외할 것. */
export async function submitBulkCandidates(
  productType: string,
  rows: BulkCandidateRowInput[],
): Promise<BulkCandidateSubmitResult> {
  const res = await api.post('/neture/supplier/products/bulk-candidates', { productType, rows });
  return res.data.data as BulkCandidateSubmitResult;
}
