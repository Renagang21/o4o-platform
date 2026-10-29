import {CommunityHomeConsole} from '@o4o/operator-core-ui/modules/community-home';
import { authClient } from '@o4o/auth-client';
import {
  AdminSettlementsPage, createAdminSettlementApi, createSettlementNotificationApi, NetureServiceOperationsProvider, createNetureServiceApi, createHomepageCmsApi, createNetureCommunityApi,
  RegistrationRequestsPage, OperatorContactMessagesPage, HomepageCmsPage, OrdersManagementPage, OperatorActionQueuePage, EmailNotificationSettingsPage,
} from '@o4o/operator-core-ui/modules/neture-service-operations';
import { centralTaskHref } from './central-operation-navigation';
const http = authClient.api;
const api = createNetureServiceApi(http);
const homepageCmsApi = createHomepageCmsApi(http);
const path = (value: string) => value === '/operator' ? '/operations' : centralTaskHref('neture', value);
const communityClient=createNetureCommunityApi(http).communityManageApi;
function CommunityAdvertising() {return <CommunityHomeConsole client={communityClient} tableIdPrefix="central-neture-community" title="커뮤니티 광고·스폰서" subtitle="O4O 커뮤니티 안내 콘텐츠 운영" accent="blue" />;}
const adminSettlementApi=createAdminSettlementApi(http);
const settlementNotificationApi=createSettlementNotificationApi(http);
const screens = {settlements: AdminSettlementsPage,notifications: EmailNotificationSettingsPage,'community-advertising': CommunityAdvertising,actions: OperatorActionQueuePage, applications: RegistrationRequestsPage, 'legacy-contact': OperatorContactMessagesPage, cms: HomepageCmsPage, orders: OrdersManagementPage};
export default function CentralNetureServiceOperations({area}: {area: keyof typeof screens}) {
 const Screen = screens[area];
 return <NetureServiceOperationsProvider adminSettlementApi={adminSettlementApi} settlementNotificationApi={settlementNotificationApi} api={api} http={http} homepageCmsApi={homepageCmsApi} path={path}><Screen /></NetureServiceOperationsProvider>;
}
export type CentralNetureServiceArea = keyof typeof screens;
