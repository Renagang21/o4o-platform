import { useNavigate, useParams } from 'react-router-dom';
import { createUserDetailApiAdapter } from '@o4o/ui';
import { ServiceMembersWorkspace } from '@o4o/operator-core-ui/modules/members';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/apiClient';
import type { SubdomainOperatorKey } from '../../lib/role-constants';

const adapter = createUserDetailApiAdapter(api);
export default function ServiceMembersPage({ serviceKey }: Readonly<{ serviceKey: SubdomainOperatorKey }>) {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  return <ServiceMembersWorkspace serviceKey={serviceKey} basePath={`/operator/service-members/${serviceKey}`} api={adapter} roles={user?.roles ?? []} userId={id} navigate={navigate} />;
}
