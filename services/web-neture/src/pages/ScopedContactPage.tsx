import { ScopedContactForm } from '@o4o/shared-space-ui';
import { api } from '../lib/apiClient';
import { CURRENT_HOST_PROFILE } from '../lib/hostProfile';
import ContactPage from './ContactPage';
export default function ScopedContactPage() {
  if(CURRENT_HOST_PROFILE==='main')return <ContactPage/>;
  const endpoint=CURRENT_HOST_PROFILE==='carepharm'?'/operator-inbox/business/carepharm':`/operator-inbox/service/${CURRENT_HOST_PROFILE}`;
  return <ScopedContactForm key={endpoint} endpoint={endpoint} client={api}/>;
}
