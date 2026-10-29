import {api} from './client.js';
import {createSettlementNotificationApi} from '@o4o/operator-core-ui/modules/neture-service-operations';
export * from '@o4o/operator-core-ui/modules/neture-service-operations/settlement-notification';
export const settlementNotificationApi=createSettlementNotificationApi(api);
