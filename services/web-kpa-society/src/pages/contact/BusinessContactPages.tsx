import { useParams } from 'react-router-dom';
import { OperatorInbox } from '@o4o/operator-core-ui';
import { ScopedContactForm } from '@o4o/shared-space-ui';
import { BUSINESS_SITE } from '../../config/businessSite';
import { authClient, useAuth } from '../../contexts/AuthContext';
export function BusinessContactPage(){return <ScopedContactForm client={authClient.api} endpoint={`/operator-inbox/business/${BUSINESS_SITE.key}`} title={`${BUSINESS_SITE.name} 문의하기`}/>;}
export function BusinessInboxPage(){const {businessKey=BUSINESS_SITE.key}=useParams();const {user}=useAuth();if(!user)return <p>로그인 후 담당 운영 권한을 확인해 주세요.</p>;return <OperatorInbox key={`${user.id}:${businessKey}`} client={authClient.api} endpoint={`/operator-inbox/business/${encodeURIComponent(businessKey)}`}/>;}
