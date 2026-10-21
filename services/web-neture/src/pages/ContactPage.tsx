import { PublicServiceContact, isPublicServiceKey } from '@o4o/shared-space-ui';
import { useSearchParams } from 'react-router-dom';
import { CURRENT_HOST_PROFILE } from '../lib/hostProfile';
import { api } from '../lib/apiClient';

export default function ContactPage() {
  const [params] = useSearchParams();
  const requested = params.get('service');
  const key = CURRENT_HOST_PROFILE === 'main' ? (requested || 'neture') : CURRENT_HOST_PROFILE;
  const valid = key === 'neture' || key === 'kpa-society' || isPublicServiceKey(key);
  return valid ? <PublicServiceContact key={key} serviceKey={key === 'pharmacy' ? 'kpa-society' : key} client={api} /> : <p role="alert">문의할 서비스를 확인해 주세요.</p>;
}
