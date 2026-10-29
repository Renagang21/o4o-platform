import type {ReactNode} from 'react';
import type {NavigateFunction} from 'react-router-dom';
import {authClient} from '@o4o/auth-client';
import {AiReportPage} from '@o4o/ui';
import {CommunityHomeManagementPage,CommunityManagementWorkspace,createCommunityHomeApi} from '@o4o/operator-core-ui';
import {ServiceMembersWorkspace} from '@o4o/operator-core-ui/modules/members';
import {PharmacyMembershipReviewPage} from '@o4o/operator-core-ui/modules/pharmacy-management';
import CentralSharedWork from './CentralSharedWork';
import CentralOperatorInbox from './CentralOperatorInbox';
import CentralPharmacistQualifications from './CentralPharmacistQualifications';
import CentralLectureOperations from './CentralLectureOperations';
import CentralFundingOperations from './CentralFundingOperations';
import CentralSupplierOperations from './CentralSupplierOperations';
import CentralPartnerModeration from './CentralPartnerModeration';
import CentralFederationOperations from './CentralFederationOperations';
import CentralForumOperations from './CentralForumOperations';
import CentralCommunityForums from './CentralCommunityForums';
import CentralNetureServiceOperations,{type CentralNetureServiceArea} from './CentralNetureServiceOperations';
import CentralNetureProductOperations,{type CentralNetureProductArea} from './CentralNetureProductOperations';
import CentralNetureStores from './CentralNetureStores';
import CentralNetureAnalytics from './CentralNetureAnalytics';
import {AdminMemberManagementPage} from '@o4o/operator-core-ui/modules/neture-service-operations';
import {AdminServiceApprovalPage,createAdminServiceApprovalApi} from '@o4o/operator-core-ui/modules/neture-product-operations';
interface Context {service:string;area:string;actorId:string;roles:string[];menuKeys:string[];courseId?:string;id?:string;userId?:string;search:string;navigate:NavigateFunction;}
type Renderer = (context:Context)=>ReactNode;
const http=authClient.api;
const serviceApprovalApi=createAdminServiceApprovalApi(http);
const editorialApi=createCommunityHomeApi(http);
const memberApi={
 get:(path:string)=>http.get(path).then(r=>r.data),
 post:(path:string,data?:unknown)=>http.post(path,data).then(r=>r.data),
 put:(path:string,data?:unknown)=>http.put(path,data).then(r=>r.data),
 patch:(path:string,data?:unknown)=>http.patch(path,data).then(r=>r.data),
 delete:(path:string)=>http.delete(path).then(r=>r.data),
};
const renderers:Record<string,Renderer>={
 'neture.members':c=><CentralPharmacistQualifications actorId={c.actorId} directory initialQuery={c.userId ?? ''} onReview={c.menuKeys.includes('neture.qualifications') ? id=>c.navigate(`/operations/neture/qualifications?q=${encodeURIComponent(id)}`):undefined} />,
 'neture.qualifications':c=><CentralPharmacistQualifications key={c.search} actorId={c.actorId} initialQuery={new URLSearchParams(c.search).get('q') ?? ''} />,
 'neture.service-members':c=><ServiceMembersWorkspace serviceKey="neture" basePath="/operations/neture/service-members" api={memberApi} roles={c.roles} userId={c.userId} navigate={c.navigate} />,
 'neture.pharmacies':()=> <PharmacyMembershipReviewPage />,
 'neture.stores':()=> <CentralNetureStores />,
 'neture.analytics':()=> <CentralNetureAnalytics />,
 'neture.membership-cleanup':()=> <AdminMemberManagementPage api={http} />,
 'neture.service-approval-management':()=> <AdminServiceApprovalPage api={serviceApprovalApi} />,
 'neture.ai-report':()=> <AiReportPage config={{mode:'empty',theme:'green',assetTypes:[],infoBannerText:'실제 집계 데이터가 연결되면 운영 리포트를 제공합니다.',emptyStateDescription:'분석 인프라 연동 준비 중입니다.'}} />,
 'funding.funding':c=><CentralFundingOperations detail={!!c.id} />,
 'supplier.suppliers':()=> <CentralSupplierOperations />,
 'supplier.governance':()=> <CentralSupplierOperations governance />,
 'community.forums':()=> <CentralCommunityForums />,
 'community.editorial':()=> <CommunityHomeManagementPage api={editorialApi} publicOrigin="https://community.neture.co.kr" />,
 'pharmcoop.federation':c=><CentralFederationOperations canDecide={c.roles.includes('platform:super_admin') || c.roles.includes('neture:pharmcoop_admin')} />,
};
for(const area of ['settlements','notifications','community-advertising','actions','applications','legacy-contact','cms','orders'] as CentralNetureServiceArea[])
 renderers[`neture.${area}`]=()=> <CentralNetureServiceOperations area={area} />;
for(const area of ['cleanup','category-mapping','product-approvals','candidates','products','service-product-approvals'] as CentralNetureProductArea[])
 renderers[`neture.${area}`]=()=> <CentralNetureProductOperations area={area} />;
for(const area of ['forums','forum-delete','forum-deleted','forum-analytics'])
 renderers[`neture.${area}`]=()=> <CentralForumOperations area={area} />;
for(const area of ['boards','erase-members','erase-boards'])
 renderers[`community.${area}`]=()=> <CommunityManagementWorkspace api={http} kind={area==='erase-members'?'members':'boards'} permanent={area!=='boards'} />;
for(const area of ['courses','instructors','certificates'])
 renderers[`lecture.${area}`]=c=> <CentralLectureOperations area={area} courseId={c.courseId} />;
for(const area of ['reports','posts','members','boards','events'])
 renderers[`partner-support.${area}`]=c=> <CentralPartnerModeration userId={c.actorId} area={area} admin={c.roles.includes('platform:super_admin') || c.roles.includes('partner-support:admin')} />;
for(const service of ['neture','supplier','funding','lecture','community','pharmcoop']) {
 renderers[`${service}.inbox`]=()=> <CentralOperatorInbox serviceKey={service} />;
 if(!['neture','pharmcoop'].includes(service)) renderers[`${service}.members`]=c=> <ServiceMembersWorkspace serviceKey={service} basePath={`/operations/${service}/members`} api={memberApi} roles={c.roles} userId={c.userId} navigate={c.navigate} allowDestructiveActions={false} />;
 for(const area of (service==='pharmcoop'?['home']:['home','legal','contact-settings',...(service==='neture'?['guides']:[]),...(service==='lecture'?['contact']:[])]))
  renderers[`${service}.${area}`]=()=> <CentralSharedWork serviceKey={service} area={area} />;
}
export const CENTRAL_RENDERED_MENU_KEYS=Object.keys(renderers);
/** Entry already checks live grants; an unknown surface never falls through to another work screen. */
export function renderCentralOperation(context:Context) {
 const render=renderers[`${context.service}.${context.area}`];
 return render ? render(context) : <p role="alert">연결된 운영 업무를 찾을 수 없습니다.</p>;
}
