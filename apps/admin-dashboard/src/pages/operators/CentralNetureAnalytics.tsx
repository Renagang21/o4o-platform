import {authClient} from '@o4o/auth-client';
import {OperatorAnalyticsPage, type OperatorAnalyticsClient} from '@o4o/operator-core-ui/modules/operator-analytics';
const client:OperatorAnalyticsClient={
 getSummary:async params=>(await authClient.api.get('/operator/analytics/summary',{params})).data,
 getActions:async params=>(await authClient.api.get('/operator/analytics/actions',{params})).data,
 getInsight:async params=>(await authClient.api.get('/operator/analytics/insight',{params})).data,
};
export default function CentralNetureAnalytics() {return <OperatorAnalyticsPage client={client} serviceKey="neture" tableId="central-neture-analytics" actionLabels={{}} activePeriodClass="bg-blue-700 border-blue-700" barClass="bg-blue-500" />;}
