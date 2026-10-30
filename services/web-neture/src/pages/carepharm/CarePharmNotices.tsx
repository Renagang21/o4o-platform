import { CarePharmNoticeView, CarePharmNewsView } from '@o4o/shared-space-ui';
import { api } from '../../lib/apiClient';
export function CarePharmNotices({ detailId }: { detailId?: string }) {
  return <CarePharmNoticeView client={api} detailId={detailId} />;
}
export default function CarePharmNewsPage() { return <CarePharmNewsView client={api} />; }
