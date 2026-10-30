import { createContext, useContext, type ReactNode } from 'react';
import type {ProductDetailProps} from './OperationProductDetail';
import type { AxiosInstance } from 'axios';
import {createProductCandidatesApi} from './operatorProductCandidates';
import { createOperatorApi } from './operator';
import { createOperatorProductApiApi } from './operatorProductApi';
import { createOperatorProductCleanupApi } from './operatorProductCleanup';
import { createOperatorCategoryApi } from './operatorCategory';
import { createOperatorCategoryMappingApi } from './operatorCategoryMapping';
import { createServiceApprovalApi } from './serviceApproval';
export function createNetureProductApi(http: AxiosInstance) {
 return {...createProductCandidatesApi(http),...createOperatorApi(http),...createOperatorProductApiApi(http),...createOperatorProductCleanupApi(http),...createOperatorCategoryApi(http),...createOperatorCategoryMappingApi(http),...createServiceApprovalApi(http)};
}
export interface NetureProductBindings { http:AxiosInstance; api: ReturnType<typeof createNetureProductApi>; user: {id?: string;roles?: string[]} | null;
 fetchGuidePageContent: (service: string,page: string) => Promise<Record<string,string>>;
 renderProductDetail?: (props: ProductDetailProps) => ReactNode; }
const Context = createContext<NetureProductBindings | null>(null);
export function NetureProductOperationsProvider({children,...value}: NetureProductBindings & {children:ReactNode}) {return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useNetureProductOperations() {const value=useContext(Context);if(!value) throw new Error('NetureProductOperationsProvider is required');return value;}
