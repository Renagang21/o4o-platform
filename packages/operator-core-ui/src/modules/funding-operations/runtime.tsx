import { createContext, useContext, type ReactNode } from 'react';
import { Link, useNavigate, type LinkProps } from 'react-router-dom';
import type { AxiosInstance } from 'axios';
import type { FundingOperatorApi } from './api';
import type { createFundingExceptionsApi } from './fundingExceptions';
interface Bindings {
  api: FundingOperatorApi & { fundingExceptionsApi: ReturnType<typeof createFundingExceptionsApi> };
  http: AxiosInstance;
  path?: (source: string) => string;
}
const Context = createContext<Bindings | null>(null);
export function FundingOperationsProvider({ children, ...bindings }: Bindings & { children: ReactNode }) {
  return <Context.Provider value={bindings}>{children}</Context.Provider>;
}
export function useFundingOperations() {
  const context = useContext(Context);
  if (!context) throw new Error('FundingOperationsProvider is required');
  return context;
}
export function OperationLink({ to, ...props }: LinkProps) {
  const { path } = useFundingOperations();

  return <Link {...props} to={path && typeof to === 'string' ? path(to) : to} />;
}
export function useOperationNavigate() {
  const navigate = useNavigate();
  const { path } = useFundingOperations();
  return (target: string) => {
    const mapped = path ? path(target) : target;
    if (/^https:\/\//.test(mapped)) window.location.assign(mapped);
    else navigate(mapped);
  };
}
