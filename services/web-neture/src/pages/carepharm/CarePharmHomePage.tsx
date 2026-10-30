import { CarePharmHome, CAREPHARM_HERO, ServiceHomeHero, COOPERATION_EXTENSIONS, type CooperationView } from '@o4o/shared-space-ui';
import { requestServiceHandoff } from '@o4o/auth-react';
import { useLocation } from 'react-router-dom';
import { useAuth, useLoginModal } from '../../contexts';
import { api } from '../../lib/apiClient';
import { CarePharmNotices } from './CarePharmNotices';
export default function CarePharmHomePage({ view = 'home' }: { view?: CooperationView }) {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();
  const location = useLocation();
  return <CarePharmHome view={view} client={api} accountId={isAuthenticated ? user?.id : undefined}
    onLogin={() => openLoginModal(location.pathname + location.search)}
    onEnterStore={() => requestServiceHandoff(api, { workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: `/select-store?returnTo=${encodeURIComponent(COOPERATION_EXTENSIONS.carepharm.model.storePath)}` })}
    notices={<CarePharmNotices />}
    hero={<ServiceHomeHero {...CAREPHARM_HERO} client={api} />} />;
}
