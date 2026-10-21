import { PublicServiceEntry, ServiceHomeHero, ServiceHomePromotion } from '@o4o/shared-space-ui';
import { Link } from 'react-router-dom';
import { SUPPLIER_ONLY_ROLES } from '../lib/role-constants';
import { api } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { ServiceApplyPanel } from '../components/auth/ServiceApplyPanel';

export default function SupplierServiceEntry() {
  const { user, isAuthenticated } = useAuth();
  const operatorOnly = user?.roles?.some(role => ['supplier:operator','supplier:admin'].includes(role)) &&
    user?.memberships?.some(m => m.serviceKey === 'supplier' && m.status === 'active') && !user?.roles?.some(role => SUPPLIER_ONLY_ROLES.includes(role));
  return <><ServiceHomeHero surface="supplier" client={api} />
    <PublicServiceEntry serviceKey="supplier" contactHref="/contact" loginHref={isAuthenticated ? undefined : '/login?returnUrl=%2F'}>
      {isAuthenticated && (operatorOnly ? <Link to="/operator/suppliers">공급자 서비스 운영 관리</Link> : <ServiceApplyPanel service="supplier" />)}
    </PublicServiceEntry><ServiceHomePromotion surface="supplier" client={api} /></>;
}
