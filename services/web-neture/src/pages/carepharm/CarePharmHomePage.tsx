import { useLocation } from 'react-router-dom';
import { COOPERATION_MODELS, CooperationMemberSpace, type CooperationView } from '@o4o/shared-space-ui';
import { requestServiceHandoff } from '@o4o/auth-react';
import { useAuth, useLoginModal } from '../../contexts';
import { api } from '../../lib/apiClient';

/** CarePharm is an independent cooperation service using the shared Pharmacy contracts. */
export default function CarePharmHomePage({ view = 'home' }: { view?: CooperationView }) {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();
  const location = useLocation();
  return <CooperationMemberSpace model={COOPERATION_MODELS.carepharm} client={api}
    accountId={isAuthenticated ? user?.id : undefined} view={view}
    onLogin={() => openLoginModal(location.pathname + location.search)}
    onEnterStore={async () => window.location.assign(await requestServiceHandoff(api, {
      workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: COOPERATION_MODELS.carepharm.storePath,
    }))} />;
}
