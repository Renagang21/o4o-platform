/**
 * PartnerRoutinesPage
 *
 * 파트너 루틴 관리 페이지
 */

import React from 'react';

interface PartnerRoutinesPageProps {
  partnerId?: string;
}

export const PartnerRoutinesPage: React.FC<PartnerRoutinesPageProps> = ({ partnerId }) => {
  return (
    <div className="cosmetics-partner-routines">
      <div className="page-header">
        <h1>My Routines</h1>
        <button className="create-btn">Create New Routine</button>
      </div>

      {/* Routine Stats Summary */}
      <div className="routine-stats">
        <div className="stat-item">
          <span className="label">Total Routines</span>
          <span className="value">-</span>
        </div>
        <div className="stat-item">
          <span className="label">Published</span>
          <span className="value">-</span>
        </div>
        <div className="stat-item">
          <span className="label">Total Views</span>
          <span className="value">-</span>
        </div>
        <div className="stat-item">
          <span className="label">Total Likes</span>
          <span className="value">-</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <select>
          <option value="">All Types</option>
          <option value="morning">Morning</option>
          <option value="evening">Evening</option>
          <option value="weekly">Weekly</option>
          <option value="special">Special</option>
        </select>
        <select>
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Routines Grid */}
      <div className="routines-grid">
        <div className="empty-state">
          <p>No routines found. Create your first routine!</p>
        </div>
      </div>
    </div>
  );
};

export default PartnerRoutinesPage;
