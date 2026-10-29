import { api } from '../apiClient';
import { createOperatorProductCleanupApi } from '@o4o/operator-core-ui/modules/neture-product-operations';
export * from '@o4o/operator-core-ui/modules/neture-product-operations/operatorProductCleanup';
export const { productCleanupApi } = createOperatorProductCleanupApi(api);
