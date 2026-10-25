import { ServiceOperatorManagement } from '@o4o/operator-core-ui';
import { api, authClient } from '../../lib/apiClient';
import type { ComponentProps } from 'react';
import { BusinessOperationsOverview, OperatorSemiFranchisePage as AssignedBusinessPage } from '@o4o/operator-core-ui/modules/pharmacy-management';
import { useAuth } from '../../contexts/AuthContext';

export default function OperatorSemiFranchisePage(props: ComponentProps<typeof AssignedBusinessPage> = {}) {
  const { user } = useAuth();
  if (!user) return null;
  return <>
    {props.businessKey && user.roles?.includes(`neture:${props.businessKey}_admin`) &&
      <ServiceOperatorManagement key={`${user.id}:${props.businessKey}`} client={authClient.api} scope={props.businessKey} />}
    <AssignedBusinessPage key={user.id}
      contactHref={key => `/operator/inbox/business/${encodeURIComponent(key)}`}
      renderOverview={business => <BusinessOperationsOverview business={business} client={api} accountKey={user.id}
        forumHref={props.forumHref?.(business) ?? `/communities/${encodeURIComponent(business.community_key || `business:${business.key}`)}/forum`}
        homeEditorHref={business.key === 'carepharm' ? '/operator/home-presentation/carepharm' : undefined} />}
      {...props} />
  </>;
}
