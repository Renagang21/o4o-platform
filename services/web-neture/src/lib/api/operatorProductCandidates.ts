import {api} from '../apiClient';
import {createProductCandidatesApi,type ProductCandidateListFilter} from '@o4o/operator-core-ui/modules/neture-product-operations';
export * from '@o4o/operator-core-ui/modules/neture-product-operations/operatorProductCandidates';
const candidates=createProductCandidatesApi(api).operatorProductCandidateApi;
/** A multi-service actor still operates only the Neture queue on this host. */
const scope=(filter:ProductCandidateListFilter={})=>({...filter,serviceKey:'neture',includeShared:true});
export const operatorProductCandidateApi={...candidates,
 list:(filter?:ProductCandidateListFilter)=>candidates.list(scope(filter)),
 workflowSummary:(filter:ProductCandidateListFilter)=>candidates.workflowSummary(scope(filter)),
 workflowPreview:(payload:Parameters<typeof candidates.workflowPreview>[0])=>candidates.workflowPreview({...payload,filter:scope(payload.filter)}),
 workflowExecute:(payload:Parameters<typeof candidates.workflowExecute>[0])=>candidates.workflowExecute({...payload,filter:scope(payload.filter)}),
};
