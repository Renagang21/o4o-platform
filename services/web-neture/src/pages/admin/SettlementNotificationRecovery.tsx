import type {ComponentProps} from 'react';
import {SettlementNotificationRecovery as Workspace,SettlementNotificationStatus as Status} from '@o4o/operator-core-ui/modules/neture-service-operations';
import {NetureServiceBindings} from '../operator/NetureServiceBindings';
export function SettlementNotificationStatus(props:ComponentProps<typeof Status>){return <NetureServiceBindings><Status {...props} /></NetureServiceBindings>;}
export default function SettlementNotificationRecovery(props:ComponentProps<typeof Workspace>){return <NetureServiceBindings><Workspace {...props} /></NetureServiceBindings>;}
