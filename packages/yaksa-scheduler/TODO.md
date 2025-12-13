# yaksa-scheduler TODO

## Completed

### Phase 19-A: Central Scheduler Infrastructure (Done)
- [x] Create yaksa-scheduler package
- [x] ScheduledJob entity (cron expression, target service, action type)
- [x] JobExecutionLog entity (execution results, duration, details)
- [x] JobFailureQueue entity (retry queue with exponential backoff)
- [x] SchedulerService (cron scheduling, job management)
- [x] JobMonitorService (statistics, health monitoring)
- [x] Scheduler Controller (REST API endpoints)
- [x] Lifecycle hooks (install, activate, deactivate, uninstall)
- [x] Register in manifestRegistry

### Phase 19-B: Permitted State Automation (Done)
- [x] Annualfee handlers (invoice_overdue_check, exemption_expiry_check, settlement_reminder)
- [x] Membership handlers (verification_expiry_check, license_renewal_reminder)
- [x] LMS handlers (assignment_expiry_check, course_deadline_reminder)
- [x] Reporting handlers (failed_submission_retry, report_deadline_reminder)
- [x] Handler registration on activation

### Phase 19-C: Integrated Dashboard (Done)
- [x] IntegratedDashboardService
- [x] 6 widget data aggregation (overdue invoices, expiring verifications, pending assignments, pending reports, failure queue, scheduler health)
- [x] REST API endpoints for dashboard and individual widgets

## Pending

### Frontend Components (Phase 19-D)
- [ ] SchedulerDashboard React component
- [ ] ScheduledJobList component
- [ ] FailureQueueList component
- [ ] IntegratedDashboardHub component with 6 widget cards
- [ ] Job creation/edit form
- [ ] Manual trigger button

### Default Job Seeds (Phase 19-E)
- [ ] Create seed data for standard jobs (daily overdue check, weekly expiry checks, etc.)
- [ ] Per-organization job templates

### Notification Integration (Phase 19-F)
- [ ] Email notifications for job failures
- [ ] Admin alerts for exhausted retries
- [ ] Weekly summary reports

## Notes

### Human-in-the-Loop Requirements
The following actions are explicitly PROHIBITED from automation:
- Invoice approval/confirmation
- Exemption approval/rejection
- Settlement confirmation
- Refund processing
- Verification approval
- Membership status changes
- Credit record approval
- Certificate issuance
- Report approval
- Initial submission decision

### API Endpoints
- GET /api/v1/yaksa-scheduler/integrated-dashboard - Full dashboard data
- GET /api/v1/yaksa-scheduler/integrated-dashboard/:widget - Individual widget
- GET /api/v1/yaksa-scheduler/dashboard - Scheduler statistics
- GET /api/v1/yaksa-scheduler/health - Job health status
- GET /api/v1/yaksa-scheduler/jobs - List jobs
- POST /api/v1/yaksa-scheduler/jobs - Create job
- PATCH /api/v1/yaksa-scheduler/jobs/:id - Update job
- DELETE /api/v1/yaksa-scheduler/jobs/:id - Delete job
- POST /api/v1/yaksa-scheduler/jobs/:id/trigger - Manual trigger
- POST /api/v1/yaksa-scheduler/jobs/:id/pause - Pause job
- POST /api/v1/yaksa-scheduler/jobs/:id/resume - Resume job
- GET /api/v1/yaksa-scheduler/failures - List failure queue
- POST /api/v1/yaksa-scheduler/failures/:id/retry - Retry failure
- POST /api/v1/yaksa-scheduler/failures/:id/cancel - Cancel failure
