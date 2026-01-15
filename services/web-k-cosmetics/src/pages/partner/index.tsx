/**
 * Partner Index - /partner 리다이렉트
 * Reference: GlycoPharm (복제)
 */

import { Navigate } from 'react-router-dom';

export default function PartnerIndex() {
  return <Navigate to="/partner/overview" replace />;
}
