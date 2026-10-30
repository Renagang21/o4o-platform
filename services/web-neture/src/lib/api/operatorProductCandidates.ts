import {api} from '../apiClient';
import {createProductCandidatesApi} from '@o4o/operator-core-ui/modules/neture-product-operations';
export * from '@o4o/operator-core-ui/modules/neture-product-operations/operatorProductCandidates';
export const {operatorProductCandidateApi} = createProductCandidatesApi(api);
