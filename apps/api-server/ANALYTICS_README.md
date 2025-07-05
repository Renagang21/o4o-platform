# Analytics and Monitoring System

A comprehensive usage analytics and monitoring system designed for the O4O Platform beta testing period. This system tracks user behavior, system performance, and provides actionable insights through automated reporting and real-time monitoring.

## 🎯 Features

### 📊 Analytics Collection
- **User Session Tracking**: Complete session lifecycle with device detection, geolocation, and user agent parsing
- **Action Tracking**: Detailed user behavior tracking across all platform features
- **Performance Metrics**: API response times, database query performance, and system resource usage
- **Content Usage Analytics**: Signage content viewing patterns, playlist usage, and template adoption
- **Error Tracking**: Comprehensive error logging with stack traces and context

### 📈 Real-time Monitoring
- **System Health Monitoring**: CPU, memory, network latency, and uptime tracking
- **Performance Alerting**: Automated alerts for response time thresholds, error rates, and system issues
- **User Activity Monitoring**: Live user sessions, concurrent users, and activity patterns
- **Content Performance**: Real-time content viewing metrics and engagement rates

### 📋 Automated Reporting
- **Daily Reports**: User activity, system performance, and content usage summaries
- **Weekly Reports**: Comprehensive analytics with trends and insights
- **Monthly Reports**: Business metrics, user retention, and growth analysis
- **Custom Reports**: On-demand report generation for specific time periods and metrics

### 🚨 Alerting System
- **Multi-level Alerts**: Low, medium, high, and critical severity levels
- **Smart Escalation**: Automatic escalation for unacknowledged critical alerts
- **Multiple Channels**: Dashboard notifications, email, Slack, and webhook integrations
- **Alert Management**: Acknowledgment, resolution, and recurring alert detection

## 🏗️ Architecture

### Database Entities

#### UserSession
Tracks individual user sessions with device information, activity metrics, and engagement scores.

```typescript
interface UserSession {
  id: string;
  betaUserId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  status: 'active' | 'inactive' | 'expired';
  durationMinutes: number;
  pageViews: number;
  actions: number;
  feedbackSubmitted: number;
  contentViewed: number;
  errorsEncountered: number;
  engagementScore: number;
}
```

#### UserAction
Records all user interactions with detailed context and performance metrics.

```typescript
interface UserAction {
  id: string;
  betaUserId: string;
  sessionId: string;
  actionType: ActionType;
  actionCategory: ActionCategory;
  actionName: string;
  pageUrl?: string;
  responseTime?: number;
  isError: boolean;
  metadata: any;
}
```

#### SystemMetrics
Stores system performance and usage metrics with categorization.

```typescript
interface SystemMetrics {
  id: string;
  metricType: 'performance' | 'usage' | 'error' | 'system' | 'business';
  metricCategory: string;
  metricName: string;
  value: number;
  unit: string;
  source: string;
  endpoint?: string;
  metadata: any;
}
```

#### AnalyticsReport
Automated and manual report generation with comprehensive data aggregation.

```typescript
interface AnalyticsReport {
  id: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  reportCategory: string;
  reportName: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  summary: any;
  userMetrics: any;
  systemMetrics: any;
  contentMetrics: any;
  feedbackMetrics: any;
  businessMetrics: any;
}
```

#### Alert
Intelligent alerting system with escalation and notification management.

```typescript
interface Alert {
  id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  title: string;
  message: string;
  currentValue?: number;
  thresholdValue?: number;
  isRecurring: boolean;
  occurrenceCount: number;
  notificationChannels: string[];
}
```

### Services

#### AnalyticsService
Core service for data collection, processing, and analysis.

**Key Methods:**
- `createSession(data)`: Initialize user session tracking
- `trackAction(data)`: Record user actions with context
- `recordMetric(data)`: Store system performance metrics
- `getAnalyticsOverview(days)`: Generate comprehensive analytics summary
- `generateReport(type, category, startDate, endDate)`: Create detailed reports

#### ScheduledReportingService
Automated reporting and monitoring with cron-based scheduling.

**Scheduled Tasks:**
- Daily reports at 6:00 AM
- Weekly reports on Mondays at 7:00 AM
- Monthly reports on the 1st at 8:00 AM
- Real-time monitoring every 5 minutes
- Alert escalation checks every 15 minutes
- System health checks every hour

## 🚀 API Endpoints

### Analytics Overview
```
GET /api/analytics/overview?days=7
```
Returns comprehensive analytics summary including user counts, system health, and key metrics.

### User Analytics
```
GET /api/analytics/users?days=7
GET /api/analytics/users/actions?userId=xxx&actionType=xxx
```
Detailed user behavior analysis and action tracking.

### System Performance
```
GET /api/analytics/system?days=7
```
System performance metrics, response times, and resource usage.

### Content Analytics
```
GET /api/analytics/content?days=7
```
Content usage patterns, popular templates, and engagement metrics.

### Reports Management
```
GET /api/analytics/reports
POST /api/analytics/reports
GET /api/analytics/reports/:id
```
Report generation, listing, and retrieval.

### Alerts Management
```
GET /api/analytics/alerts
POST /api/analytics/alerts/:id/acknowledge
POST /api/analytics/alerts/:id/resolve
```
Alert monitoring and management.

### Real-time Metrics
```
GET /api/analytics/real-time
```
Live system metrics including active sessions, recent actions, and current alerts.

## 📊 Dashboard Components

