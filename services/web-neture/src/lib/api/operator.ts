import { api } from '../apiClient';
import { createOperatorApi } from '@o4o/operator-core-ui/modules/neture-product-operations';
export * from '@o4o/operator-core-ui/modules/neture-product-operations/operator';
export const { operatorAllOffersApi, operatorSupplyApi } = createOperatorApi(api);
