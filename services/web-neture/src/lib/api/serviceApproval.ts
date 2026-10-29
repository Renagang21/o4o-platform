import { api } from '../apiClient';
import { createServiceApprovalApi } from '@o4o/operator-core-ui/modules/neture-product-operations';
export * from '@o4o/operator-core-ui/modules/neture-product-operations/serviceApproval';
export const { operatorServiceApprovalApi } = createServiceApprovalApi(api);
