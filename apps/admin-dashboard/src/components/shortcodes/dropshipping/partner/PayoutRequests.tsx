/**
 * Partner Payout Requests
 *
 * This is a wrapper component that uses the shared PayoutRequests component
 * with the 'partner' role type.
 *
 * Migrated from duplicate code to shared component.
 */

import React from 'react';
import SharedPayoutRequests from '../shared/PayoutRequests';

const PayoutRequests: React.FC = () => {
  return <SharedPayoutRequests roleType="partner" />;
};

export default PayoutRequests;
