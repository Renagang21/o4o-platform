import type { ComponentProps } from 'react';
import { FundingParticipantsSection as Shared } from '@o4o/operator-core-ui/modules/funding-operations';
import { FundingBindings } from './FundingBindings';
export default function FundingParticipantsSection(props: ComponentProps<typeof Shared>) { return <FundingBindings><Shared {...props} /></FundingBindings>; }
export { fundingParticipantFilters } from '@o4o/operator-core-ui/modules/funding-operations';
