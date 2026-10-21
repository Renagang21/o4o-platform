import { PublicServiceContact } from '@o4o/shared-space-ui';
import { api } from '../lib/apiClient';
export default function ContactPage() {
  return <main className="page"><PublicServiceContact serviceKey="lecture" client={api} privacyHref="/privacy" /></main>;
}
