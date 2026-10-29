import type { ReactNode } from 'react';
import { SupplierOperationsProvider } from '@o4o/operator-core-ui/modules/supplier-operations';
import { operatorSupplierApi, adminSupplierApi } from '../../lib/api/admin';
import { supplierReviewApi } from '../../lib/api/supplierReview';
import { api as http } from '../../lib/apiClient';
const api = { operatorSupplierApi, adminSupplierApi, supplierReviewApi };
export function SupplierBindings({ children }: { children: ReactNode }) {
  return <SupplierOperationsProvider api={api} http={http}>{children}</SupplierOperationsProvider>;
}
