import { api } from '../apiClient';
import { createOperatorProductApiApi } from '@o4o/operator-core-ui/modules/neture-product-operations';
export * from '@o4o/operator-core-ui/modules/neture-product-operations/operatorProductApi';
export const { operatorProductApi } = createOperatorProductApiApi(api);
