# Phase 2.2 – Operations & Monitoring Expansion
## 계획 및 설계 문서

**버전**: 1.0
**작성일**: 2025-11-03
**상태**: 착수 승인됨
**목적**: 운영·모니터링·성능 최적화 통합 단계

---

## 📋 목차

1. [개요](#개요)
2. [아키텍처 설계](#아키텍처-설계)
3. [구현 단계별 계획](#구현-단계별-계획)
4. [기술 스택](#기술-스택)
5. [파일 구조](#파일-구조)
6. [데이터베이스 스키마 추가](#데이터베이스-스키마-추가)
7. [API 엔드포인트 설계](#api-엔드포인트-설계)
8. [성능 목표](#성능-목표)
9. [배포 전략](#배포-전략)
10. [품질 기준](#품질-기준)

---

## 개요

### Phase 2.2 목적
Phase 2.1에서 구축한 **클릭→전환→커미션** 폐루프를 기반으로:
- 운영진이 커미션·환불·정책을 실시간 관리
- 파트너·상품·정책 성과를 시각화
- Prometheus+Grafana 기반 심층 모니터링
- Redis·BullMQ·캐싱으로 성능 최적화 (1000 TPS 목표)

### 핵심 요구사항
```
A. Operations Panel (운영 패널)
   ├─ Commission Management: 수동 생성·조정·취소·지급 처리
   ├─ Refund & Adjustment: 환불 승인·금액 조정 워크플로우
   └─ Audit Trail Viewer: 모든 변경 이력 타임라인 조회

B. Dashboard Expansion (대시보드 확장)
   ├─ Funnel & KPI: 클릭→전환→커미션 단계별 전환율
   ├─ Policy Performance: 정책별 ROI·환불율·수익
   └─ Partner Tier Analytics: 파트너 등급별 성과·티어 승격 추천

C. Monitoring Enhancement (모니터링 심화)
   ├─ Prometheus: API 지연·에러율·처리량 메트릭
   ├─ Grafana: 실시간 대시보드 (Funnel, Performance, Alerts)
   └─ Alerting: Slack/Email 알림 (에러율 >5%, 지연 >500ms)

D. Performance Optimization (성능 최적화)
   ├─ Redis Rate Limiter: 메모리 기반 분산 제한
   ├─ Policy Cache: 정책 조회 캐싱 (TTL 5분)
   ├─ Async Webhooks: BullMQ로 웹훅 큐 처리
   └─ Batch Processing: 커미션 일괄 확정 (야간 배치)

E. Staging Validation (스테이징 검증)
   ├─ Load Testing: 1000 TPS 부하 테스트 (k6)
   ├─ Stress Testing: 장애 복구 시나리오
   └─ Canary Deployment: 10%→50%→100% 단계적 배포
```

---

## 아키텍처 설계

### 시스템 아키텍처 (Phase 2.2 추가 컴포넌트)

```
┌─────────────────────────────────────────────────────────────┐
│                      Admin Dashboard                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Commission   │  │ Refund &     │  │ Audit Trail  │      │
│  │ Management   │  │ Adjustment   │  │ Viewer       │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│  ┌──────▼──────────────────▼──────────────────▼───────┐     │
│  │         Dashboard API (New Endpoints)              │     │
│  └──────────────────────────┬──────────────────────────┘     │
└─────────────────────────────┼──────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Server (Express)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Controllers (New)                                    │   │
│  │  ├─ OperationsController (Commission CRUD)           │   │
│  │  ├─ DashboardController (Analytics/KPI)              │   │
│  │  └─ MetricsController (Prometheus metrics)           │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │  Services (Enhanced)                                  │   │
│  │  ├─ OperationsService (Refund/Adjust workflows)      │   │
│  │  ├─ AnalyticsService (Funnel/KPI calculations)       │   │
│  │  ├─ MetricsService (Prometheus client)               │   │
│  │  └─ CacheService (Redis layer)                       │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │  Queue Workers (BullMQ)                              │   │
│  │  ├─ WebhookQueue: Async webhook processing          │   │
│  │  ├─ CommissionQueue: Batch confirmation (cron)      │   │
│  │  └─ NotificationQueue: Alert delivery               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
    ┌───────────┐        ┌───────────┐      ┌─────────────┐
    │ PostgreSQL│        │   Redis   │      │ Prometheus  │
    │  (Main)   │        │  (Cache)  │      │  (Metrics)  │
    └───────────┘        └───────────┘      └──────┬──────┘
                                                    │
                                                    ▼
                                            ┌─────────────┐
                                            │   Grafana   │
                                            │ (Dashboard) │
                                            └─────────────┘
```

### 데이터 플로우 (Operations Panel 예시)

```
1. Admin requests commission adjustment
   └─> POST /api/v1/operations/commissions/:id/adjust

2. OperationsController validates request
   └─> Checks admin permissions (RBAC)
   └─> Validates adjustment reason & amount

3. OperationsService processes adjustment
   └─> Loads Commission entity
   └─> Calls commission.adjustAmount(newAmount, reason, adminId)
   └─> Saves audit trail in metadata.adjustmentHistory

4. Database transaction
   └─> UPDATE commissions SET amount=?, metadata=?, updatedAt=?
   └─> INSERT INTO audit_logs (entityType, entityId, action, adminId, changes)

5. Event emission
   └─> Emit 'commission.adjusted' event
   └─> WebhookQueue enqueues partner notification

6. Response to admin
   └─> Returns updated commission with new amount
   └─> Displays success message in UI

7. Metrics recording
   └─> Increment counter: operations_commission_adjustments_total
   └─> Record histogram: operations_adjustment_amount_dollars
```

---

## 구현 단계별 계획

### Stage 1: Database & Entities (Day 1-2)
**목표**: Audit logs 스키마 추가 및 기존 엔티티 메타데이터 확장

#### 1.1 Audit Log Entity
```typescript
// apps/api-server/src/entities/AuditLog.ts
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  entityType: string;  // 'commission', 'conversion', 'policy'

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;  // 'created', 'adjusted', 'cancelled', 'paid'

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'json', nullable: true })
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

#### 1.2 Migration
```sql
-- 2000000000002-CreateAuditLogTable.ts
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "entityType" varchar(100) NOT NULL,
  "entityId" uuid NOT NULL,
  "action" varchar(50) NOT NULL,
  "userId" uuid,
  "changes" jsonb,
  "reason" text,
  "ipAddress" varchar(50),
  "createdAt" timestamp DEFAULT now()
);

CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entityType", "entityId");
CREATE INDEX "IDX_audit_logs_user" ON "audit_logs" ("userId");
CREATE INDEX "IDX_audit_logs_created" ON "audit_logs" ("createdAt" DESC);
```

**검증**:
```bash
npm run migration:generate -- CreateAuditLogTable
npm run migration:run
npm run typeorm -- query "SELECT COUNT(*) FROM audit_logs"
```

---

### Stage 2: Operations Panel Backend (Day 3-5)
**목표**: Commission CRUD, Refund/Adjustment workflows, Audit trail API

#### 2.1 OperationsService
```typescript
// apps/api-server/src/services/OperationsService.ts
export class OperationsService {
  async adjustCommission(
    commissionId: string,
    newAmount: number,
    reason: string,
    adminId: string
  ): Promise<Commission> {
    const commission = await this.commissionRepo.findOne({
      where: { id: commissionId },
      relations: ['partner', 'product', 'policy']
    });

    if (!commission) throw new NotFoundException('Commission not found');
    if (commission.status === CommissionStatus.PAID) {
      throw new BadRequestException('Cannot adjust paid commission');
    }

    const oldAmount = commission.commissionAmount;
    commission.adjustAmount(newAmount, reason, adminId);

    await this.commissionRepo.save(commission);

    // Create audit log
    await this.auditLogRepo.save({
      entityType: 'commission',
      entityId: commissionId,
      action: 'adjusted',
      userId: adminId,
      changes: [{
        field: 'commissionAmount',
        oldValue: oldAmount,
        newValue: newAmount
      }],
      reason
    });

    // Emit event for webhook notification
    this.eventEmitter.emit('commission.adjusted', {
      commissionId,
      partnerId: commission.partnerId,
      oldAmount,
      newAmount,
      reason
    });

    return commission;
  }

  async processRefund(
    conversionId: string,
    refundAmount: number,
    reason: string,
    adminId: string
  ): Promise<Commission> {
    // Find commission by conversion
    const commission = await this.commissionRepo.findOne({
      where: { conversionId },
      relations: ['conversion']
    });

    if (!commission) throw new NotFoundException('Commission not found');

    // Cancel commission and record refund reason
    commission.cancel(reason, adminId);

    await this.commissionRepo.save(commission);

    // Create audit log
    await this.auditLogRepo.save({
      entityType: 'commission',
      entityId: commission.id,
      action: 'refunded',
      userId: adminId,
      changes: [{
        field: 'status',
        oldValue: commission.status,
        newValue: CommissionStatus.CANCELLED
      }],
      reason: `Refund processed: ${reason}`
    });

    return commission;
  }

  async getAuditTrail(
    entityType: string,
    entityId: string
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { entityType, entityId },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }

  async listCommissions(filters: {
    partnerId?: string;
    status?: CommissionStatus;
    dateFrom?: Date;
    dateTo?: Date;
    minAmount?: number;
    maxAmount?: number;
  }, pagination: { page: number; limit: number }): Promise<{
    commissions: Commission[];
    total: number;
  }> {
    const queryBuilder = this.commissionRepo.createQueryBuilder('commission')
      .leftJoinAndSelect('commission.partner', 'partner')
      .leftJoinAndSelect('commission.product', 'product')
      .leftJoinAndSelect('commission.policy', 'policy');

    if (filters.partnerId) {
      queryBuilder.andWhere('commission.partnerId = :partnerId', { partnerId: filters.partnerId });
    }
    if (filters.status) {
      queryBuilder.andWhere('commission.status = :status', { status: filters.status });
    }
    if (filters.dateFrom) {
      queryBuilder.andWhere('commission.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      queryBuilder.andWhere('commission.createdAt <= :dateTo', { dateTo: filters.dateTo });
    }
    if (filters.minAmount !== undefined) {
      queryBuilder.andWhere('commission.commissionAmount >= :minAmount', { minAmount: filters.minAmount });
    }
    if (filters.maxAmount !== undefined) {
      queryBuilder.andWhere('commission.commissionAmount <= :maxAmount', { maxAmount: filters.maxAmount });
    }

    const [commissions, total] = await queryBuilder
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .orderBy('commission.createdAt', 'DESC')
      .getManyAndCount();

    return { commissions, total };
  }
}
```

#### 2.2 OperationsController
```typescript
// apps/api-server/src/controllers/OperationsController.ts
export class OperationsController {
  @Post('/commissions/:id/adjust')
  @UseGuards(AuthGuard, RoleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
  async adjustCommission(
    @Param('id') id: string,
    @Body() dto: AdjustCommissionDto,
    @CurrentUser() admin: User
  ) {
    const commission = await this.operationsService.adjustCommission(
      id,
      dto.newAmount,
      dto.reason,
      admin.id
    );

    return {
      success: true,
      data: commission,
      message: `Commission adjusted from $${commission.metadata.adjustmentHistory[commission.metadata.adjustmentHistory.length - 2]?.newAmount || 0} to $${dto.newAmount}`
    };
  }

  @Post('/refunds')
  @UseGuards(AuthGuard, RoleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
  async processRefund(
    @Body() dto: ProcessRefundDto,
    @CurrentUser() admin: User
  ) {
    const commission = await this.operationsService.processRefund(
      dto.conversionId,
      dto.refundAmount,
      dto.reason,
      admin.id
    );

    return {
      success: true,
      data: commission,
      message: `Refund processed for conversion ${dto.conversionId}`
    };
  }

  @Get('/commissions')
  @UseGuards(AuthGuard, RoleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
  async listCommissions(
    @Query() filters: CommissionFiltersDto,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    const result = await this.operationsService.listCommissions(filters, { page, limit });

    return {
      success: true,
      data: result.commissions,
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      }
    };
  }

  @Get('/audit-trail/:entityType/:entityId')
  @UseGuards(AuthGuard, RoleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
  async getAuditTrail(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string
  ) {
    const trail = await this.operationsService.getAuditTrail(entityType, entityId);

    return {
      success: true,
      data: trail
    };
  }
}
```

#### 2.3 Routes Registration
```typescript
// apps/api-server/src/routes/v1/operations.routes.ts
import { Router } from 'express';
import { OperationsController } from '../../controllers/OperationsController.js';
import { authenticate, requireAnyRole } from '../../middleware/auth.middleware.js';
import { UserRole } from '../../entities/User.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const operationsController = new OperationsController();

const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});

const adminOnly = requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

// Commission Management
router.get('/commissions', authenticate, adminRateLimiter, adminOnly, operationsController.listCommissions);
router.post('/commissions/:id/adjust', authenticate, adminRateLimiter, adminOnly, operationsController.adjustCommission);
router.post('/commissions/:id/cancel', authenticate, adminRateLimiter, adminOnly, operationsController.cancelCommission);
router.post('/commissions/:id/pay', authenticate, adminRateLimiter, adminOnly, operationsController.markCommissionAsPaid);

// Refund Processing
router.post('/refunds', authenticate, adminRateLimiter, adminOnly, operationsController.processRefund);

// Audit Trail
router.get('/audit-trail/:entityType/:entityId', authenticate, adminRateLimiter, adminOnly, operationsController.getAuditTrail);

export default router;
```

**검증**:
```bash
# Test commission listing
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:4000/api/v1/operations/commissions?status=pending&page=1&limit=10"

# Test commission adjustment
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newAmount": 15.50, "reason": "Partner tier upgrade"}' \
  http://localhost:4000/api/v1/operations/commissions/$COMMISSION_ID/adjust

# Test audit trail
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:4000/api/v1/operations/audit-trail/commission/$COMMISSION_ID"
```

---

### Stage 3: Analytics & Dashboard Backend (Day 6-8)
**목표**: Funnel/KPI 계산, Policy performance, Partner tier analytics

#### 3.1 AnalyticsService
```typescript
// apps/api-server/src/services/AnalyticsService.ts
export class AnalyticsService {
  async getFunnelMetrics(dateFrom: Date, dateTo: Date): Promise<{
    clicks: number;
    conversions: number;
    commissions: number;
    clickToConversionRate: number;
    conversionToCommissionRate: number;
    totalRevenue: number;
    totalCommissionAmount: number;
  }> {
    const clicks = await this.clickRepo.count({
      where: { timestamp: Between(dateFrom, dateTo) }
    });

    const conversions = await this.conversionRepo.count({
      where: { timestamp: Between(dateFrom, dateTo) }
    });

    const commissionsData = await this.commissionRepo
      .createQueryBuilder('commission')
      .select('COUNT(commission.id)', 'count')
      .addSelect('SUM(commission.commissionAmount)', 'totalAmount')
      .where('commission.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne();

    const conversionsData = await this.conversionRepo
      .createQueryBuilder('conversion')
      .select('SUM(conversion.orderValue)', 'totalRevenue')
      .where('conversion.timestamp BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .getRawOne();

    return {
      clicks,
      conversions,
      commissions: parseInt(commissionsData.count) || 0,
      clickToConversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
      conversionToCommissionRate: conversions > 0 ? (commissionsData.count / conversions) * 100 : 0,
      totalRevenue: parseFloat(conversionsData.totalRevenue) || 0,
      totalCommissionAmount: parseFloat(commissionsData.totalAmount) || 0
    };
  }

  async getPolicyPerformance(dateFrom: Date, dateTo: Date): Promise<Array<{
    policyId: string;
    policyName: string;
    totalCommissions: number;
    totalAmount: number;
    avgCommission: number;
    refundRate: number;
    roi: number;
  }>> {
    const policies = await this.policyRepo.find({ where: { isActive: true } });

    const performanceData = await Promise.all(policies.map(async (policy) => {
      const commissionsData = await this.commissionRepo
        .createQueryBuilder('commission')
        .select('COUNT(commission.id)', 'count')
        .addSelect('SUM(commission.commissionAmount)', 'totalAmount')
        .addSelect('COUNT(CASE WHEN commission.status = :cancelled THEN 1 END)', 'refunded')
        .where('commission.policyId = :policyId', { policyId: policy.id })
        .andWhere('commission.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
        .setParameter('cancelled', CommissionStatus.CANCELLED)
        .getRawOne();

      const totalCommissions = parseInt(commissionsData.count) || 0;
      const totalAmount = parseFloat(commissionsData.totalAmount) || 0;
      const refunded = parseInt(commissionsData.refunded) || 0;

      return {
        policyId: policy.id,
        policyName: policy.name,
        totalCommissions,
        totalAmount,
        avgCommission: totalCommissions > 0 ? totalAmount / totalCommissions : 0,
        refundRate: totalCommissions > 0 ? (refunded / totalCommissions) * 100 : 0,
        roi: 0  // TODO: Calculate based on cost of goods/services
      };
    }));

    return performanceData.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  async getPartnerTierAnalytics(dateFrom: Date, dateTo: Date): Promise<Array<{
    partnerId: string;
    partnerName: string;
    currentTier: string;
    totalClicks: number;
    totalConversions: number;
    totalCommissions: number;
    totalEarnings: number;
    conversionRate: number;
    recommendedTier: string;
  }>> {
    const partners = await this.partnerRepo.find({ where: { isActive: true } });

    const analytics = await Promise.all(partners.map(async (partner) => {
      const clicks = await this.clickRepo.count({
        where: { partnerId: partner.id, timestamp: Between(dateFrom, dateTo) }
      });

      const conversions = await this.conversionRepo.count({
        where: { partnerId: partner.id, timestamp: Between(dateFrom, dateTo) }
      });

      const commissionsData = await this.commissionRepo
        .createQueryBuilder('commission')
        .select('COUNT(commission.id)', 'count')
        .addSelect('SUM(commission.commissionAmount)', 'totalEarnings')
        .where('commission.partnerId = :partnerId', { partnerId: partner.id })
        .andWhere('commission.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
        .andWhere('commission.status != :cancelled', { cancelled: CommissionStatus.CANCELLED })
        .getRawOne();

      const totalCommissions = parseInt(commissionsData.count) || 0;
      const totalEarnings = parseFloat(commissionsData.totalEarnings) || 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

      // Simple tier recommendation logic
      let recommendedTier = 'Bronze';
      if (totalEarnings > 10000 && conversionRate > 5) recommendedTier = 'Gold';
      else if (totalEarnings > 5000 && conversionRate > 3) recommendedTier = 'Silver';

      return {
        partnerId: partner.id,
        partnerName: partner.name || partner.email,
        currentTier: partner.tier || 'Bronze',
        totalClicks: clicks,
        totalConversions: conversions,
        totalCommissions,
        totalEarnings,
        conversionRate,
        recommendedTier
      };
    }));

    return analytics.sort((a, b) => b.totalEarnings - a.totalEarnings);
  }
}
```

#### 3.2 DashboardController
```typescript
// apps/api-server/src/controllers/DashboardController.ts
export class DashboardController {
  @Get('/funnel')
  @UseGuards(AuthGuard, RoleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
  async getFunnelMetrics(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string
  ) {
    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();

    const metrics = await this.analyticsService.getFunnelMetrics(from, to);

    return {
      success: true,
      data: metrics,
      period: { from, to }
    };
  }

  @Get('/policy-performance')
  @UseGuards(AuthGuard, RoleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
  async getPolicyPerformance(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string
  ) {
    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();

    const performance = await this.analyticsService.getPolicyPerformance(from, to);

    return {
      success: true,
      data: performance,
      period: { from, to }
    };
  }

  @Get('/partner-tier-analytics')
  @UseGuards(AuthGuard, RoleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
  async getPartnerTierAnalytics(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string
  ) {
    const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();

    const analytics = await this.analyticsService.getPartnerTierAnalytics(from, to);

    return {
      success: true,
      data: analytics,
      period: { from, to }
    };
  }
}
```

**검증**:
```bash
# Test funnel metrics
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:4000/api/v1/dashboard/funnel?dateFrom=2025-10-01&dateTo=2025-10-31"

# Test policy performance
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:4000/api/v1/dashboard/policy-performance?dateFrom=2025-10-01&dateTo=2025-10-31"

# Test partner tier analytics
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:4000/api/v1/dashboard/partner-tier-analytics?dateFrom=2025-10-01&dateTo=2025-10-31"
```

---

### Stage 4: Performance Optimization (Day 9-11)
**목표**: Redis rate limiter, Policy cache, BullMQ webhooks, Batch processing

#### 4.1 Redis Setup
```bash
# Install dependencies
pnpm add ioredis @nestjs/bull bull @nestjs/cache-manager cache-manager-ioredis

# Docker Compose update
cat >> docker-compose.yml <<EOF

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  postgres-data:
  redis-data:
EOF
```

#### 4.2 CacheService
```typescript
// apps/api-server/src/services/CacheService.ts
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(...keys);
    return values.map(v => v ? JSON.parse(v) : null);
  }

  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(key, ttlSeconds);
  }

  // Rate limiting helper
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ratelimit:${identifier}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    const ttl = await this.redis.ttl(key);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current)
    };
  }
}
```

#### 4.3 Policy Cache Middleware
```typescript
// apps/api-server/src/middleware/cache.middleware.ts
export function cachePolicy(ttlSeconds: number = 300) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = `policy:${req.params.id || 'all'}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    // Override res.json to cache response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (body.success && body.data) {
        cacheService.set(cacheKey, body.data, ttlSeconds).catch(err => {
          console.error('Cache set error:', err);
        });
      }
      return originalJson(body);
    };

    next();
  };
}

// Usage in routes
router.get('/policies/:id', cachePolicy(300), policyController.getById);
router.get('/policies', cachePolicy(60), policyController.list);
```

#### 4.4 BullMQ Queue Setup
```typescript
// apps/api-server/src/queues/webhook.queue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null
});

export const webhookQueue = new Queue('webhooks', { connection });

export const webhookWorker = new Worker(
  'webhooks',
  async (job) => {
    const { partnerId, event, payload } = job.data;

    try {
      const partner = await partnerRepo.findOne({ where: { id: partnerId } });
      if (!partner || !partner.webhookUrl) {
        throw new Error('Partner webhook URL not configured');
      }

      const response = await fetch(partner.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': generateSignature(payload, partner.webhookSecret)
        },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          data: payload
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      console.log(`Webhook delivered to partner ${partnerId}: ${event}`);
    } catch (error) {
      console.error(`Webhook delivery failed:`, error);
      throw error;  // Will trigger retry
    }
  },
  {
    connection,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 1000  // 100 webhooks per second max
    }
  }
);

// Add retry strategy
webhookWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error:`, err.message);
  // BullMQ will auto-retry based on job options
});
```

#### 4.5 Commission Batch Processing
```typescript
// apps/api-server/src/jobs/commission-batch.job.ts
import { Queue, Worker } from 'bullmq';

export const commissionBatchQueue = new Queue('commission-batch', { connection });

export const commissionBatchWorker = new Worker(
  'commission-batch',
  async (job) => {
    const { batchDate } = job.data;

    // Find all commissions past hold period
    const commissionsToConfirm = await commissionRepo.find({
      where: {
        status: CommissionStatus.PENDING,
        holdUntil: LessThan(new Date())
      },
      relations: ['partner', 'conversion']
    });

    console.log(`Processing ${commissionsToConfirm.length} commissions for auto-confirmation`);

    let confirmed = 0;
    let failed = 0;

    for (const commission of commissionsToConfirm) {
      try {
        commission.confirm();
        await commissionRepo.save(commission);

        // Create audit log
        await auditLogRepo.save({
          entityType: 'commission',
          entityId: commission.id,
          action: 'auto_confirmed',
          changes: [{
            field: 'status',
            oldValue: CommissionStatus.PENDING,
            newValue: CommissionStatus.CONFIRMED
          }],
          reason: 'Auto-confirmed after hold period'
        });

        confirmed++;
      } catch (error) {
        console.error(`Failed to confirm commission ${commission.id}:`, error);
        failed++;
      }
    }

    return {
      total: commissionsToConfirm.length,
      confirmed,
      failed
    };
  },
  {
    connection,
    concurrency: 1  // Sequential processing for batch jobs
  }
);

// Schedule daily at 2 AM
import cron from 'node-cron';

cron.schedule('0 2 * * *', async () => {
  await commissionBatchQueue.add('daily-confirmation', {
    batchDate: new Date().toISOString()
  });
  console.log('Commission batch job scheduled');
});
```

**검증**:
```bash
# Test Redis connection
redis-cli ping

# Test cache hit/miss
curl -w "\nTime: %{time_total}s\n" http://localhost:4000/api/v1/policies  # First call (miss)
curl -w "\nTime: %{time_total}s\n" http://localhost:4000/api/v1/policies  # Second call (hit)

# Test webhook queue
curl -X POST -H "Content-Type: application/json" \
  -d '{"partnerId": "xxx", "event": "test", "payload": {}}' \
  http://localhost:4000/api/v1/test/webhook-queue

# Monitor queues
npx bull-board  # Web UI at http://localhost:3000
```

---

### Stage 5: Monitoring & Metrics (Day 12-14)
**목표**: Prometheus integration, Grafana dashboards, Alerting

#### 5.1 Prometheus Metrics
```typescript
// apps/api-server/src/services/MetricsService.ts
import client from 'prom-client';

export class MetricsService {
  private register: client.Registry;

  // Counters
  private httpRequestsTotal: client.Counter;
  private commissionsCreatedTotal: client.Counter;
  private conversionsTrackedTotal: client.Counter;
  private webhooksDeliveredTotal: client.Counter;
  private webhooksFailedTotal: client.Counter;

  // Histograms
  private httpRequestDuration: client.Histogram;
  private commissionAmountDollars: client.Histogram;
  private webhookDeliveryDuration: client.Histogram;

  // Gauges
  private commissionsInProgress: client.Gauge;
  private activePartnersCount: client.Gauge;
  private cacheHitRate: client.Gauge;

  constructor() {
    this.register = new client.Registry();

    // Default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ register: this.register });

    // HTTP Requests
    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.register]
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
      registers: [this.register]
    });

    // Commissions
    this.commissionsCreatedTotal = new client.Counter({
      name: 'commissions_created_total',
      help: 'Total number of commissions created',
      labelNames: ['status', 'policy_type'],
      registers: [this.register]
    });

    this.commissionAmountDollars = new client.Histogram({
      name: 'commission_amount_dollars',
      help: 'Commission amount in dollars',
      labelNames: ['policy_type'],
      buckets: [1, 5, 10, 20, 50, 100, 200, 500],
      registers: [this.register]
    });

    this.commissionsInProgress = new client.Gauge({
      name: 'commissions_in_progress',
      help: 'Number of commissions currently being processed',
      registers: [this.register]
    });

    // Conversions
    this.conversionsTrackedTotal = new client.Counter({
      name: 'conversions_tracked_total',
      help: 'Total number of conversions tracked',
      labelNames: ['status'],
      registers: [this.register]
    });

    // Webhooks
    this.webhooksDeliveredTotal = new client.Counter({
      name: 'webhooks_delivered_total',
      help: 'Total number of webhooks delivered successfully',
      labelNames: ['event_type'],
      registers: [this.register]
    });

    this.webhooksFailedTotal = new client.Counter({
      name: 'webhooks_failed_total',
      help: 'Total number of failed webhook deliveries',
      labelNames: ['event_type', 'error_type'],
      registers: [this.register]
    });

    this.webhookDeliveryDuration = new client.Histogram({
      name: 'webhook_delivery_duration_seconds',
      help: 'Webhook delivery duration in seconds',
      labelNames: ['event_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register]
    });

    // Cache
    this.cacheHitRate = new client.Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate percentage',
      registers: [this.register]
    });

    this.activePartnersCount = new client.Gauge({
      name: 'active_partners_count',
      help: 'Number of active partners',
      registers: [this.register]
    });
  }

  // Record HTTP request
  recordHttpRequest(method: string, path: string, status: number, durationSeconds: number) {
    this.httpRequestsTotal.labels(method, path, status.toString()).inc();
    this.httpRequestDuration.labels(method, path, status.toString()).observe(durationSeconds);
  }

  // Record commission creation
  recordCommissionCreated(status: string, policyType: string, amount: number) {
    this.commissionsCreatedTotal.labels(status, policyType).inc();
    this.commissionAmountDollars.labels(policyType).observe(amount);
  }

  // Record webhook delivery
  recordWebhookDelivery(eventType: string, success: boolean, durationSeconds: number, errorType?: string) {
    if (success) {
      this.webhooksDeliveredTotal.labels(eventType).inc();
    } else {
      this.webhooksFailedTotal.labels(eventType, errorType || 'unknown').inc();
    }
    this.webhookDeliveryDuration.labels(eventType).observe(durationSeconds);
  }

  // Update gauges (called periodically)
  async updateGauges() {
    const pendingCount = await commissionRepo.count({
      where: { status: CommissionStatus.PENDING }
    });
    this.commissionsInProgress.set(pendingCount);

    const activePartners = await partnerRepo.count({
      where: { isActive: true }
    });
    this.activePartnersCount.set(activePartners);
  }

  // Get metrics for Prometheus scraping
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}

// Middleware to record HTTP metrics
export function metricsMiddleware(metricsService: MetricsService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      metricsService.recordHttpRequest(
        req.method,
        req.route?.path || req.path,
        res.statusCode,
        duration
      );
    });

    next();
  };
}
```

#### 5.2 Metrics Endpoint
```typescript
// apps/api-server/src/routes/v1/metrics.routes.ts
import { Router } from 'express';
import { metricsService } from '../../services/MetricsService.js';

const router = Router();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(await metricsService.getMetrics());
});

export default router;

// Register in main app
app.use('/api/v1', metricsRoutes);

// Update gauges every 30 seconds
setInterval(() => {
  metricsService.updateGauges().catch(err => {
    console.error('Failed to update metrics gauges:', err);
  });
}, 30000);
```

#### 5.3 Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'o4o-api-server'
    static_configs:
      - targets: ['api.neture.co.kr:4000']
    metrics_path: '/api/v1/metrics'
    scheme: https

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['43.202.242.215:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alerts.yml'
```

#### 5.4 Alert Rules
```yaml
# alerts.yml
groups:
  - name: o4o_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% over the last 5 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is {{ $value }}s"

      - alert: WebhookFailureRate
        expr: rate(webhooks_failed_total[5m]) / rate(webhooks_delivered_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High webhook failure rate"
          description: "Webhook failure rate is {{ $value }}%"

      - alert: CommissionProcessingStalled
        expr: commissions_in_progress > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Commission processing may be stalled"
          description: "{{ $value }} commissions in pending state"
```

#### 5.5 Grafana Dashboard JSON
```json
{
  "dashboard": {
    "title": "O4O Platform - Phase 2.2 Monitoring",
    "panels": [
      {
        "id": 1,
        "title": "Conversion Funnel",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{path=\"/api/v1/tracking/click\"}[5m])",
            "legendFormat": "Clicks"
          },
          {
            "expr": "rate(conversions_tracked_total[5m])",
            "legendFormat": "Conversions"
          },
          {
            "expr": "rate(commissions_created_total[5m])",
            "legendFormat": "Commissions"
          }
        ]
      },
      {
        "id": 2,
        "title": "API Latency (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95 latency"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      },
      {
        "id": 4,
        "title": "Commission Amount Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(commission_amount_dollars_bucket[5m])",
            "format": "heatmap"
          }
        ]
      },
      {
        "id": 5,
        "title": "Webhook Delivery Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(webhooks_delivered_total[5m]) / (rate(webhooks_delivered_total[5m]) + rate(webhooks_failed_total[5m]))",
            "legendFormat": "Success Rate"
          }
        ]
      }
    ]
  }
}
```

**배포 및 검증**:
```bash
# Deploy Prometheus on API server
ssh o4o-api
cd /opt/prometheus
sudo ./prometheus --config.file=prometheus.yml &

# Deploy Grafana on web server
ssh o4o-web
sudo docker run -d -p 3001:3000 --name grafana grafana/grafana

# Access Grafana: https://admin.neture.co.kr:3001
# Add Prometheus data source: http://43.202.242.215:9090

# Test metrics endpoint
curl http://localhost:4000/api/v1/metrics

# Verify alerts
curl http://43.202.242.215:9090/api/v1/alerts
```

---

### Stage 6: Testing & Validation (Day 15-17)
**목표**: Load testing (1000 TPS), Stress testing, Canary deployment

#### 6.1 Load Testing with k6
```javascript
// tests/load/phase2.2-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const clickDuration = new Trend('click_duration');
const conversionDuration = new Trend('conversion_duration');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 500 },   // Ramp up to 500 users
    { duration: '10m', target: 1000 }, // Target: 1000 concurrent users
    { duration: '5m', target: 500 },   // Ramp down
    { duration: '2m', target: 0 }      // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    errors: ['rate<0.05'],             // Error rate under 5%
    click_duration: ['p(95)<200'],     // Click tracking under 200ms
    conversion_duration: ['p(95)<300'] // Conversion tracking under 300ms
  }
};

const BASE_URL = 'https://api.neture.co.kr';
const PARTNER_ID = 'test-partner-uuid';

export default function () {
  // Test 1: Click tracking (public endpoint)
  const clickPayload = JSON.stringify({
    partnerId: PARTNER_ID,
    productId: 'test-product-uuid',
    source: 'web',
    referer: 'https://example.com'
  });

  const clickStart = Date.now();
  const clickRes = http.post(`${BASE_URL}/api/v1/tracking/click`, clickPayload, {
    headers: { 'Content-Type': 'application/json' }
  });
  clickDuration.add(Date.now() - clickStart);

  check(clickRes, {
    'click status is 200': (r) => r.status === 200,
    'click has clickId': (r) => JSON.parse(r.body).data?.clickId !== undefined
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Conversion tracking (authenticated)
  const clickId = JSON.parse(clickRes.body).data?.clickId;
  if (clickId) {
    const conversionPayload = JSON.stringify({
      clickId,
      orderId: `order-${Date.now()}`,
      orderValue: 100.00,
      currency: 'USD'
    });

    const conversionStart = Date.now();
    const conversionRes = http.post(`${BASE_URL}/api/v1/tracking/conversion`, conversionPayload, {
      headers: { 'Content-Type': 'application/json' }
    });
    conversionDuration.add(Date.now() - conversionStart);

    check(conversionRes, {
      'conversion status is 200': (r) => r.status === 200,
      'conversion has conversionId': (r) => JSON.parse(r.body).data?.conversionId !== undefined
    }) || errorRate.add(1);
  }

  sleep(2);

  // Test 3: Policy lookup (cached endpoint)
  const policyRes = http.get(`${BASE_URL}/api/v1/policies`);
  check(policyRes, {
    'policy status is 200': (r) => r.status === 200,
    'policy response time <100ms': (r) => r.timings.duration < 100  // Should be cached
  }) || errorRate.add(1);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}
```

**실행**:
```bash
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Linux

# Run load test
k6 run tests/load/phase2.2-load-test.js

# Expected output:
# ✓ 95th percentile < 500ms
# ✓ Error rate < 5%
# ✓ Throughput > 1000 req/s
```

#### 6.2 Stress Testing
```javascript
// tests/load/stress-test.js
export const options = {
  stages: [
    { duration: '2m', target: 2000 },  // Beyond normal capacity
    { duration: '5m', target: 5000 },  // Extreme load
    { duration: '2m', target: 0 }      // Recovery
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'],     // Allow 10% failure under stress
    http_req_duration: ['p(99)<2000']  // 99% under 2s
  }
};

// Same test logic as load test
```

#### 6.3 Canary Deployment Script
```bash
#!/bin/bash
# scripts/canary-deploy.sh

set -e

API_SERVER="o4o-api"
HEALTH_ENDPOINT="https://api.neture.co.kr/health"

echo "=== Phase 2.2 Canary Deployment ==="

# Stage 1: Deploy to 10% of traffic
echo "Stage 1: Deploying to 10% traffic..."
ssh $API_SERVER << 'EOF'
  cd /home/ubuntu/o4o-platform
  git pull origin main
  pnpm install --frozen-lockfile
  pnpm run build

  # Start canary instance on port 4001
  NODE_ENV=production PORT=4001 npx pm2 start dist/main.js --name o4o-api-canary

  # Update nginx to route 10% to canary
  sudo sed -i 's/# canary 10%/upstream api_canary { server 127.0.0.1:4001 weight=1; server 127.0.0.1:4000 weight=9; }/' /etc/nginx/sites-available/api
  sudo nginx -s reload
EOF

echo "Waiting 5 minutes for metrics..."
sleep 300

# Check error rate
ERROR_RATE=$(curl -s "http://43.202.242.215:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" | jq -r '.data.result[0].value[1]')
if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
  echo "ERROR: High error rate ($ERROR_RATE), rolling back..."
  ssh $API_SERVER "npx pm2 delete o4o-api-canary && sudo nginx -s reload"
  exit 1
fi

# Stage 2: 50% traffic
echo "Stage 2: Deploying to 50% traffic..."
ssh $API_SERVER "sudo sed -i 's/weight=1; server 127.0.0.1:4000 weight=9/weight=5; server 127.0.0.1:4000 weight=5/' /etc/nginx/sites-available/api && sudo nginx -s reload"

sleep 300

# Stage 3: 100% traffic
echo "Stage 3: Deploying to 100% traffic..."
ssh $API_SERVER << 'EOF'
  npx pm2 delete o4o-api-server
  npx pm2 restart o4o-api-canary
  npx pm2 save

  # Restore nginx to single upstream
  sudo sed -i 's/upstream api_canary.*/upstream api { server 127.0.0.1:4001; }/' /etc/nginx/sites-available/api
  sudo nginx -s reload
EOF

echo "=== Canary deployment completed successfully ==="
```

---

## 기술 스택

### Backend (Enhanced)
- **Framework**: Express.js + TypeScript
- **ORM**: TypeORM
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+ (ioredis)
- **Queue**: BullMQ (Redis-based)
- **Metrics**: prom-client (Prometheus)
- **Validation**: class-validator, class-transformer
- **Rate Limiting**: express-rate-limit + Redis

### Frontend (New - Admin Dashboard)
- **Framework**: React 18 + TypeScript
- **UI Library**: Material-UI v5 / Ant Design
- **State Management**: Zustand / React Query
- **Charts**: Recharts / Chart.js
- **Date Handling**: date-fns
- **API Client**: axios (using authClient pattern)

### Monitoring Stack
- **Metrics**: Prometheus 2.x
- **Visualization**: Grafana 9.x
- **Alerting**: Alertmanager
- **Logs**: (Future: Loki)

### Testing
- **Load Testing**: k6
- **API Testing**: Jest + Supertest
- **E2E Testing**: (Future: Playwright)

---

## 파일 구조

```
apps/api-server/
├── src/
│   ├── entities/
│   │   ├── AuditLog.ts                    [NEW]
│   │   ├── Commission.ts                  [EXISTS]
│   │   ├── CommissionPolicy.ts            [EXISTS]
│   │   ├── ConversionEvent.ts             [EXISTS]
│   │   └── ReferralClick.ts               [EXISTS]
│   │
│   ├── services/
│   │   ├── OperationsService.ts           [NEW] - Commission CRUD, Refund workflows
│   │   ├── AnalyticsService.ts            [NEW] - Funnel, KPI, Policy performance
│   │   ├── CacheService.ts                [NEW] - Redis cache layer
│   │   ├── MetricsService.ts              [NEW] - Prometheus metrics
│   │   ├── CommissionEngine.ts            [EXISTS]
│   │   └── TrackingService.ts             [EXISTS]
│   │
│   ├── controllers/
│   │   ├── OperationsController.ts        [NEW] - Admin operations endpoints
│   │   ├── DashboardController.ts         [NEW] - Analytics endpoints
│   │   ├── MetricsController.ts           [NEW] - Prometheus /metrics
│   │   └── TrackingController.ts          [EXISTS]
│   │
│   ├── routes/v1/
│   │   ├── operations.routes.ts           [NEW]
│   │   ├── dashboard.routes.ts            [NEW]
│   │   ├── metrics.routes.ts              [NEW]
│   │   └── tracking.routes.ts             [EXISTS]
│   │
│   ├── queues/
│   │   ├── webhook.queue.ts               [NEW] - Async webhook delivery
│   │   ├── commission-batch.queue.ts      [NEW] - Batch processing
│   │   └── notification.queue.ts          [NEW] - Alert delivery
│   │
│   ├── jobs/
│   │   ├── commission-batch.job.ts        [NEW] - Daily auto-confirmation
│   │   └── metrics-updater.job.ts         [NEW] - Gauge updates
│   │
│   ├── middleware/
│   │   ├── cache.middleware.ts            [NEW] - Policy cache
│   │   ├── metrics.middleware.ts          [NEW] - HTTP metrics recording
│   │   ├── auth.middleware.ts             [EXISTS]
│   │   └── rate-limit.middleware.ts       [EXISTS]
│   │
│   └── database/
│       └── migrations/
│           ├── 2000000000001-CreateCommissionTable.ts  [EXISTS]
│           └── 2000000000002-CreateAuditLogTable.ts    [NEW]
│
├── tests/
│   ├── load/
│   │   ├── phase2.2-load-test.js          [NEW] - k6 load testing
│   │   └── stress-test.js                 [NEW] - k6 stress testing
│   │
│   └── integration/
│       ├── operations.test.ts             [NEW]
│       └── dashboard.test.ts              [NEW]
│
└── config/
    ├── prometheus.yml                     [NEW]
    ├── alerts.yml                         [NEW]
    └── grafana-dashboard.json             [NEW]

apps/admin/  (Frontend - New)
├── src/
│   ├── pages/
│   │   ├── CommissionManagement.tsx       [NEW]
│   │   ├── RefundPanel.tsx                [NEW]
│   │   ├── AuditTrailViewer.tsx           [NEW]
│   │   ├── FunnelDashboard.tsx            [NEW]
│   │   ├── PolicyPerformance.tsx          [NEW]
│   │   └── PartnerTierAnalytics.tsx       [NEW]
│   │
│   ├── components/
│   │   ├── CommissionTable.tsx            [NEW]
│   │   ├── FunnelChart.tsx                [NEW]
│   │   ├── KPICard.tsx                    [NEW]
│   │   └── AuditTimeline.tsx              [NEW]
│   │
│   └── api/
│       ├── operations.api.ts              [NEW]
│       └── dashboard.api.ts               [NEW]

scripts/
├── canary-deploy.sh                       [NEW]
├── load-test-runner.sh                    [NEW]
└── deploy-phase2.2.sh                     [NEW]
```

---

## 데이터베이스 스키마 추가

### AuditLog Table
```sql
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "entityType" varchar(100) NOT NULL,
  "entityId" uuid NOT NULL,
  "action" varchar(50) NOT NULL,
  "userId" uuid REFERENCES users(id) ON DELETE SET NULL,
  "changes" jsonb,
  "reason" text,
  "ipAddress" varchar(50),
  "createdAt" timestamp DEFAULT now(),

  INDEX "IDX_audit_logs_entity" ("entityType", "entityId"),
  INDEX "IDX_audit_logs_user" ("userId"),
  INDEX "IDX_audit_logs_created" ("createdAt" DESC)
);
```

**예시 데이터**:
```json
{
  "id": "audit-uuid-1",
  "entityType": "commission",
  "entityId": "commission-uuid-123",
  "action": "adjusted",
  "userId": "admin-uuid-1",
  "changes": [
    {
      "field": "commissionAmount",
      "oldValue": 10.00,
      "newValue": 15.50
    }
  ],
  "reason": "Partner tier upgraded to Silver",
  "ipAddress": "203.0.113.42",
  "createdAt": "2025-11-03T10:30:00Z"
}
```

---

## API 엔드포인트 설계

### Operations API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/operations/commissions` | Admin | List commissions with filters |
| POST | `/api/v1/operations/commissions/:id/adjust` | Admin | Adjust commission amount |
| POST | `/api/v1/operations/commissions/:id/cancel` | Admin | Cancel commission |
| POST | `/api/v1/operations/commissions/:id/pay` | Admin | Mark as paid |
| POST | `/api/v1/operations/refunds` | Admin | Process refund |
| GET | `/api/v1/operations/audit-trail/:type/:id` | Admin | Get audit trail |

### Dashboard API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/dashboard/funnel` | Admin | Funnel metrics (click→conversion→commission) |
| GET | `/api/v1/dashboard/policy-performance` | Admin | Policy performance analysis |
| GET | `/api/v1/dashboard/partner-tier-analytics` | Admin | Partner tier analytics |
| GET | `/api/v1/dashboard/kpi` | Admin | Overall KPI summary |

### Metrics API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/metrics` | Public | Prometheus metrics (scraped by Prometheus) |

---

## 성능 목표

### Target Metrics (Phase 2.2)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Throughput** | 1000 TPS | k6 load test |
| **Latency (p95)** | < 500ms | Prometheus histogram |
| **Latency (p99)** | < 1000ms | Prometheus histogram |
| **Error Rate** | < 1% | HTTP 5xx / total requests |
| **Cache Hit Rate** | > 80% | Redis cache hits / total reads |
| **Webhook Success Rate** | > 95% | BullMQ completed / total |
| **Database Pool Usage** | < 70% | pg_stat_activity |
| **Redis Memory** | < 2GB | Redis INFO memory |
| **CPU Usage** | < 60% | Node exporter |
| **Memory Usage** | < 4GB | Node exporter |

### Performance Optimizations Applied

1. **Redis Cache**:
   - Policy lookups cached (TTL 5 min)
   - Product metadata cached (TTL 10 min)
   - Expected improvement: 80% reduction in DB queries

2. **BullMQ Async Processing**:
   - Webhooks queued (non-blocking)
   - Batch jobs scheduled (off-peak)
   - Expected improvement: 50% reduction in API response time

3. **Database Indexing**:
   - Commission queries: `(partnerId, status)`, `(status, createdAt)`
   - Audit logs: `(entityType, entityId)`, `(userId)`
   - Expected improvement: 90% reduction in query time

4. **Connection Pooling**:
   - PostgreSQL: 20 connections
   - Redis: 10 connections
   - Expected improvement: Stable under 1000 concurrent users

---

## 배포 전략

### Canary Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: 10% Traffic (5 min monitoring)                     │
│  ├─ Deploy canary instance (port 4001)                      │
│  ├─ Nginx routes 10% to canary                              │
│  ├─ Monitor error rate, latency                             │
│  └─ Rollback if error rate > 5%                             │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼ (Success)
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: 50% Traffic (5 min monitoring)                     │
│  ├─ Update Nginx weight (50/50)                             │
│  ├─ Monitor error rate, latency                             │
│  └─ Rollback if error rate > 5%                             │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼ (Success)
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: 100% Traffic                                       │
│  ├─ Delete old instance                                     │
│  ├─ Rename canary to primary                                │
│  ├─ Update Nginx config                                     │
│  └─ Save PM2 state                                          │
└─────────────────────────────────────────────────────────────┘
```

### Rollback Strategy

```bash
# scripts/rollback.sh
#!/bin/bash
set -e

echo "=== Rolling back Phase 2.2 deployment ==="

ssh o4o-api << 'EOF'
  # Stop canary instance
  npx pm2 delete o4o-api-canary

  # Restore previous version
  cd /home/ubuntu/o4o-platform
  git checkout HEAD~1
  pnpm install --frozen-lockfile
  pnpm run build

  # Restart main instance
  npx pm2 restart o4o-api-server

  # Restore Nginx config
  sudo cp /etc/nginx/sites-available/api.backup /etc/nginx/sites-available/api
  sudo nginx -s reload
EOF

echo "=== Rollback completed ==="
```

---

## 품질 기준

### Code Quality Gates

- ✅ TypeScript compilation: 0 errors
- ✅ ESLint: 0 errors, < 10 warnings
- ✅ Unit test coverage: > 80%
- ✅ Integration tests: All passing
- ✅ Load test: 1000 TPS sustained for 10 minutes
- ✅ Security audit: npm audit (0 high/critical vulnerabilities)

### Operations Checklist

- [ ] Database migrations applied successfully
- [ ] Audit log table created and indexed
- [ ] Redis cache operational
- [ ] BullMQ workers running
- [ ] Prometheus scraping metrics
- [ ] Grafana dashboards configured
- [ ] Alertmanager sending test alerts
- [ ] Load testing passed (1000 TPS)
- [ ] Canary deployment completed
- [ ] Rollback script tested
- [ ] Operations manual updated
- [ ] Team training completed

---

## 다음 단계 (Phase 2.3 Preview)

Phase 2.2 완료 후 예상 작업:

1. **Advanced Analytics**:
   - ML-based fraud detection
   - Predictive commission forecasting
   - Anomaly detection

2. **Multi-Currency Support**:
   - Currency conversion service
   - Exchange rate caching
   - Multi-currency policies

3. **Partner Portal**:
   - Self-service dashboard
   - Payout history
   - Marketing materials

4. **Advanced Webhooks**:
   - Webhook retry strategies
   - Event replay capability
   - Webhook signature validation

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-11-03
**작성자**: Claude (Anthropic)
**리뷰 필요**: Backend Lead, DevOps Lead
**승인 대기**: Product Owner

---

*이 문서는 Phase 2.2 착수 승인 후 구현 가이드로 사용됩니다.*
