import { Navigate, useLocation, useParams } from 'react-router-dom';
import { businessPath, type BusinessSection } from './api';
import BusinessWorkspace from './BusinessWorkspace';

/** Nested generic routes rank above a wildcard; redirect at their parent too. */
export function LegacyAwareBusinessWorkspace() {
  const { businessKey } = useParams();
  return businessKey === 'pharmacy' ? <PharmacyLegacyRedirect /> : <BusinessWorkspace />;
}

export function pharmacyLegacyPath(pathname: string): string {
  const prefix = '/businesses/pharmacy';
  const suffix = pathname.slice(prefix.length).replace(/^\//, '');
  if (!suffix) return '/';
  const [section, ...rest] = suffix.split('/');
  if (!['participation', 'materials', 'forum', 'tools'].includes(section)) return '/404';
  return businessPath('pharmacy', section as BusinessSection) + (rest.length ? `/${rest.join('/')}` : '');
}

export default function PharmacyLegacyRedirect() {
  const location = useLocation();
  return <Navigate to={pharmacyLegacyPath(location.pathname) + location.search + location.hash} state={location.state} replace />;
}
