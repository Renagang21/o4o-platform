import type { ComponentProps } from 'react';
import { SupplierDetailBody as Shared } from '@o4o/operator-core-ui/modules/supplier-operations';
import { SupplierBindings } from './SupplierBindings';
export function SupplierDetailBody(props: ComponentProps<typeof Shared>) { return <SupplierBindings><Shared {...props} /></SupplierBindings>; }
