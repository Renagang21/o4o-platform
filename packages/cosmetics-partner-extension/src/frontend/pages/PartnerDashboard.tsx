/**
 * PartnerDashboard Page
 *
 * 파트너 대시보드 - 수익, 링크, 루틴 통계
 * Redesigned with Antigravity Design System
 */

import React, { useState, useEffect } from 'react';
import { AGCard, AGButton } from '@o4o/design-system-cosmetics';

interface DashboardStats {
  totalEarnings: number;
  activeLinks: number;
  totalClicks: number;
  conversions: number;
}

export function PartnerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEarnings: 0,
    activeLinks: 0,
    totalClicks: 0,
    conversions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setStats({
        totalEarnings: 1250000,
        activeLinks: 12,
        totalClicks: 3420,
        conversions: 84,
      });
      setLoading(false);
    }, 1000);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const containerStyle: React.CSSProperties = {
    padding: '24px',
    backgroundColor: '#F5F5F5',
    minHeight: '100vh',
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: 700,
    marginTop: '8px',
    marginBottom: '4px',
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: '#757575',
    fontWeight: 500,
  };

  const contentGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '16px',
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '40px',
    color: '#9E9E9E',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, margin: 0 }}>Partner Dashboard</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <AGButton variant="ghost" mode="partner" size="md">
            📊 Reports
          </AGButton>
          <AGButton variant="primary" mode="partner" size="md">
            ➕ Create Link
          </AGButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={gridStyle}>
        <AGCard elevation={2} padding="comfortable" mode="partner" hoverable>
          <div>
            <p style={statLabelStyle}>Total Earnings</p>
            <p style={statValueStyle}>
              {loading ? '⏳' : formatCurrency(stats.totalEarnings)}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#4CAF50' }}>
              ↑ +12.5% from last month
            </p>
          </div>
        </AGCard>

        <AGCard elevation={2} padding="comfortable" mode="partner" hoverable>
          <div>
            <p style={statLabelStyle}>Active Links</p>
            <p style={statValueStyle}>{loading ? '⏳' : stats.activeLinks}</p>
            <p style={{ fontSize: '0.75rem', color: '#2196F3' }}>
              🔗 Ready to share
            </p>
          </div>
        </AGCard>

        <AGCard elevation={2} padding="comfortable" mode="partner" hoverable>
          <div>
            <p style={statLabelStyle}>Total Clicks</p>
            <p style={statValueStyle}>
              {loading ? '⏳' : stats.totalClicks.toLocaleString()}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#9C27B0' }}>
              📈 Last 30 days
            </p>
          </div>
        </AGCard>

        <AGCard elevation={2} padding="comfortable" mode="partner" hoverable>
          <div>
            <p style={statLabelStyle}>Conversions</p>
            <p style={statValueStyle}>{loading ? '⏳' : stats.conversions}</p>
            <p style={{ fontSize: '0.75rem', color: '#FF9800' }}>
              ✨ 2.5% conversion rate
            </p>
          </div>
        </AGCard>
      </div>

      {/* Content Sections */}
      <div style={contentGridStyle}>
        <AGCard
          elevation={1}
          padding="comfortable"
          header="Recent Activity"
          mode="partner"
        >
          <div style={emptyStateStyle}>
            <p style={{ fontSize: '3rem' }}>📊</p>
            <p>No recent activity</p>
            <AGButton variant="secondary" mode="partner" size="sm" style={{ marginTop: '16px' }}>
              View All Activity
            </AGButton>
          </div>
        </AGCard>

        <AGCard
          elevation={1}
          padding="comfortable"
          header="Top Performing Links"
          mode="partner"
        >
          <div style={emptyStateStyle}>
            <p style={{ fontSize: '3rem' }}>🔗</p>
            <p>No data available</p>
            <AGButton variant="secondary" mode="partner" size="sm" style={{ marginTop: '16px' }}>
              Create Your First Link
            </AGButton>
          </div>
        </AGCard>
      </div>
    </div>
  );
}

export default PartnerDashboard;
