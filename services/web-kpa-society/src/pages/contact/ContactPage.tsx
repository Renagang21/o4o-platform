import { PublicServiceContact } from '@o4o/shared-space-ui';
import { authClient } from '../../contexts/AuthContext';
import { BUSINESS_SITE } from '../../config/businessSite';
export function ContactPage() {
  return <PublicServiceContact serviceKey={BUSINESS_SITE.key === 'pharmacy' ? 'kpa-society' : BUSINESS_SITE.key} client={authClient.api} />;
}

export default ContactPage;
