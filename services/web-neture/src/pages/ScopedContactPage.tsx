import { ScopedContactForm } from '@o4o/shared-space-ui';
import { api } from '../lib/apiClient';
import { CURRENT_HOST_PROFILE } from '../lib/hostProfile';
import ContactPage from './ContactPage';
export default function ScopedContactPage() {
  if(CURRENT_HOST_PROFILE!=='carepharm')return <ContactPage/>;
  const endpoint='/operator-inbox/business/carepharm';
  return <ScopedContactForm key={endpoint} endpoint={endpoint} client={api}/>;
}
