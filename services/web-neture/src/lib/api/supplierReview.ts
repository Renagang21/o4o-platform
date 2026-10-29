import { api } from '../apiClient';
import { createSupplierReviewApi } from '@o4o/operator-core-ui/modules/supplier-operations';
export { SUPPLIER_REVIEW_LABELS } from '@o4o/operator-core-ui/modules/supplier-operations';
export type { SupplierReviewRequest, SupplierReviewData, SupplierReviewQueueItem } from '@o4o/operator-core-ui/modules/supplier-operations';
export const supplierReviewApi = createSupplierReviewApi(api);
