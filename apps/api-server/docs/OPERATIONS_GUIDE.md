# AI Page Builder - Operations Guide

**Version:** 1.0.0
**Sprint 4:** Production Operations Guide
**Last Updated:** 2025-10-11

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Monitoring & Alerts](#monitoring--alerts)
3. [Common Operations](#common-operations)
4. [Troubleshooting](#troubleshooting)
5. [Performance Tuning](#performance-tuning)
6. [Cost Management](#cost-management)
7. [Runbooks](#runbooks)
8. [Emergency Procedures](#emergency-procedures)

---

## System Overview

### Architecture Components

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  API Server  │────▶│  AI Worker  │
│ (Frontend)  │     │ (Express.js) │     │  (BullMQ)   │
└─────────────┘     └──────────────┘     └─────────────┘
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │    Redis     │     │ LLM Providers│
                    │   (Queue)    │     │ (OpenAI etc)│
                    └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Prometheus  │
                    │   Metrics    │
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Grafana    │
                    │  Dashboard   │
                    └──────────────┘
```

### Key Services

- **API Server**: Main application server (Port 3000)
- **Redis**: Job queue and caching (Port 6379)
- **Prometheus**: Metrics collection (Port 9090)
- **Grafana**: Metrics visualization (Port 3001)
- **AlertManager**: Alert routing (Port 9093)

### Worker Configuration

- **Concurrency**: 10 jobs simultaneously
- **Rate Limit**: 20 jobs/second
- **Max Retries**: 3 attempts per job
- **Timeout**: 15 seconds per AI call

---

## Monitoring & Alerts

### Accessing Dashboards

#### Prometheus
```bash
# URL: http://localhost:9090
# View metrics: http://localhost:9090/graph
# View alerts: http://localhost:9090/alerts
```

#### Grafana
```bash
# URL: http://localhost:3001
# Dashboard: AI Page Builder - Operations Dashboard
# Default credentials: admin / admin (change on first login)
```

#### API Metrics Endpoint
```bash
curl http://localhost:3000/metrics
```

### Key Metrics

#### Success Rate
```promql
(sum(rate(ai_jobs_total{status="success"}[5m])) / sum(rate(ai_jobs_total[5m]))) * 100
```

#### P95 Processing Time
```promql
histogram_quantile(0.95, sum(rate(ai_jobs_processing_duration_seconds_bucket[5m])) by (le))
```

#### Queue Size
```promql
ai_queue_size{status="waiting"}
```

#### Validation Pass Rate
```promql
ai_jobs_validation_pass_rate
```

### Alert Severity Levels

| Severity | Response Time | Notification |
|----------|--------------|--------------|
| **Critical** | Immediate (24/7) | Slack @channel + PagerDuty |
| **Warning** | 1 hour (business hours) | Slack |
| **Info** | Next business day | Slack (no @channel) |

### Alert Rules

#### HighAIJobFailureRate
- **Trigger**: Failure rate > 10% for 5 minutes
- **Action**: Check error logs, provider status
- **Escalation**: If > 25%, becomes critical

#### SlowAIJobProcessing
- **Trigger**: P95 > 15 seconds for 10 minutes
- **Action**: Check provider latency, increase concurrency

#### AIQueueCongestion
- **Trigger**: > 100 jobs waiting for 5 minutes
- **Action**: Scale workers, check provider availability

#### NoAIJobsProcessed
- **Trigger**: 0 jobs processed in 10 minutes
- **Action**: **CRITICAL** - Worker is down, restart immediately

---

## Common Operations

### Viewing Job Status

#### Using CLI Tool
```bash
# List all jobs
npm run ai:admin jobs list

# View specific job
npm run ai:admin jobs view <jobId>

# Filter by status
npm run ai:admin jobs list --status=failed --limit=100
```

#### Using API
```bash
# Get metrics
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/ai/jobs/metrics?hours=24

# Get job history
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/ai/jobs/history?limit=50
```

### Managing Dead Letter Queue (DLQ)

#### View DLQ
```bash
# List DLQ entries
npm run ai:admin dlq list

# View statistics
npm run ai:admin dlq stats
```

#### Retry Failed Jobs
```bash
# Retry from DLQ (only retryable jobs)
npm run ai:admin dlq retry <dlqJobId>

# Retry original job
npm run ai:admin jobs retry <jobId>
```

### Queue Management

#### Pause/Resume Processing
```bash
# Pause worker (stop processing new jobs)
npm run ai:admin queue pause

# Resume worker
npm run ai:admin queue resume
```

#### Clear Completed Jobs
```bash
# Clear completed and failed jobs (housekeeping)
npm run ai:admin queue clear

# Clear specific status
npm run ai:admin queue clear --status=completed
```

### Usage Reports

#### Generate Reports
```bash
# Current month
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/ai/usage/current-month

# Last 7 days
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/ai/usage/last-n-days?days=7

# Custom date range (CSV export)
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:3000/api/ai/usage/report?startDate=2025-10-01&endDate=2025-10-10&format=csv" \
  > usage-report.csv
```

---

## Troubleshooting

### High Failure Rate

#### Symptoms
- Prometheus alert: `HighAIJobFailureRate`
- Grafana shows success rate < 90%

#### Diagnosis
```bash
# Check error types
npm run ai:admin dlq stats

# View recent failures
npm run ai:admin jobs list --status=failed --limit=20

# Check API metrics
curl http://localhost:3000/api/ai/jobs/metrics
```

#### Common Causes

1. **Provider API Issues**
   ```bash
   # Check provider-specific failures
   # Look for patterns in error messages (rate limits, auth errors)
   npm run ai:admin dlq stats | grep "byProvider"
   ```

2. **Rate Limiting**
   - Error contains "rate limit" or "429"
   - Solution: Reduce worker concurrency or add delay

3. **Authentication Errors**
   - Error contains "401" or "unauthorized"
   - Solution: Check API keys in environment variables

4. **Validation Failures**
   - Check `ai_jobs_validation_pass_rate` metric
   - Review schema version compatibility

#### Resolution Steps

1. Identify error pattern using DLQ stats
2. If retryable (timeout, rate limit), retry from DLQ
3. If non-retryable (auth, validation), fix configuration
4. Monitor success rate after changes

### Slow Processing

#### Symptoms
- Alert: `SlowAIJobProcessing`
- P95 latency > 15 seconds

#### Diagnosis
```bash
# Check Prometheus P95 metric
# URL: http://localhost:9090/graph
# Query: histogram_quantile(0.95, sum(rate(ai_jobs_processing_duration_seconds_bucket[5m])) by (le, provider))

# Check queue congestion
npm run ai:admin jobs list --status=active
```

#### Common Causes

1. **Provider Latency**
   - Check provider status pages
   - Compare latency across providers

2. **Queue Congestion**
   - Too many jobs, not enough workers
   - Increase concurrency if resources allow

3. **Network Issues**
   - Check DNS resolution
   - Check firewall rules

#### Resolution Steps

1. Identify slow provider using Grafana
2. Consider switching to faster model
3. Increase worker concurrency (max 10 → 15)
4. Enable request caching if appropriate

### Queue Congestion

#### Symptoms
- Alert: `AIQueueCongestion` (>100 waiting)
- Alert: `AIQueueSeverelyCongested` (>500 waiting)

#### Diagnosis
```bash
# Check queue status
npm run ai:admin jobs list --status=waiting

# Check worker status
curl http://localhost:3000/api/health
```

#### Resolution Steps

1. **Verify worker is running**
   ```bash
   ps aux | grep ai-job.worker
   pm2 list
   ```

2. **Check worker logs**
   ```bash
   pm2 logs o4o-api --lines 100 | grep "ai-job"
   ```

3. **Increase concurrency** (edit `ai-job.worker.ts`)
   ```typescript
   private readonly CONCURRENCY = 15; // Increase from 10
   ```

4. **Scale horizontally** (multiple workers)
   - Run worker on separate instances
   - Share same Redis instance

### Worker Not Processing

#### Symptoms
- Alert: `NoAIJobsProcessed`
- No job completions in last 10 minutes

#### Immediate Actions (CRITICAL)

```bash
# 1. Check if process is running
pm2 status

# 2. Check logs
pm2 logs o4o-api --err --lines 50

# 3. Restart worker
pm2 restart o4o-api

# 4. Verify restart
npm run ai:admin jobs list --status=active
```

#### Root Cause Investigation

1. **Redis Connection Lost**
   ```bash
   redis-cli ping
   # Should return "PONG"
   ```

2. **Worker Crashed**
   - Check error logs: `pm2 logs --err`
   - Look for unhandled exceptions

3. **Resource Exhaustion**
   ```bash
   # Check memory
   free -h

   # Check CPU
   top
   ```

---

## Performance Tuning

### Worker Concurrency

**Current:** 10 jobs simultaneously
**Recommended Range:** 10-20 (based on available resources)

```typescript
// apps/api-server/src/workers/ai-job.worker.ts
private readonly CONCURRENCY = 10;
```

**Considerations:**
- Each job uses ~50-100MB RAM
- Each job makes 1 HTTP request to LLM provider
- Redis connection pool size

### Rate Limiting

**Current:** 20 jobs/second
**Adjust based on provider limits:**

```typescript
// apps/api-server/src/workers/ai-job.worker.ts
limiter: {
  max: 20, // Adjust this value
  duration: 1000, // Per second
}
```

### Redis Optimization

```bash
# Check Redis memory usage
redis-cli INFO memory

# Check connection count
redis-cli INFO clients

# Set max memory policy (evict completed jobs first)
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Retry Strategy

**Current:**
- Max Attempts: 3
- Backoff: Exponential with jitter (1s, 2s, 4s)

**Adjust for provider reliability:**

```typescript
// apps/api-server/src/services/ai-job-queue.service.ts
attempts: 3, // Increase for flaky providers
backoff: {
  type: 'exponential',
  delay: 1000, // Base delay in ms
}
```

---

## Cost Management

### Token Usage Tracking

#### View Current Usage
```bash
# Current month
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/ai/usage/current-month
```

#### Cost Breakdown

Usage reports include estimated costs based on:
- **Provider**: OpenAI, Anthropic, Google
- **Model**: GPT-4, Claude-3, etc.
- **Token Type**: Prompt vs Completion

#### Example Report
```json
{
  "totalEstimatedCost": 245.67,
  "byProvider": {
    "openai": {
      "totalTokens": 5000000,
      "estimatedCost": 150.00
    },
    "anthropic": {
      "totalTokens": 3000000,
      "estimatedCost": 95.67
    }
  }
}
```

### Cost Optimization Tips

1. **Use Cheaper Models When Possible**
   - GPT-3.5 instead of GPT-4 for simple tasks
   - Claude Haiku instead of Opus

2. **Implement Caching**
   - Cache common prompts/responses
   - Use shorter context windows

3. **Set Budget Alerts**
   ```yaml
   # config/alert_rules.yml
   - alert: HighTokenUsage
     expr: sum(rate(ai_llm_tokens_total[1h])) > 1000000
   ```

4. **Monitor Top Users**
   ```bash
   curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:3000/api/ai/usage/report?topUsersLimit=10"
   ```

---

## Runbooks

### Runbook: High Failure Rate (>10%)

**Alert:** `HighAIJobFailureRate`

#### Step 1: Identify Error Type
```bash
npm run ai:admin dlq stats
```

#### Step 2: Check Provider Status
- OpenAI: https://status.openai.com
- Anthropic: https://status.anthropic.com

#### Step 3: Analyze Errors

**If Rate Limit Errors:**
```bash
# Reduce concurrency temporarily
# Edit worker config, restart
pm2 restart o4o-api
```

**If Auth Errors:**
```bash
# Check API keys
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Restart with correct keys
pm2 restart o4o-api
```

**If Timeout Errors:**
```bash
# Retry from DLQ
npm run ai:admin dlq list
npm run ai:admin dlq retry <dlqJobId>
```

#### Step 4: Monitor Recovery
```bash
# Watch success rate in Grafana
# Should recover within 5 minutes
```

---

### Runbook: Queue Congestion (>100 waiting)

**Alert:** `AIQueueCongestion`

#### Step 1: Verify Worker Health
```bash
pm2 status
pm2 logs o4o-api --lines 20
```

#### Step 2: Check Active Jobs
```bash
npm run ai:admin jobs list --status=active
```

#### Step 3: Scale Up (If Needed)
```bash
# Option 1: Increase concurrency (requires code change + restart)
# Option 2: Start additional worker instance
npm run dev
```

#### Step 4: Monitor Queue Drain
```bash
# Watch queue size in Grafana
# Should decrease steadily
```

---

## Emergency Procedures

### Emergency Contact

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call Engineer | ops@example.com | 24/7 |
| Team Lead | lead@example.com | Business hours |
| Provider Support | See provider docs | Varies |

### Emergency Shutdown

```bash
# Stop processing new jobs immediately
npm run ai:admin queue pause

# Stop worker
pm2 stop o4o-api

# Stop Redis (if necessary)
sudo systemctl stop redis
```

### Emergency Restart

```bash
# Start Redis
sudo systemctl start redis

# Verify Redis
redis-cli ping

# Start worker
pm2 start o4o-api

# Resume queue
npm run ai:admin queue resume

# Verify recovery
npm run ai:admin jobs list --status=active
```

### Data Recovery

#### Export DLQ for Analysis
```bash
# Get all DLQ entries as JSON
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/ai/dlq?limit=10000 > dlq-export.json
```

#### Bulk Retry
```bash
# Retry all retryable jobs in DLQ
for jobId in $(cat dlq-export.json | jq -r '.data.entries[] | select(.canRetry == true) | .jobId'); do
  npm run ai:admin dlq retry $jobId
done
```

---

## Maintenance

### Daily Tasks

1. **Check Grafana dashboard** - Verify no ongoing alerts
2. **Review DLQ** - Clear non-retryable errors
3. **Monitor costs** - Check daily token usage

### Weekly Tasks

1. **Generate usage report** - Review cost trends
2. **Clean old jobs** - Clear completed jobs older than 7 days
3. **Review performance** - Check P95 latency trends

### Monthly Tasks

1. **Security audit** - Rotate API keys
2. **Cost review** - Generate monthly usage report
3. **Capacity planning** - Review traffic trends

---

## Appendix

### Environment Variables

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Prometheus
PROMETHEUS_PORT=9090

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Alert notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Useful Commands

```bash
# Health check
curl http://localhost:3000/api/health

# Metrics
curl http://localhost:3000/metrics

# Redis stats
redis-cli INFO stats

# Worker logs
pm2 logs o4o-api

# Clear Redis queue (DANGEROUS)
redis-cli FLUSHDB
```

### Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [OpenAI API Status](https://status.openai.com/)

---

**Document Version:** 1.0.0
**Last Reviewed:** 2025-10-11
**Next Review:** 2025-11-11
