# 📊 시스템 모니터링 가이드

> **O4O Platform의 포괄적인 모니터링 및 알림 시스템**
> 
> **기준일**: 2025-06-25  
> **적용**: 프로덕션 환경 완전 모니터링

---

## 🎯 **모니터링 전략 개요**

### **모니터링 계층**
```
🔴 비즈니스 메트릭   - 주문, 매출, 사용자 활동
🟡 애플리케이션     - API 응답시간, 에러율, 처리량
🟢 인프라스트럭처   - CPU, 메모리, 디스크, 네트워크
🔵 외부 의존성      - 데이터베이스, 결제 시스템
```

### **모니터링 도구 스택**
- **메트릭 수집**: Prometheus + Node Exporter
- **로그 관리**: Winston + ELK Stack
- **알림**: Slack + Email
- **대시보드**: Grafana
- **업타임 모니터링**: Uptime Robot

---

## 📈 **핵심 메트릭 정의**

### **비즈니스 메트릭**
```typescript
// 실시간 비즈니스 지표
export interface BusinessMetrics {
  // 주문 관련
  ordersPerHour: number;
  averageOrderValue: number;
  orderConversionRate: number;
  
  // 매출 관련
  revenuePerHour: number;
  dailyRevenue: number;
  monthlyRevenue: number;
  
  // 사용자 관련
  activeUsers: number;
  newRegistrations: number;
  userRetentionRate: number;
  
  // 재고 관련
  lowStockAlerts: number;
  outOfStockProducts: number;
  inventoryTurnover: number;
}
```

### **애플리케이션 메트릭**
```typescript
// API 성능 지표
export interface ApplicationMetrics {
  // 성능
  responseTime: {
    p50: number;  // 50th percentile
    p95: number;  // 95th percentile  
    p99: number;  // 99th percentile
  };
  
  // 처리량
  requestsPerSecond: number;
  requestsPerMinute: number;
  
  // 에러율
  errorRate: number;
  errorsByEndpoint: Record<string, number>;
  
  // 데이터베이스
  dbConnectionPool: number;
  dbQueryTime: number;
  dbActiveConnections: number;
}
```

---

## 🛠️ **모니터링 구현**

### **Prometheus 메트릭 수집**
```typescript
// src/middleware/metrics.middleware.ts
import prometheus from 'prom-client';

// HTTP 요청 메트릭
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestCounter = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// 비즈니스 메트릭
const orderCounter = new prometheus.Counter({
  name: 'orders_total',
  help: 'Total number of orders',
  labelNames: ['status', 'user_role']
});

const revenueGauge = new prometheus.Gauge({
  name: 'revenue_total',
  help: 'Total revenue in real-time'
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
      
    httpRequestCounter
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .inc();
  });
  
  next();
};
```

### **커스텀 메트릭 서비스**
```typescript
// src/services/metrics.service.ts
@Service()
export class MetricsService {
  async recordOrderMetrics(order: Order): Promise<void> {
    // 주문 수 증가
    orderCounter.labels(order.status, order.user.role).inc();
    
    // 매출 업데이트 (확정된 주문만)
    if (order.status === OrderStatus.CONFIRMED) {
      revenueGauge.inc(order.finalAmount);
    }
  }

  async getBusinessMetrics(): Promise<BusinessMetrics> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // 최근 1시간 주문 수
    const ordersPerHour = await this.orderRepository.count({
      where: { createdAt: MoreThan(hourAgo) }
    });
    
    // 평균 주문 금액
    const avgOrderValue = await this.orderRepository
      .createQueryBuilder()
      .select('AVG(final_amount)', 'avg')
      .where('created_at > :hourAgo', { hourAgo })
      .getRawOne();
    
    return {
      ordersPerHour,
      averageOrderValue: parseFloat(avgOrderValue.avg) || 0,
      // ... 기타 메트릭
    };
  }
}
```

---

## 📝 **로그 관리**

