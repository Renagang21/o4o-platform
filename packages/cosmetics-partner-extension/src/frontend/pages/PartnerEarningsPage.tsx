/**
 * PartnerEarningsPage
 *
 * 파트너 수익 관리 페이지
 */

import React from 'react';

interface PartnerEarningsPageProps {
  partnerId?: string;
}

export const PartnerEarningsPage: React.FC<PartnerEarningsPageProps> = ({ partnerId }) => {
  return (
    <div className="cosmetics-partner-earnings">
      <div className="page-header">
        <h1>My Earnings</h1>
        <button className="withdraw-btn">Request Withdrawal</button>
      </div>

      {/* Earnings Summary */}
      <div className="earnings-summary">
        <div className="summary-card pending">
          <h3>Pending</h3>
          <p className="amount">-</p>
          <span className="description">Processing period</span>
        </div>
        <div className="summary-card available">
          <h3>Available</h3>
          <p className="amount">-</p>
          <span className="description">Ready to withdraw</span>
        </div>
        <div className="summary-card withdrawn">
          <h3>Withdrawn</h3>
          <p className="amount">-</p>
          <span className="description">Total withdrawn</span>
        </div>
        <div className="summary-card total">
          <h3>Total Earnings</h3>
          <p className="amount">-</p>
          <span className="description">All time</span>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="monthly-chart">
        <h2>Monthly Earnings</h2>
        <div className="chart-placeholder">
          <p>Earnings chart will be displayed here</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <select>
          <option value="">All Types</option>
          <option value="commission">Commission</option>
          <option value="bonus">Bonus</option>
          <option value="referral">Referral</option>
          <option value="campaign">Campaign</option>
        </select>
        <select>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="available">Available</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
        <input type="date" placeholder="Start Date" />
        <input type="date" placeholder="End Date" />
      </div>

      {/* Earnings History */}
      <div className="earnings-history">
        <h2>Earnings History</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="empty">
                No earnings history found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PartnerEarningsPage;
