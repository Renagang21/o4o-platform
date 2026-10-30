import { BUSINESS_SITE } from '../../config/businessSite';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { businessPath, type BusinessSection } from './api';
import BusinessWorkspace from './BusinessWorkspace';

/** Nested generic routes rank above a wildcard; redirect at their parent too. */
export function LegacyAwareBusinessWorkspace() {
  const { businessKey } = useParams();
  return businessKey === BUSINESS_SITE.key && ['pharmacy', 'carepharm'].includes(businessKey ?? '') ? <PharmacyLegacyRedirect /> : <BusinessWorkspace />;
}

export function pharmacyLegacyPath(pathname: string, businessKey = 'pharmacy'): string {
  const prefix = `/businesses/${businessKey}`;
  const suffix = pathname.slice(prefix.length).replace(/^\//, '');
  if (!suffix) return '/';
  if (suffix === 'home-presentation' && businessKey === 'carepharm') return '/operator/home-presentation/carepharm';
  const [section, ...rest] = suffix.split('/');
  if (!['participation', 'materials', 'forum', 'tools'].includes(section)) return '/404';
  return businessPath(businessKey, section as BusinessSection) + (rest.length ? `/${rest.join('/')}` : '');
}

export default function PharmacyLegacyRedirect() {
  const location = useLocation();
  return <Navigate to={pharmacyLegacyPath(location.pathname, BUSINESS_SITE.key) + location.search + location.hash} state={location.state} replace />;
}
