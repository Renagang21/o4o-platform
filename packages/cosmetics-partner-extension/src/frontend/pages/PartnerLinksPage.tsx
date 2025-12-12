/**
 * PartnerLinksPage
 *
 * 파트너 링크 관리 페이지
 */

import React from 'react';

interface PartnerLinksPageProps {
  partnerId?: string;
}

export const PartnerLinksPage: React.FC<PartnerLinksPageProps> = ({ partnerId }) => {
  return (
    <div className="cosmetics-partner-links">
      <div className="page-header">
        <h1>My Links</h1>
        <button className="create-btn">Create New Link</button>
      </div>

      {/* Link Stats Summary */}
      <div className="link-stats">
        <div className="stat-item">
          <span className="label">Total Links</span>
          <span className="value">-</span>
        </div>
        <div className="stat-item">
          <span className="label">Total Clicks</span>
          <span className="value">-</span>
        </div>
        <div className="stat-item">
          <span className="label">Total Conversions</span>
          <span className="value">-</span>
        </div>
        <div className="stat-item">
          <span className="label">Avg. Conversion Rate</span>
          <span className="value">-</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <select>
          <option value="">All Types</option>
          <option value="product">Product</option>
          <option value="campaign">Campaign</option>
          <option value="routine">Routine</option>
          <option value="brand">Brand</option>
        </select>
        <select>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Links List */}
      <div className="links-list">
        <table>
          <thead>
            <tr>
              <th>Link</th>
              <th>Type</th>
              <th>Clicks</th>
              <th>Conversions</th>
              <th>Earnings</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="empty">
                No links found. Create your first link!
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PartnerLinksPage;
