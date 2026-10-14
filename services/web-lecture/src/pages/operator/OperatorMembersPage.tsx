import { useNavigate, useParams } from 'react-router-dom';
import { ServiceMembersWorkspace } from '@o4o/operator-core-ui/modules/members';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../contexts/AuthContext';

const adapter = {
  get: async (path: string) => (await api.get(path)).data,
  post: async (path: string, data?: unknown) => (await api.post(path, data)).data,
  put: async (path: string, data?: unknown) => (await api.put(path, data)).data,
  patch: async (path: string, data?: unknown) => (await api.patch(path, data)).data,
  delete: async (path: string) => (await api.delete(path)).data,
};
export default function OperatorMembersPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  return <ServiceMembersWorkspace serviceKey="lecture" basePath="/operator/members" api={adapter} roles={user?.roles ?? []} userId={id} navigate={navigate} />;
}
