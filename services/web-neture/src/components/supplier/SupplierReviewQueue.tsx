import type { ComponentProps } from 'react';
import { SupplierReviewQueue as Shared } from '@o4o/operator-core-ui/modules/supplier-operations';
import { SupplierBindings } from '../../pages/operator/SupplierBindings';
export default function SupplierReviewQueue(props: ComponentProps<typeof Shared>) { return <SupplierBindings><Shared {...props} /></SupplierBindings>; }
