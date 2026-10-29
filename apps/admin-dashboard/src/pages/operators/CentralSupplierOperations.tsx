import { authClient } from '@o4o/auth-client';
import { createSupplierOperatorApi, createSupplierReviewApi, SupplierOperationsProvider, OperatorSupplierApprovalPage, AdminSupplierGovernancePage } from '@o4o/operator-core-ui/modules/supplier-operations';
const http = authClient.api;
const api = { ...createSupplierOperatorApi(http), supplierReviewApi: createSupplierReviewApi(http) };
export default function CentralSupplierOperations({ governance = false }: { governance?: boolean }) {
  return <SupplierOperationsProvider api={api} http={http}>{governance ? <AdminSupplierGovernancePage /> : <OperatorSupplierApprovalPage />}</SupplierOperationsProvider>;
}
