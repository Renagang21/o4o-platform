import { ServiceOperatorManagement } from '@o4o/operator-core-ui';
import { authClient } from '../../lib/apiClient';
import type { ComponentProps } from 'react';
import { OperatorSemiFranchisePage as AssignedBusinessPage } from '@o4o/operator-core-ui/modules/pharmacy-management';
import { useAuth } from '../../contexts/AuthContext';

export default function OperatorSemiFranchisePage(props: ComponentProps<typeof AssignedBusinessPage> = {}) {
  const { user } = useAuth();
  if (!user) return null;
  return <>{props.businessKey && user.roles?.includes(`neture:${props.businessKey}_admin`) && <ServiceOperatorManagement key={`${user.id}:${props.businessKey}`} client={authClient.api} scope={props.businessKey} />}<AssignedBusinessPage contactHref={key => ["pharmacy","carepharm","megapharm","pharmcoop"].includes(key) ? `https://neture.co.kr/operator/service-contact/${key === "pharmacy" ? "kpa-society" : key}` : undefined} key={user.id} {...props} /></>;
}
