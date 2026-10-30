import { api } from '../apiClient';
import { createOperatorCategoryMappingApi } from '@o4o/operator-core-ui/modules/neture-product-operations';
export * from '@o4o/operator-core-ui/modules/neture-product-operations/operatorCategoryMapping';
export const { operatorCategoryMappingApi } = createOperatorCategoryMappingApi(api);
