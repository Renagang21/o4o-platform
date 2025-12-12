/**
 * PartnerDashboard Page
 *
 * 파트너 대시보드 - 전체 현황 요약
 */

import React from 'react';

interface PartnerDashboardProps {
  partnerId?: string;
}

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ partnerId }) => {
  return (
    <div className="cosmetics-partner-dashboard">
      <h1>Partner Dashboard</h1>
      <p>Partner ID: {partnerId || 'Not specified'}</p>

      <div className="dashboard-grid">
        {/* Summary Cards */}
        <div className="summary-section">
          <h2>Overview</h2>
          <div className="summary-cards">
            <div className="summary-card">
              <h3>Total Earnings</h3>
              <p className="value">Loading...</p>
            </div>
            <div className="summary-card">
              <h3>Active Links</h3>
              <p className="value">Loading...</p>
            </div>
            <div className="summary-card">
              <h3>Total Conversions</h3>
              <p className="value">Loading...</p>
            </div>
            <div className="summary-card">
              <h3>Published Routines</h3>
              <p className="value">Loading...</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-activity">
          <h2>Recent Activity</h2>
          <p>Recent earnings and conversions will appear here.</p>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <button>Create New Link</button>
          <button>Create New Routine</button>
          <button>View Earnings</button>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;
