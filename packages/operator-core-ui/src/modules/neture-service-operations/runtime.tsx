import {createAdminSettlementApi} from './settlement-api';
import {createSettlementNotificationApi} from './settlement-notification';
import { createContext, useContext, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import type { AxiosInstance } from 'axios';
import { createNetureServiceApi } from './api';
import { createHomepageCmsApi } from './cms-api';
export interface NetureServiceBindings {
  http: AxiosInstance;
  adminSettlementApi: ReturnType<typeof createAdminSettlementApi>;
  settlementNotificationApi: ReturnType<typeof createSettlementNotificationApi>;
  api: ReturnType<typeof createNetureServiceApi>;
  homepageCmsApi: ReturnType<typeof createHomepageCmsApi>;
  path: (path: string) => string;
}
const Context = createContext<NetureServiceBindings | null>(null);
export function NetureServiceOperationsProvider({ children, ...bindings }: NetureServiceBindings & {children: ReactNode}) {
  return <Context.Provider value={bindings}>{children}</Context.Provider>;
}
export function useNetureServiceOperations() {
  const value = useContext(Context);
  if (!value) throw new Error('NetureServiceOperationsProvider is required');
  return value;
}
export function OperationLink({to,...props}: LinkProps) {
  const { path } = useNetureServiceOperations();
  return <Link {...props} to={typeof to === 'string' ? path(to) : to} />;
}