### **Winston 로거 설정**
```typescript
// src/config/logger.config.ts
import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'o4o-platform',
      environment: process.env.NODE_ENV,
      ...meta
    });
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 콘솔 출력
    new winston.transports.Console(),
    
    // 파일 저장
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    
    // ELK Stack 연동 (운영 환경)
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.Http({
        host: process.env.LOGSTASH_HOST,
        port: process.env.LOGSTASH_PORT,
        path: '/logs'
      })
    ] : [])
  ]
});
```

### **구조화된 로깅**
```typescript
// 주문 처리 로그
logger.info('Order processing started', {
  orderId: order.id,
  userId: order.user.id,
  orderAmount: order.finalAmount,
  itemCount: order.items.length,
  userRole: order.user.role
});

// 에러 로그
logger.error('Payment processing failed', {
  orderId: order.id,
  paymentAmount: order.finalAmount,
  paymentMethod: order.paymentMethod,
  errorCode: error.code,
  errorMessage: error.message,
  stack: error.stack
});

// 성능 로그
logger.info('Database query performance', {
  query: 'getUserOrders',
  executionTime: duration,
  rowCount: results.length,
  userId: user.id
});
```

---

## 🚨 **알림 시스템**

### **알림 우선순위 정의**
```typescript
export enum AlertSeverity {
  CRITICAL = 'critical',    // 즉시 대응 필요
  HIGH = 'high',           // 1시간 내 대응
  MEDIUM = 'medium',       // 4시간 내 대응
  LOW = 'low'             // 업무시간 내 대응
}

export interface Alert {
  severity: AlertSeverity;
  title: string;
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  service: string;
}
```

### **알림 규칙**
```typescript
// src/services/alert.service.ts
@Service()
export class AlertService {
  private alertRules = [
    // Critical 알림
    {
      name: 'high_error_rate',
      severity: AlertSeverity.CRITICAL,
      condition: (metrics: ApplicationMetrics) => metrics.errorRate > 5,
      message: (value) => `API 에러율이 ${value}%로 임계치를 초과했습니다.`
    },
    {
      name: 'payment_system_down',
      severity: AlertSeverity.CRITICAL,
      condition: () => !this.paymentService.isHealthy(),
      message: () => '결제 시스템이 응답하지 않습니다.'
    },
    
    // High 알림
    {
      name: 'slow_response_time',
      severity: AlertSeverity.HIGH,
      condition: (metrics) => metrics.responseTime.p95 > 2000,
      message: (value) => `API 응답시간이 ${value}ms로 느려졌습니다.`
    },
    {
      name: 'low_stock_critical',
      severity: AlertSeverity.HIGH,
      condition: (metrics) => metrics.outOfStockProducts > 10,
      message: (value) => `${value}개 상품이 품절 상태입니다.`
    }
  ];

  async checkAlerts(): Promise<void> {
    const metrics = await this.metricsService.getCurrentMetrics();
    
    for (const rule of this.alertRules) {
      if (rule.condition(metrics)) {
        await this.sendAlert({
          severity: rule.severity,
          title: rule.name,
          message: rule.message(this.extractValue(metrics, rule.name)),
          service: 'o4o-platform',
          timestamp: new Date()
        });
      }
    }
  }

  private async sendAlert(alert: Alert): Promise<void> {
    // Slack 알림
    await this.slackService.sendAlert(alert);
    
    // Critical 알림은 이메일/SMS도 발송
    if (alert.severity === AlertSeverity.CRITICAL) {
      await this.emailService.sendAlert(alert);
      await this.smsService.sendAlert(alert);
    }
    
    // 알림 이력 저장
    await this.alertRepository.save(alert);
  }
}
```

---

## 🏥 **헬스체크 시스템**

