import { OperatorInbox } from '@o4o/operator-core-ui';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';
export default function OperatorInboxPage(){const {user}=useAuth();return user?<OperatorInbox key={user.id} client={api} endpoint="/operator-inbox/service/lecture"/>:null;}
