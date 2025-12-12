/**
 * PartnerLinksPage
 *
 * 파트너 추천 링크 관리 페이지
 */

import React from 'react';

export function PartnerLinksPage() {
  return (
    <div className="partner-links-page">
      <div className="page-header">
        <h1>My Partner Links</h1>
        <button className="btn-primary">Create New Link</button>
      </div>
      <div className="links-stats">
        <div className="stat-card">
          <h3>Total Links</h3>
          <p className="stat-value">0</p>
        </div>
        <div className="stat-card">
          <h3>Total Clicks</h3>
          <p className="stat-value">0</p>
        </div>
        <div className="stat-card">
          <h3>Conversions</h3>
          <p className="stat-value">0</p>
        </div>
        <div className="stat-card">
          <h3>Conversion Rate</h3>
          <p className="stat-value">0%</p>
        </div>
      </div>
      <div className="links-list">
        <h2>Your Links</h2>
        <div className="empty-state">
          <p>No links created yet. Create your first partner link to start earning!</p>
        </div>
      </div>
    </div>
  );
}

export default PartnerLinksPage;
