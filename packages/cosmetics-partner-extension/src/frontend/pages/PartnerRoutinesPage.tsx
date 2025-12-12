/**
 * PartnerRoutinesPage
 *
 * 파트너 루틴 관리 페이지
 */

import React from 'react';

export function PartnerRoutinesPage() {
  return (
    <div className="partner-routines-page">
      <div className="page-header">
        <h1>My Routines</h1>
        <button className="btn-primary">Create New Routine</button>
      </div>
      <div className="routines-stats">
        <div className="stat-card">
          <h3>Total Routines</h3>
          <p className="stat-value">0</p>
        </div>
        <div className="stat-card">
          <h3>Published</h3>
          <p className="stat-value">0</p>
        </div>
        <div className="stat-card">
          <h3>Total Views</h3>
          <p className="stat-value">0</p>
        </div>
        <div className="stat-card">
          <h3>Total Likes</h3>
          <p className="stat-value">0</p>
        </div>
      </div>
      <div className="routines-tabs">
        <button className="tab active">All Routines</button>
        <button className="tab">Published</button>
        <button className="tab">Drafts</button>
      </div>
      <div className="routines-list">
        <div className="empty-state">
          <p>No routines created yet. Share your skincare routine to help others!</p>
        </div>
      </div>
    </div>
  );
}

export default PartnerRoutinesPage;
