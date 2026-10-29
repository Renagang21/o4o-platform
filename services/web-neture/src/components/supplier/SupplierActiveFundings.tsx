import type { ComponentProps } from 'react';
import { SupplierActiveFundings as Shared } from '@o4o/operator-core-ui/modules/supplier-operations';
import { SupplierBindings } from '../../pages/operator/SupplierBindings';
export default function SupplierActiveFundings(props: ComponentProps<typeof Shared>) { return <SupplierBindings><Shared {...props} /></SupplierBindings>; }
