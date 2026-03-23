/**
 * AI Report Page - Shared Types
 * WO-O4O-AI-REPORT-PAGE-COMMONIZATION-V1
 */

import type { ReactNode } from 'react';

// ===== Theme =====
export type AiReportTheme = 'green' | 'pink' | 'teal';

// ===== Period =====
export type Period = '7d' | '30d' | '90d';

// ===== Data Types =====

export interface KpiPeriodData {
  totalAiResponses: number;
  totalExposures: number;
  uniqueAssets: number;
  avgExposurePerResponse: number;
  trends: {
    responses: { change: number; direction: 'up' | 'down' };
    exposures: { change: number; direction: 'up' | 'down' };
    assets: { change: number; direction: 'up' | 'down' };
  };
}

export interface ContextAssetExposure {
  id: string;
  assetType: string;
  assetName: string;
  exposureCount: number;
  uniqueUsers: number;
  topReasons: string[];
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export interface ExposureReason {
  reason: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DailyTrend {
  date: string;
  totalExposures: number;
  uniqueAssets: number;
  aiResponses: number;
}

export type QualitySignalSeverity = 'low' | 'medium' | 'high';
export type QualitySignalType = 'fallback_high' | 'exposure_low' | 'asset_concentration' | 'asset_underutilized';

export interface QualitySignal {
  id: string;
  signalType: QualitySignalType;
  severity: QualitySignalSeverity;
  title: string;
  description: string;
  metric: string;
  suggestion: string;
  relatedAssets?: string[];
}

// ===== Config Types =====

export interface AssetTypeDefinition {
  type: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
}

export interface OperatorInsightItem {
  bulletColor: string;
  content: ReactNode;
}

export interface HeaderNavConfig {
  serviceName: string;
  serviceNameColor: string;
  backLink: string;
  navLinks: Array<{ to: string; label: string; className?: string }>;
}

// ===== Main Config =====

export interface AiReportConfig {
  mode: 'full' | 'empty';
  theme: AiReportTheme;
  assetTypes: AssetTypeDefinition[];
  infoBannerText: ReactNode;

  // Full mode data
  kpiData?: Record<Period, KpiPeriodData>;
  exposureData?: ContextAssetExposure[];
  reasonData?: ExposureReason[];
  dailyTrendData?: DailyTrend[];
  qualitySignals?: QualitySignal[];
  operatorInsights?: OperatorInsightItem[];
  avgExposureChangePercent?: number;

  // Optional slots
  headerNav?: HeaderNavConfig;
  headerActions?: ReactNode;

  // Empty mode
  emptyStateDescription?: string;
}

export interface AiReportPageProps {
  config: AiReportConfig;
}
