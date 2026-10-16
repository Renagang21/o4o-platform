import type { ComponentProps } from 'react';
import { SemiFranchiseContentFormPage as BusinessContentEditor } from '@o4o/operator-core-ui/modules/pharmacy-management';
import { useAuth } from '../../contexts/AuthContext';

export default function SemiFranchiseContentFormPage(props: ComponentProps<typeof BusinessContentEditor> = {}) {
  const { user } = useAuth();
  return user ? <BusinessContentEditor key={user.id} {...props} /> : null;
}
