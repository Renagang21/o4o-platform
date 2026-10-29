import type { ComponentProps } from 'react';
import { SupplierRegulatedCategoriesModal as Shared } from '@o4o/operator-core-ui/modules/supplier-operations';
import { SupplierBindings } from '../../pages/operator/SupplierBindings';
export default function SupplierRegulatedCategoriesModal(props: ComponentProps<typeof Shared>) { return <SupplierBindings><Shared {...props} /></SupplierBindings>; }
export type { RegulatedCategoryReviewApi } from '@o4o/operator-core-ui/modules/supplier-operations';
