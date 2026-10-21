import { ServiceOperatorManagement } from '@o4o/operator-core-ui';
import { authClient, useAuth } from '../../contexts/AuthContext';
import { BUSINESS_SITE } from '../../config/businessSite';
import { Link } from 'react-router-dom';
import { OperatorSemiFranchisePage, SemiFranchiseContentFormPage } from '@o4o/operator-core-ui/modules/pharmacy-management';

export function PharmacyOperatorPage() {
  const { user } = useAuth();
  if (!user) return null;
  return <>{user.roles?.includes(`neture:${BUSINESS_SITE.key}_admin`) && <ServiceOperatorManagement key={`${user.id}:${BUSINESS_SITE.key}`} client={authClient.api} scope={BUSINESS_SITE.key} />}<OperatorSemiFranchisePage contactHref={key => ["pharmacy","carepharm","megapharm","pharmcoop"].includes(key) ? `https://neture.co.kr/operator/service-contact/${key === "pharmacy" ? "kpa-society" : key}` : undefined} key={user.id} businessKey={BUSINESS_SITE.key}
    forumHref={() => '/community'} renderBusinessHome={() => <>
      <Link to="/">사업 홈 확인</Link><Link to="/home-presentation">Hero · 광고 관리</Link>
    </>} /></>;
}
export function PharmacyOperatorContentPage() {
  const { user } = useAuth();
  return user ? <SemiFranchiseContentFormPage key={user.id} businessKey={BUSINESS_SITE.key} /> : null;
}
