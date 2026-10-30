import { ForumDeletedManagementPage as Shared } from '@o4o/operator-core-ui/modules/forum-deleted';
import { forumAdminApi } from '../../services/forumApi';
export default function ForumDeletedManagementPage() {
  return <Shared client={forumAdminApi} operatorDeleteHref="/operator/forum-delete" />;
}
