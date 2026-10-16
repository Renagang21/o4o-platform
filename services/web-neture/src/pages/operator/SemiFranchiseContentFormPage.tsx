import { SemiFranchiseContentFormPage as BusinessContentEditor } from '@o4o/operator-core-ui/modules/pharmacy-management';
import { useAuth } from '../../contexts/AuthContext';

export default function SemiFranchiseContentFormPage() {
  const { user } = useAuth();
  return user ? <BusinessContentEditor key={user.id} /> : null;
}
