import type { ComponentProps } from 'react';
import { FundingParticipantHistory as Shared } from '@o4o/operator-core-ui/modules/funding-operations';
import { FundingBindings } from './FundingBindings';
export default function FundingParticipantHistory(props: ComponentProps<typeof Shared>) { return <FundingBindings><Shared {...props} /></FundingBindings>; }
