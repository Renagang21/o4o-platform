import { useProductServiceApprovalQuery as useWorkflow } from '@o4o/operator-core-ui/modules/neture-product-operations';
import { operatorServiceApprovalApi } from '../../lib/api/serviceApproval';
import type { NetureProductBindings } from '@o4o/operator-core-ui/modules/neture-product-operations';
const bindings = {api: {operatorServiceApprovalApi}, user: null} as unknown as NetureProductBindings;
export function useProductServiceApprovalQuery(id?: string) {return useWorkflow(id,bindings);}
