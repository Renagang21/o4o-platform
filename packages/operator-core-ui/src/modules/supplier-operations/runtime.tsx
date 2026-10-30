import { createContext, useContext, type ReactNode } from 'react';
import type { AxiosInstance } from 'axios';
import type { createSupplierOperatorApi } from './api';
import type { createSupplierReviewApi } from './supplierReview';
interface Bindings {
  api: ReturnType<typeof createSupplierOperatorApi> & { supplierReviewApi: ReturnType<typeof createSupplierReviewApi> };
  http: AxiosInstance;
}
const Context = createContext<Bindings | null>(null);
export function SupplierOperationsProvider({ children, ...bindings }: Bindings & { children: ReactNode }) {
  return <Context.Provider value={bindings}>{children}</Context.Provider>;
}
export function useSupplierOperations() {
  const context = useContext(Context);
  if (!context) throw new Error('SupplierOperationsProvider is required');
  return context;
}
