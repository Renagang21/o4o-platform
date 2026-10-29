import { authClient } from '@o4o/auth-client';
import { useAuth } from '@o4o/auth-context';
import {
 NetureProductOperationsProvider, createNetureProductApi,
 ProductDataCleanupPage, CategoryMappingRulesPage, OperatorProductApprovalPage, AllRegisteredProductsPage, ProductServiceApprovalPage, ProductCandidateReviewPage,
} from '@o4o/operator-core-ui/modules/neture-product-operations';
const sourceApi=createNetureProductApi(authClient.api);
const api={...sourceApi,operatorProductCandidateApi:{...sourceApi.operatorProductCandidateApi,list:(filter:Parameters<typeof sourceApi.operatorProductCandidateApi.list>[0])=>sourceApi.operatorProductCandidateApi.list({...filter,serviceKey:'neture'})}};
const fetchGuidePageContent = async (serviceKey:string,pageKey:string) => (await authClient.api.get('/guide/contents',{params:{serviceKey,pageKey}})).data.data.sections;
const screens={cleanup:ProductDataCleanupPage,'category-mapping':CategoryMappingRulesPage,'product-approvals':OperatorProductApprovalPage,candidates:ProductCandidateReviewPage,products:AllRegisteredProductsPage,'service-product-approvals':ProductServiceApprovalPage};
export type CentralNetureProductArea = keyof typeof screens;
export default function CentralNetureProductOperations({area}: {area:CentralNetureProductArea}) {
 const {user}=useAuth();const Screen=screens[area];
 return <NetureProductOperationsProvider http={authClient.api} fetchGuidePageContent={fetchGuidePageContent} api={api} user={{id:String(user.id),roles:user.roles}}><Screen /></NetureProductOperationsProvider>;
}
