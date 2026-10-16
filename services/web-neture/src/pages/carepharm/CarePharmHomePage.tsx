import { useLocation } from 'react-router-dom';
import { COOPERATION_MODELS, CooperationMemberSpace, ServiceHomeHero, ServiceHomePromotion, type CooperationView } from '@o4o/shared-space-ui';
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
    presentation={<ServiceHomeHero surface="carepharm" client={api} eyebrow="CarePharm" title={['만성질환관리']} description={['참여 약국과 함께하는 만성질환관리']} />}
    promotion={<ServiceHomePromotion surface="carepharm" client={api} />}
    onLogin={() => openLoginModal(location.pathname + location.search)}
    onEnterStore={() => requestServiceHandoff(api, {
      workspace: 'store', origin: 'https://store.neture.co.kr', returnPath: `/select-store?returnTo=${encodeURIComponent(COOPERATION_MODELS.carepharm.storePath)}`,
    })} />;
}
