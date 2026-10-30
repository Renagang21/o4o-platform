import type { ComponentProps } from 'react';
import { SupplierReviewRequestsPanel as Shared } from '@o4o/operator-core-ui/modules/supplier-operations';
import { SupplierBindings } from '../../pages/operator/SupplierBindings';
export default function SupplierReviewRequestsPanel(props: ComponentProps<typeof Shared>) { return <SupplierBindings><Shared {...props} /></SupplierBindings>; }
