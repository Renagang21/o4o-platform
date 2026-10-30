import CandidateConflictDrawer from '../o4o-product-db/CandidateConflictDrawer';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '@o4o/auth-context';
import {
 NetureProductOperationsProvider, createNetureProductApi,
 ProductDataCleanupPage, CategoryMappingRulesPage, OperatorProductApprovalPage, AllRegisteredProductsPage, ProductServiceApprovalPage, ProductCandidateReviewPage,
} from '@o4o/operator-core-ui/modules/neture-product-operations';
const sourceApi=createNetureProductApi(authClient.api);
const candidates=sourceApi.operatorProductCandidateApi;
const scopeFilter=(filter:Parameters<typeof candidates.list>[0])=>({...filter,serviceKey:'neture',includeShared:true});
const api={...sourceApi,operatorProductCandidateApi:{...candidates,
 list:(filter:Parameters<typeof candidates.list>[0])=>candidates.list(scopeFilter(filter)),
 workflowSummary:(filter:Parameters<typeof candidates.workflowSummary>[0])=>candidates.workflowSummary(scopeFilter(filter)),
 workflowPreview:(payload:Parameters<typeof candidates.workflowPreview>[0])=>candidates.workflowPreview({...payload,filter:scopeFilter(payload.filter)}),
 workflowExecute:(payload:Parameters<typeof candidates.workflowExecute>[0])=>candidates.workflowExecute({...payload,filter:scopeFilter(payload.filter)}),
}};
const fetchGuidePageContent = async (serviceKey:string,pageKey:string) => (await authClient.api.get('/guide/contents',{params:{serviceKey,pageKey}})).data.data.sections;
const screens={cleanup:ProductDataCleanupPage,'category-mapping':CategoryMappingRulesPage,'product-approvals':OperatorProductApprovalPage,candidates:ProductCandidateReviewPage,products:AllRegisteredProductsPage,'service-product-approvals':ProductServiceApprovalPage};
export type CentralNetureProductArea = keyof typeof screens;
export default function CentralNetureProductOperations({area}: {area:CentralNetureProductArea}) {
 const {user}=useAuth();const Screen=screens[area];
 return <NetureProductOperationsProvider renderCandidateRegistrationReview={props=><CandidateConflictDrawer {...props} open />} http={authClient.api} fetchGuidePageContent={fetchGuidePageContent} api={api} user={{id:String(user.id),roles:user.roles}}><Screen /></NetureProductOperationsProvider>;
}