### AnalyticsDashboard
React component providing comprehensive analytics visualization with:
- Real-time metrics display
- Interactive charts and graphs
- Alert management interface
- Performance monitoring
- User engagement analysis

**Features:**
- Responsive design for desktop and mobile
- Real-time data updates every 30 seconds
- Interactive time range selection
- Alert acknowledgment and resolution
- Export and sharing capabilities

## 🔧 Installation and Setup

### 1. Database Setup
The analytics system requires PostgreSQL with the following entities:
- UserSession
- UserAction
- SystemMetrics
- AnalyticsReport
- Alert

### 2. Environment Configuration
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=o4o_platform

# JWT Configuration
JWT_SECRET=your_jwt_secret

# Notification Configuration (Optional)
SLACK_WEBHOOK_URL=your_slack_webhook
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your_email
EMAIL_SMTP_PASS=your_password
```

### 3. Service Integration
```typescript
import { analyticsMiddleware } from './middleware/analyticsMiddleware';
import { scheduledReportingService } from './services/ScheduledReportingService';

// Apply middleware
app.use('/api/', analyticsMiddleware.initializeTracking());
app.use('/api/', analyticsMiddleware.trackPerformance());

// Start monitoring service
scheduledReportingService.start();
```

## 🧪 Testing

Run the comprehensive test suite:
```bash
npm run test:analytics
```

Or run individual tests:
```bash
# Test analytics functionality
node dist/test-analytics.js

# Performance testing
npm run test:analytics:performance
```

## 📈 Performance Optimizations

### Database Indexing
Optimized indexes for high-performance queries:
```sql
-- User session queries
CREATE INDEX idx_user_sessions_user_status_created ON user_sessions(beta_user_id, status, created_at);

-- Action tracking queries
CREATE INDEX idx_user_actions_user_type_created ON user_actions(beta_user_id, action_type, created_at);

-- Metrics aggregation
CREATE INDEX idx_system_metrics_type_category_created ON system_metrics(metric_type, metric_category, created_at);

-- Alert management
CREATE INDEX idx_alerts_status_severity_created ON alerts(status, severity, created_at);
```

### Caching Strategy
- Redis caching for frequently accessed analytics data
- In-memory caching for real-time metrics
- Background aggregation for heavy computations

### Data Retention
- User actions: 90 days
- System metrics: 30 days  
- Analytics reports: 1 year
- Alerts: 6 months

## 📋 Usage Examples

### Track User Action
```typescript
await analyticsService.trackAction({
  betaUserId: 'user-123',
  sessionId: 'session-456',
  actionType: ActionType.SIGNAGE_CREATE,
  actionName: 'Create Digital Signage',
  pageUrl: '/signage/create',
  responseTime: 850,
  metadata: { templateId: 'retail-template-1' }
});
```

### Record Performance Metric
```typescript
await analyticsService.recordPerformanceMetric(
  '/api/signage/create',
  245, // response time in ms
  'api-server'
);
```

### Generate Custom Report
```typescript
const report = await analyticsService.generateReport(
  ReportType.CUSTOM,
  ReportCategory.USER_ACTIVITY,
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

### Create Alert
```typescript
await analyticsService.createAlert(
  AlertType.PERFORMANCE,
  AlertSeverity.HIGH,
  'High Response Time',
  'API response time exceeded threshold',
  'api_response_time',
  1250,
  1000
);
```

## 🔐 Security and Privacy

### Data Protection
- User anonymization for long-term storage
- Encrypted sensitive data fields
- GDPR compliance for EU users
- Data retention policies

### Access Control
- Role-based access to analytics data
- Admin-only system metrics access
- Beta users can only see their own data
- API authentication required for all endpoints

## 🚀 Deployment

### Production Checklist
- [ ] PostgreSQL database configured with proper indexes
- [ ] Environment variables set
- [ ] Monitoring service started
- [ ] Notification channels configured
- [ ] Dashboard deployed and accessible
- [ ] Backup strategy implemented
- [ ] Log rotation configured

### Monitoring Dashboard
Access the analytics dashboard at:
```
https://your-domain.com/admin/analytics
```

## 📞 Support and Maintenance

### Health Checks
- System health endpoint: `/api/analytics/real-time`
- Service status: `scheduledReportingService.getStatus()`
- Database connectivity monitoring

### Troubleshooting
Common issues and solutions:
1. **High memory usage**: Check data retention settings and implement cleanup
2. **Slow queries**: Review index usage and query optimization
3. **Missing alerts**: Verify notification configuration and service status
4. **Report generation failures**: Check database connectivity and disk space

### Maintenance Tasks
- Weekly database cleanup
- Monthly report archival
- Quarterly performance optimization
- Annual data retention policy review

## 🔮 Future Enhancements

### Planned Features
- Machine learning-based anomaly detection
- Advanced user segmentation
- Predictive analytics for user behavior
- Custom dashboard builder
- API rate limiting analytics
- Mobile app usage tracking
- Integration with external monitoring tools

### Roadmap
- Q1 2024: Enhanced visualization and custom dashboards
- Q2 2024: Machine learning integration
- Q3 2024: Mobile analytics and offline tracking
- Q4 2024: Enterprise features and advanced reporting

---

## 📄 License
This analytics system is part of the O4O Platform and follows the same licensing terms.

## 👥 Contributors
- Development Team: O4O Platform Analytics Team
- Documentation: Technical Writing Team
- Testing: QA Team

For support, please contact the development team or create an issue in the project repository.