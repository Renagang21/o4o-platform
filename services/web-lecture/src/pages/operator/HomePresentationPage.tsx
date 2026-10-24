import { HomePresentationEditor } from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/apiClient';

export default function HomePresentationPage() {
  const { user } = useAuth();
  return <main className="page page-wide">
    <HomePresentationEditor key={user?.id ?? 'anonymous'} surface="lecture" client={api} />
  </main>;
}
