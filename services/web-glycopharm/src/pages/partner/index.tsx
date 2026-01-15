/**
 * Partner Index - /partner 리다이렉트
 *
 * Work Order: WO-GLYCOPHARM-PARTNER-DASHBOARD-IMPLEMENTATION-V1
 *
 * /partner 접근 시 /partner/overview 로 리다이렉트
 */

import { Navigate } from 'react-router-dom';

export default function PartnerIndex() {
  return <Navigate to="/partner/overview" replace />;
}
