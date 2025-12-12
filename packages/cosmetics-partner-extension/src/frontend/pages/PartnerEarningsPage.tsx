/**
 * PartnerEarningsPage
 *
 * 파트너 수익 관리 및 정산 페이지
 */

import React from 'react';

export function PartnerEarningsPage() {
  return (
    <div className="partner-earnings-page">
      <div className="page-header">
        <h1>Earnings</h1>
        <button className="btn-primary">Request Withdrawal</button>
      </div>
      <div className="earnings-summary">
        <div className="stat-card primary">
          <h3>Total Earnings</h3>
          <p className="stat-value">$0.00</p>
        </div>
        <div className="stat-card">
          <h3>Available Balance</h3>
          <p className="stat-value">$0.00</p>
        </div>
        <div className="stat-card">
          <h3>Pending Approval</h3>
          <p className="stat-value">$0.00</p>
        </div>
        <div className="stat-card">
          <h3>Paid Out</h3>
          <p className="stat-value">$0.00</p>
        </div>
      </div>
      <div className="earnings-chart">
        <h2>Earnings Over Time</h2>
        <div className="chart-placeholder">
          <p>Chart will be displayed here</p>
        </div>
      </div>
      <div className="earnings-breakdown">
        <h2>Earnings Breakdown</h2>
        <div className="breakdown-grid">
          <div className="breakdown-item">
            <span>Commission</span>
            <span>$0.00</span>
          </div>
          <div className="breakdown-item">
            <span>Bonus</span>
            <span>$0.00</span>
          </div>
          <div className="breakdown-item">
            <span>Referral</span>
            <span>$0.00</span>
          </div>
          <div className="breakdown-item">
            <span>Campaign</span>
            <span>$0.00</span>
          </div>
        </div>
      </div>
      <div className="earnings-history">
        <h2>Transaction History</h2>
        <div className="empty-state">
          <p>No transactions yet</p>
        </div>
      </div>
    </div>
  );
}

export default PartnerEarningsPage;
