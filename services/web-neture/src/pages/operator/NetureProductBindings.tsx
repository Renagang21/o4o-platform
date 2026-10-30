import {api as http} from '../../lib/apiClient';
import ProductDetailDrawer from '../supplier/ProductDetailDrawer';
import {fetchGuidePageContent} from '../../api/guideContent';
import type { ReactNode } from 'react';
import { NetureProductOperationsProvider } from '@o4o/operator-core-ui/modules/neture-product-operations';
import { operatorAllOffersApi, operatorSupplyApi } from '../../lib/api/operator';
import { operatorProductApi } from '../../lib/api/operatorProductApi';
import { productCleanupApi } from '../../lib/api/operatorProductCleanup';
import { operatorCategoryApi } from '../../lib/api/operatorCategory';
import { operatorCategoryMappingApi } from '../../lib/api/operatorCategoryMapping';
import { operatorServiceApprovalApi } from '../../lib/api/serviceApproval';
import {operatorProductCandidateApi} from '../../lib/api/operatorProductCandidates';
const renderProductDetail = (props: React.ComponentProps<typeof ProductDetailDrawer>) => <ProductDetailDrawer {...props} />;
const api={operatorProductCandidateApi,operatorAllOffersApi,operatorSupplyApi,operatorProductApi,productCleanupApi,operatorCategoryApi,operatorCategoryMappingApi,operatorServiceApprovalApi};
export function NetureProductBindings({children, user = null}: {children:ReactNode; user?: {id?: string;roles?: string[]} | null}) {return <NetureProductOperationsProvider canOpenProductTrash={user?.roles?.some(role=>['neture:operator','neture:admin','platform:super_admin'].includes(role)) ?? false} http={http} fetchGuidePageContent={fetchGuidePageContent} renderProductDetail={renderProductDetail} api={api} user={user}>{children}</NetureProductOperationsProvider>;}
