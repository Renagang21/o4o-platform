import { OperatorInbox } from '@o4o/operator-core-ui';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/apiClient';
export default function OperatorInboxPage({serviceKey}:{serviceKey?:string}) {
  const {businessKey}=useParams(); const {user}=useAuth();
  if(!user)return <p>로그인 후 담당 운영 권한을 확인해 주세요.</p>;
  const endpoint=businessKey?`/operator-inbox/business/${encodeURIComponent(businessKey)}`:`/operator-inbox/service/${serviceKey??'neture'}`;
  return <OperatorInbox key={`${user.id}:${endpoint}`} endpoint={endpoint} client={api}/>;
}
