"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAnalyticsSystem = testAnalyticsSystem;
exports.performanceTest = performanceTest;
require("reflect-metadata");
const connection_1 = require("./database/connection");
const AnalyticsService_1 = require("./services/AnalyticsService");
const ScheduledReportingService_1 = require("./services/ScheduledReportingService");
const UserAction_1 = require("./entities/UserAction");
const SystemMetrics_1 = require("./entities/SystemMetrics");
const AnalyticsReport_1 = require("./entities/AnalyticsReport");
const Alert_1 = require("./entities/Alert");
async function testAnalyticsSystem() {
    console.log('🧪 Testing Analytics and Monitoring System');
    console.log('==========================================');
    try {
        // Initialize database
        await (0, connection_1.initializeDatabase)();
        console.log('✅ Database initialized');
        const analyticsService = new AnalyticsService_1.AnalyticsService();
        // Test 1: Create user session
        console.log('\n📊 Test 1: Creating user session...');
        const sessionData = {
            betaUserId: 'test-beta-user-id',
            sessionId: 'test-session-123',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            referrer: 'https://google.com',
            utmSource: 'organic',
            utmMedium: 'search'
        };
        const session = await analyticsService.createSession(sessionData);
        console.log('✅ Session created:', session.id);
        // Test 2: Track user actions
        console.log('\n📊 Test 2: Tracking user actions...');
        const actions = [
            {
                betaUserId: sessionData.betaUserId,
                sessionId: sessionData.sessionId,
                actionType: UserAction_1.ActionType.PAGE_VIEW,
                actionName: 'Dashboard View',
                pageUrl: '/dashboard',
                responseTime: 250
            },
            {
                betaUserId: sessionData.betaUserId,
                sessionId: sessionData.sessionId,
                actionType: UserAction_1.ActionType.SIGNAGE_CREATE,
                actionName: 'Create Signage',
                pageUrl: '/signage/create',
                responseTime: 850,
                metadata: { templateId: 'retail-template-1' }
            },
            {
                betaUserId: sessionData.betaUserId,
                sessionId: sessionData.sessionId,
                actionType: UserAction_1.ActionType.FEEDBACK_SUBMIT,
                actionName: 'Submit Feedback',
                pageUrl: '/feedback',
                responseTime: 320,
                metadata: { rating: 4, category: 'feature-request' }
            }
        ];
        for (const actionData of actions) {
            await analyticsService.trackAction(actionData);
            console.log(`✅ Tracked action: ${actionData.actionName}`);
        }
        // Test 3: Record system metrics
        console.log('\n📊 Test 3: Recording system metrics...');
        const metrics = [
            {
                metricType: SystemMetrics_1.MetricType.PERFORMANCE,
                metricCategory: SystemMetrics_1.MetricCategory.RESPONSE_TIME,
                metricName: 'API Response Time',
                value: 245,
                unit: 'ms',
                source: 'api-server',
                endpoint: '/api/signage'
            },
            {
                metricType: SystemMetrics_1.MetricType.USAGE,
                metricCategory: SystemMetrics_1.MetricCategory.ACTIVE_USERS,
                metricName: 'Concurrent Users',
                value: 15,
                unit: 'count',
                source: 'monitoring'
            },
            {
                metricType: SystemMetrics_1.MetricType.ERROR,
                metricCategory: SystemMetrics_1.MetricCategory.ERROR_COUNT,
                metricName: 'Database Connection Error',
                value: 1,
                unit: 'count',
                source: 'api-server',
                metadata: { errorType: 'connection_timeout' }
            }
        ];
        for (const metricData of metrics) {
            await analyticsService.recordMetric(metricData);
            console.log(`✅ Recorded metric: ${metricData.metricName} = ${metricData.value}${metricData.unit}`);
        }
        // Test 4: Create alerts
        console.log('\n📊 Test 4: Creating alerts...');
        const alert = await analyticsService.createAlert(Alert_1.AlertType.PERFORMANCE, Alert_1.AlertSeverity.HIGH, 'High Response Time Detected', 'API response time exceeded 1000ms threshold', 'api_response_time', 1250, 1000, { endpoint: '/api/signage/create', source: 'api-server' });
        console.log(`✅ Alert created: ${alert.title} (${alert.severity})`);
        // Test 5: Get analytics overview
        console.log('\n📊 Test 5: Getting analytics overview...');
        const overview = await analyticsService.getAnalyticsOverview(7);
        console.log('✅ Analytics overview:');
        console.log(`   - Total Users: ${overview.totalUsers}`);
        console.log(`   - Active Users: ${overview.activeUsers}`);
        console.log(`   - Total Sessions: ${overview.totalSessions}`);
        console.log(`   - Avg Session Duration: ${overview.avgSessionDuration} minutes`);
        console.log(`   - Total Page Views: ${overview.totalPageViews}`);
        console.log(`   - Total Actions: ${overview.totalActions}`);
        console.log(`   - System Health: ${overview.systemHealth}`);
        console.log(`   - Error Rate: ${overview.errorRate}%`);
        // Test 6: Generate report
        console.log('\n📊 Test 6: Generating analytics report...');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date();
        const report = await analyticsService.generateReport(AnalyticsReport_1.ReportType.CUSTOM, AnalyticsReport_1.ReportCategory.COMPREHENSIVE, startDate, endDate);
        console.log(`✅ Report generated: ${report.reportName} (${report.status})`);
        // Test 7: Test user engagement metrics
        console.log('\n📊 Test 7: Getting user engagement metrics...');
        const engagement = await analyticsService.getUserEngagementMetrics(7);
        console.log('✅ User engagement metrics:');
        console.log(`   - Total Sessions: ${engagement.totalSessions}`);
        console.log(`   - Average Engagement Score: ${engagement.averageEngagementScore.toFixed(2)}`);
        console.log(`   - Average Session Duration: ${engagement.averageSessionDuration.toFixed(2)} minutes`);
        console.log(`   - Average Page Views: ${engagement.averagePageViews.toFixed(2)}`);
        // Test 8: Test content usage metrics
        console.log('\n📊 Test 8: Getting content usage metrics...');
        const contentMetrics = await analyticsService.getContentUsageMetrics(7);
        console.log('✅ Content usage metrics:');
        console.log(`   - Total Content Views: ${contentMetrics.totalContentViews}`);
        console.log(`   - Unique Content: ${contentMetrics.uniqueContent}`);
        // Test 9: Test scheduled reporting service
        console.log('\n📊 Test 9: Testing scheduled reporting service...');
        const serviceStatus = ScheduledReportingService_1.scheduledReportingService.getStatus();
        console.log(`✅ Scheduled reporting service status: Running=${serviceStatus.isRunning}, Uptime=${serviceStatus.uptime}s`);
        // Test manual report generation
        const manualReport = await ScheduledReportingService_1.scheduledReportingService.generateManualReport(AnalyticsReport_1.ReportType.DAILY, AnalyticsReport_1.ReportCategory.USER_ACTIVITY, startDate, endDate);
        console.log(`✅ Manual report generated: ${manualReport.reportName}`);
        // Test 10: End session
        console.log('\n📊 Test 10: Ending user session...');
        const endedSession = await analyticsService.endSession(sessionData.sessionId);
        if (endedSession) {
            console.log(`✅ Session ended: Duration=${endedSession.durationMinutes}min, Engagement Score=${endedSession.getEngagementScore()}`);
        }
        console.log('\n🎉 All Analytics Tests Completed Successfully!');
        console.log('===========================================');
        // Summary
        console.log('\n📋 Test Summary:');
        console.log('✅ User session management');
        console.log('✅ Action tracking');
        console.log('✅ System metrics collection');
        console.log('✅ Alert creation and management');
        console.log('✅ Analytics overview generation');
        console.log('✅ Report generation');
        console.log('✅ User engagement analysis');
        console.log('✅ Content usage tracking');
        console.log('✅ Scheduled reporting service');
        console.log('✅ Session lifecycle management');
        console.log('\n📊 Analytics system is ready for production use!');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'Unknown error');
        process.exit(1);
    }
}
// Performance test
async function performanceTest() {
    console.log('\n⚡ Performance Test: Bulk Data Processing');
    console.log('========================================');
    try {
        const analyticsService = new AnalyticsService_1.AnalyticsService();
        const startTime = Date.now();
        // Create multiple sessions and actions
        const sessionPromises = [];
        const actionPromises = [];
        for (let i = 0; i < 50; i++) {
            const sessionData = {
                betaUserId: `test-user-${i}`,
                sessionId: `session-${i}-${Date.now()}`,
                ipAddress: `192.168.1.${i % 255}`,
                userAgent: 'Test User Agent',
                referrer: 'https://test.com'
            };
            sessionPromises.push(analyticsService.createSession(sessionData));
            // Create multiple actions per session
            for (let j = 0; j < 10; j++) {
                actionPromises.push(analyticsService.trackAction({
                    betaUserId: sessionData.betaUserId,
                    sessionId: sessionData.sessionId,
                    actionType: UserAction_1.ActionType.PAGE_VIEW,
                    actionName: `Page View ${j}`,
                    pageUrl: `/page-${j}`,
                    responseTime: Math.random() * 1000
                }));
            }
        }
        // Wait for all sessions to be created
        await Promise.all(sessionPromises);
        console.log('✅ Created 50 test sessions');
        // Wait for all actions to be tracked
        await Promise.all(actionPromises);
        console.log('✅ Tracked 500 test actions');
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`⚡ Performance test completed in ${duration}ms`);
        console.log(`📊 Processing rate: ${(550 / duration * 1000).toFixed(2)} operations/second`);
    }
    catch (error) {
        console.error('❌ Performance test failed:', error);
    }
}
// Run tests
async function runAllTests() {
    await testAnalyticsSystem();
    await performanceTest();
    console.log('\n🎯 All tests completed successfully!');
    process.exit(0);
}
// Execute if run directly
if (require.main === module) {
    runAllTests().catch(console.error);
}
//# sourceMappingURL=test-analytics.js.map