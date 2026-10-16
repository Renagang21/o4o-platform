import type { ComponentProps } from 'react';
import { OperatorSemiFranchisePage as AssignedBusinessPage } from '@o4o/operator-core-ui/modules/pharmacy-management';
import { useAuth } from '../../contexts/AuthContext';

export default function OperatorSemiFranchisePage(props: ComponentProps<typeof AssignedBusinessPage> = {}) {
  const { user } = useAuth();
  if (!user) return null;
  return <AssignedBusinessPage key={user.id} {...props} />;
}
