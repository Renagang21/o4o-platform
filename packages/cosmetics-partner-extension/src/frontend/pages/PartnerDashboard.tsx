/**
 * PartnerDashboard Page
 *
 * 파트너 대시보드 - 수익, 링크, 루틴 통계
 */

import React from 'react';

export function PartnerDashboard() {
  return (
    <div className="partner-dashboard">
      <h1>Partner Dashboard</h1>
      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Earnings</h3>
          <p className="stat-value">Loading...</p>
        </div>
        <div className="stat-card">
          <h3>Active Links</h3>
          <p className="stat-value">Loading...</p>
        </div>
        <div className="stat-card">
          <h3>Total Clicks</h3>
          <p className="stat-value">Loading...</p>
        </div>
        <div className="stat-card">
          <h3>Conversions</h3>
          <p className="stat-value">Loading...</p>
        </div>
      </div>
      <div className="dashboard-content">
        <section className="recent-activity">
          <h2>Recent Activity</h2>
          <p>No recent activity</p>
        </section>
        <section className="top-performing">
          <h2>Top Performing Links</h2>
          <p>No data available</p>
        </section>
      </div>
    </div>
  );
}

export default PartnerDashboard;