### **종합 헬스체크 엔드포인트**
```typescript
// src/controllers/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  async getHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkPaymentService(),
      this.checkFileStorage(),
      this.checkExternalAPIs()
    ]);

    const results = checks.map((check, index) => ({
      service: ['database', 'redis', 'payment', 'storage', 'external'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      responseTime: check.status === 'fulfilled' ? check.value.responseTime : null,
      error: check.status === 'rejected' ? check.reason.message : null
    }));

    const overallStatus = results.every(r => r.status === 'healthy') 
      ? 'healthy' 
      : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date(),
      services: results,
      version: process.env.APP_VERSION,
      uptime: process.uptime()
    };
  }

  private async checkDatabase(): Promise<{ responseTime: number }> {
    const start = Date.now();
    await this.dataSource.query('SELECT 1');
    return { responseTime: Date.now() - start };
  }

  private async checkPaymentService(): Promise<{ responseTime: number }> {
    const start = Date.now();
    await this.paymentService.healthCheck();
    return { responseTime: Date.now() - start };
  }
}
```

### **상세 헬스체크**
```typescript
// GET /health/detailed
@Get('detailed')
async getDetailedHealth(): Promise<DetailedHealthStatus> {
  return {
    application: {
      status: 'healthy',
      version: process.env.APP_VERSION,
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    
    database: {
      status: await this.checkDatabaseStatus(),
      connectionPool: await this.getDatabasePoolStatus(),
      queryPerformance: await this.getDatabasePerformance()
    },
    
    business: {
      activeOrders: await this.getActiveOrdersCount(),
      processingQueues: await this.getQueueStatus(),
      stockAlerts: await this.getStockAlertCount()
    }
  };
}
```

---

## 📊 **Grafana 대시보드**

### **주요 대시보드 구성**

#### **비즈니스 대시보드**
```json
{
  "dashboard": {
    "title": "O4O Platform - Business Metrics",
    "panels": [
      {
        "title": "실시간 주문 현황",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(orders_total[1h])",
            "legendFormat": "시간당 주문"
          }
        ]
      },
      {
        "title": "매출 현황",
        "type": "graph",
        "targets": [
          {
            "expr": "revenue_total",
            "legendFormat": "총 매출"
          }
        ]
      },
      {
        "title": "사용자 역할별 주문 분포",
        "type": "piechart",
        "targets": [
          {
            "expr": "orders_total by (user_role)",
            "legendFormat": "{{user_role}}"
          }
        ]
      }
    ]
  }
}
```

#### **시스템 대시보드**
```json
{
  "dashboard": {
    "title": "O4O Platform - System Performance",
    "panels": [
      {
        "title": "API 응답 시간",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "에러율",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ]
      }
    ]
  }
}
```

---

## 🎯 **모니터링 베스트 프랙티스**

### **메트릭 수집 원칙**
1. **관련성**: 비즈니스 목표와 직결된 메트릭만 수집
2. **실시간성**: 중요한 메트릭은 실시간 또는 준실시간 수집
3. **정확성**: 데이터 무결성 확보 및 중복 제거
4. **효율성**: 성능 영향 최소화

### **알림 설정 가이드**
```typescript
// 좋은 알림 예시
const goodAlert = {
  condition: 'error_rate > 5% for 5 minutes',
  severity: AlertSeverity.HIGH,
  actionable: true,
  description: '5분간 에러율이 5%를 초과하면 알림'
};

// 피해야 할 알림 예시
const badAlert = {
  condition: 'any error occurs',
  severity: AlertSeverity.CRITICAL,
  actionable: false,
  description: '에러 발생 시마다 알림 (노이즈 발생)'
};
```

### **대시보드 설계 원칙**
- **계층적 구성**: 전체 → 서비스별 → 상세
- **역할별 대시보드**: 경영진, 개발팀, 운영팀
- **실행 가능한 정보**: 문제 해결로 연결되는 정보 제공

---

## 🔗 **관련 문서**

- [보안 정책](security.md)
- [PostgreSQL 설정](postgresql-setup.md)
- [API 명세서](../03-api-reference/README.md)

---

<div align="center">

**📊 포괄적인 모니터링으로 안정적인 운영! 📊**

[🔒 보안 정책](security.md) • [🗄️ DB 설정](postgresql-setup.md) • [📋 현재 상황](../CURRENT-STATUS.md)

</div>
