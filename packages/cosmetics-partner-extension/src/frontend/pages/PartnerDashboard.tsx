/**
 * PartnerDashboard Page
 *
 * 파트너 대시보드 - 수익, 링크, 루틴 통계
 * Basic implementation without external design system dependency
 */

import React, { useState, useEffect } from 'react';

// Simple Card component (no external dependency)
interface CardProps {
  children: React.ReactNode;
  elevation?: number;
  padding?: 'compact' | 'comfortable';
  header?: string;
  mode?: string;
  hoverable?: boolean;
  style?: React.CSSProperties;
}

function SimpleCard({ children, elevation = 1, padding = 'comfortable', header, hoverable, style }: CardProps) {
  const cardStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    boxShadow: elevation === 2 ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.05)',
    padding: padding === 'comfortable' ? '24px' : '16px',
    transition: hoverable ? 'transform 0.2s, box-shadow 0.2s' : 'none',
    ...style,
  };

  return (
    <div style={cardStyle}>
      {header && <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', fontWeight: 600 }}>{header}</h3>}
      {children}
    </div>
  );
}

// Simple Button component (no external dependency)
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  mode?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

function SimpleButton({ children, variant = 'primary', size = 'md', style, onClick }: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'background-color 0.2s',
    padding: size === 'sm' ? '8px 16px' : size === 'lg' ? '16px 32px' : '12px 24px',
    fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem',
    ...style,
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: '#E91E63', color: '#FFFFFF' },
    secondary: { backgroundColor: '#F5F5F5', color: '#424242' },
    ghost: { backgroundColor: 'transparent', color: '#757575' },
  };

  return (
    <button style={{ ...baseStyle, ...variantStyles[variant] }} onClick={onClick}>
      {children}
    </button>
  );
}

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
          <SimpleButton variant="ghost" mode="partner" size="md">
            📊 Reports
          </SimpleButton>
          <SimpleButton variant="primary" mode="partner" size="md">
            ➕ Create Link
          </SimpleButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={gridStyle}>
        <SimpleCard elevation={2} padding="comfortable" mode="partner" hoverable>
          <div>
            <p style={statLabelStyle}>Total Earnings</p>
            <p style={statValueStyle}>
              {loading ? '⏳' : formatCurrency(stats.totalEarnings)}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#4CAF50' }}>
              ↑ +12.5% from last month
            </p>
          </div>
        </SimpleCard>

        <SimpleCard elevation={2} padding="comfortable" mode="partner" hoverable>
          <div>
            <p style={statLabelStyle}>Active Links</p>
            <p style={statValueStyle}>{loading ? '⏳' : stats.activeLinks}</p>
            <p style={{ fontSize: '0.75rem', color: '#2196F3' }}>
              🔗 Ready to share
            </p>
          </div>
        </SimpleCard>

        <SimpleCard elevation={2} padding="comfortable" mode="partner" hoverable>
          <div>
            <p style={statLabelStyle}>Total Clicks</p>
            <p style={statValueStyle}>
              {loading ? '⏳' : stats.totalClicks.toLocaleString()}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#9C27B0' }}>
              📈 Last 30 days
            </p>
          </div>
        </SimpleCard>

        <SimpleCard elevation={2} padding="comfortable" mode="partner" hoverable>
          <div>
            <p style={statLabelStyle}>Conversions</p>
            <p style={statValueStyle}>{loading ? '⏳' : stats.conversions}</p>
            <p style={{ fontSize: '0.75rem', color: '#FF9800' }}>
              ✨ 2.5% conversion rate
            </p>
          </div>
        </SimpleCard>
      </div>

      {/* Content Sections */}
      <div style={contentGridStyle}>
        <SimpleCard
          elevation={1}
          padding="comfortable"
          header="Recent Activity"
          mode="partner"
        >
          <div style={emptyStateStyle}>
            <p style={{ fontSize: '3rem' }}>📊</p>
            <p>No recent activity</p>
            <SimpleButton variant="secondary" mode="partner" size="sm" style={{ marginTop: '16px' }}>
              View All Activity
            </SimpleButton>
          </div>
        </SimpleCard>

        <SimpleCard
          elevation={1}
          padding="comfortable"
          header="Top Performing Links"
          mode="partner"
        >
          <div style={emptyStateStyle}>
            <p style={{ fontSize: '3rem' }}>🔗</p>
            <p>No data available</p>
            <SimpleButton variant="secondary" mode="partner" size="sm" style={{ marginTop: '16px' }}>
              Create Your First Link
            </SimpleButton>
          </div>
        </SimpleCard>
      </div>
    </div>
  );
}

export default PartnerDashboard;
