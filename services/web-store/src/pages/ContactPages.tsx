import { OperatorInbox } from '@o4o/operator-core-ui';
import { ScopedContactForm } from '@o4o/shared-space-ui';
import { api } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';
export function ContactPage(){return <ScopedContactForm client={api} endpoint="/operator-inbox/service/store" title="내 매장 이용 문의" privacyHref="https://neture.co.kr/privacy"/>;}
export function OperatorInboxPage(){const {user}=useAuth();return user?<OperatorInbox key={user.id} client={api} endpoint="/operator-inbox/service/store"/>:<p>로그인 후 운영 권한을 확인해 주세요.</p>;}
