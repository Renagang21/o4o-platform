import type { ComponentProps } from 'react';
import { FundingOfflineHistory as Shared } from '@o4o/operator-core-ui/modules/funding-operations';
import { FundingBindings } from './FundingBindings';
export default function FundingOfflineHistory(props: ComponentProps<typeof Shared>) { return <FundingBindings><Shared {...props} /></FundingBindings>; }
