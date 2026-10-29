import {adminSettlementApi} from '../../lib/api/admin';
import {settlementNotificationApi} from '../../lib/api/settlement-notification';
import type { ReactNode } from 'react';
import { NetureServiceOperationsProvider } from '@o4o/operator-core-ui/modules/neture-service-operations';
import { operatorRegistrationApi, operatorContactApi } from '../../lib/api/admin';
import { homepageCmsApi } from '../../lib/api/content';
import { api as http } from '../../lib/apiClient';
const api = { operatorRegistrationApi, operatorContactApi };
const path = (value: string) => value;
export function NetureServiceBindings({children}: {children: ReactNode}) {
 return <NetureServiceOperationsProvider adminSettlementApi={adminSettlementApi} settlementNotificationApi={settlementNotificationApi} api={api} http={http} homepageCmsApi={homepageCmsApi} path={path}>{children}</NetureServiceOperationsProvider>;
}
