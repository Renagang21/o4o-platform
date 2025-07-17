/**
 * Analytics type definitions
 */

// Event types
export interface AnalyticsEvent {
  id?: string;
  userId?: string;
  sessionId: string;
  eventType: string;
  eventName: string;
  timestamp: Date;
  properties?: Record<string, unknown>;
  metadata?: AnalyticsMetadata;
  source?: string;
  ip?: string;
  userAgent?: string;
}

export interface AnalyticsMetadata {
  page?: string;
  referrer?: string;
  device?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  [key: string]: unknown;
}

// Metrics
export interface UsageMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: MetricTags;
  metadata?: Record<string, unknown>;
}

export interface MetricTags {
  environment?: string;
  service?: string;
  endpoint?: string;
  userId?: string;
  [key: string]: string | undefined;
}

// Content analytics
export interface ContentAnalytics {
  contentId: string;
  contentType: string;
  views: number;
  uniqueViews: number;
  avgDuration: number;
  bounceRate: number;
  engagement: number;
}

export interface PopularContent extends ContentAnalytics {
  title: string;
  author?: string;
  publishedAt?: Date;
  category?: string;
  tags?: string[];
}

// User behavior
export interface UserBehavior {
  userId: string;
  sessionCount: number;
  pageViews: number;
  totalDuration: number;
  lastVisit: Date;
  firstVisit: Date;
  actions: UserAction[];
  segments?: string[];
}

export interface UserAction {
  type: string;
  count: number;
  lastOccurrence: Date;
  metadata?: Record<string, unknown>;
}

// Traffic analytics
export interface TrafficSource {
  source: string;
  medium: string;
  visits: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgDuration: number;
  conversions: number;
}

export interface TrafficStats {
  totalVisits: number;
  uniqueVisitors: number;
  pageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  sources: TrafficSource[];
}

// Sales analytics
export interface SalesMetrics {
  period: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  conversionRate: number;
  growth: number;
  topProducts: ProductSales[];
  topCategories: CategorySales[];
}

export interface ProductSales {
  productId: string;
  productName: string;
  revenue: number;
  quantity: number;
  orders: number;
}

export interface CategorySales {
  category: string;
  revenue: number;
  products: number;
  orders: number;
}

// Engagement metrics
export interface EngagementMetrics {
  timeOnSite: number;
  pagesPerSession: number;
  scrollDepth: number;
  interactions: InteractionMetric[];
  returnRate: number;
}

export interface InteractionMetric {
  type: 'click' | 'scroll' | 'form' | 'video' | 'download' | 'share';
  count: number;
  avgValue?: number;
}

// Error tracking
export interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  context?: ErrorContext;
  handled: boolean;
  resolved: boolean;
}

export interface ErrorContext {
  url?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  device?: string;
  customData?: Record<string, unknown>;
}

// Reports
export interface AnalyticsReport {
  id: string;
  type: ReportType;
  period: ReportPeriod;
  generatedAt: Date;
  data: ReportData;
  metadata?: Record<string, unknown>;
}

export type ReportType = 
  | 'traffic'
  | 'engagement'
  | 'sales'
  | 'content'
  | 'user'
  | 'custom';

export interface ReportPeriod {
  start: Date;
  end: Date;
  granularity: 'hour' | 'day' | 'week' | 'month' | 'year';
}

export interface ReportData {
  summary: Record<string, number | string>;
  details: unknown[];
  charts?: ChartData[];
  insights?: string[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
}

// Real-time analytics
export interface RealtimeMetrics {
  activeUsers: number;
  currentPageViews: number;
  eventsPerMinute: number;
  topPages: PageMetric[];
  topEvents: EventMetric[];
  timestamp: Date;
}

export interface PageMetric {
  path: string;
  views: number;
  users: number;
}

export interface EventMetric {
  name: string;
  count: number;
  users: number;
}

// Conversion tracking
export interface ConversionEvent {
  conversionId: string;
  type: string;
  value: number;
  currency?: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  attribution?: ConversionAttribution;
}

export interface ConversionAttribution {
  source: string;
  medium: string;
  campaign?: string;
  touchpoints: TouchPoint[];
}

export interface TouchPoint {
  timestamp: Date;
  channel: string;
  interaction: string;
  value?: number;
}

// Analytics configuration
export interface AnalyticsConfig {
  enabled: boolean;
  trackingId?: string;
  sampleRate: number;
  excludedPaths?: string[];
  customDimensions?: Record<string, string>;
  debugMode?: boolean;
}