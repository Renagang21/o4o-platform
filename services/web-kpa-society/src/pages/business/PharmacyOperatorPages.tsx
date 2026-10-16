import { BUSINESS_SITE } from '../../config/businessSite';
import { Link } from 'react-router-dom';
import { OperatorSemiFranchisePage, SemiFranchiseContentFormPage } from '@o4o/operator-core-ui/modules/pharmacy-management';
import { useAuth } from '../../contexts/AuthContext';

export function PharmacyOperatorPage() {
  const { user } = useAuth();
  if (!user) return null;
  return <OperatorSemiFranchisePage key={user.id} businessKey={BUSINESS_SITE.key}
    forumHref={() => '/community'} renderBusinessHome={() => <>
      <Link to="/">사업 홈 확인</Link><Link to="/home-presentation">Hero · 광고 관리</Link>
    </>} />;
}
export function PharmacyOperatorContentPage() {
  const { user } = useAuth();
  return user ? <SemiFranchiseContentFormPage key={user.id} businessKey={BUSINESS_SITE.key} /> : null;
}
