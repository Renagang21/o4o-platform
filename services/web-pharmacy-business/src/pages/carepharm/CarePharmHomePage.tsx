import { CarePharmHome, CAREPHARM_HERO, ServiceHomeHero, COOPERATION_EXTENSIONS, type CooperationView } from '@o4o/shared-space-ui';
import { requestServiceHandoff } from '@o4o/auth-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authClient } from '../../contexts/AuthContext';
const api = authClient.api;
import { CarePharmNoticeView } from '@o4o/shared-space-ui';
export default function CarePharmHomePage({ view = 'home' }: { view?: CooperationView }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  return <CarePharmHome view={view} client={api} accountId={isAuthenticated ? user?.id : undefined}
    onLogin={() => navigate('/login?returnTo=' + encodeURIComponent(location.pathname + location.search))}
    onEnterStore={() => requestServiceHandoff(api, { workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: `/select-store?returnTo=${encodeURIComponent(COOPERATION_EXTENSIONS.carepharm.model.storePath)}` })}
    notices={<CarePharmNoticeView client={api} />}
    hero={<ServiceHomeHero {...CAREPHARM_HERO} client={api} />} />;
}
