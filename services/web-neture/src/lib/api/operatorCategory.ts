import { api } from '../apiClient';
import { createOperatorCategoryApi } from '@o4o/operator-core-ui/modules/neture-product-operations';
export * from '@o4o/operator-core-ui/modules/neture-product-operations/operatorCategory';
export const { operatorCategoryApi } = createOperatorCategoryApi(api);
