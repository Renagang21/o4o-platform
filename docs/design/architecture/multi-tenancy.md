# Multi-Tenancy Architecture

> O4O Platform Multi-Tenancy 설계 문서

## 1. 개요 (Overview)

Multi-Tenancy는 하나의 플랫폼 인스턴스에서 여러 테넌트(조직/고객)가 독립적으로 서비스를 이용할 수 있게 하는 아키텍처이다.
O4O Platform은 Organization 개념을 기반으로 테넌트 격리를 지원한다.

**현재 상태**: 설계 단계 (Phase 14 GAP MP-003)

---

## 2. 테넌트 격리 전략

### 2.1 격리 수준 옵션

| 전략 | 설명 | 격리 수준 | 복잡도 |
|------|------|----------|--------|
| **Database per Tenant** | 테넌트별 DB 분리 | 최상 | 높음 |
| **Schema per Tenant** | 테넌트별 스키마 분리 | 상 | 중간 |
| **Row-Level Security** | 테넌트 ID 컬럼으로 분리 | 중 | 낮음 |

### 2.2 O4O Platform 권장 전략

**Row-Level Security + Soft Partition** (1차 구현)

- 모든 테넌트 데이터가 하나의 DB에 저장
- `organizationId` 컬럼으로 데이터 분리
- 앱 레이어에서 테넌트 컨텍스트 주입

```
┌─────────────────────────────────────────────────────────────┐
│                      Single Database                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Tenant A Data  │  │  Tenant B Data  │                  │
│  │ organizationId  │  │ organizationId  │                  │
│  │     = "A"       │  │     = "B"       │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
│  공유 테이블: users, app_registry, system_settings          │
│  테넌트별: posts, products, orders, etc.                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 테넌트 컨텍스트

### 3.1 TenantContext 구조

```typescript
interface TenantContext {
  organizationId: string;     // 현재 테넌트 ID
  organizationSlug: string;   // URL용 슬러그
  plan: 'free' | 'pro' | 'enterprise';  // 플랜
  features: string[];         // 활성화된 기능
  limits: {
    maxUsers: number;
    maxStorage: number;
    maxApps: number;
  };
}
```

### 3.2 컨텍스트 주입 방식

```typescript
// 1. HTTP 헤더 기반
// X-Organization-Id: org-123

// 2. 서브도메인 기반
// tenant-a.platform.com → organizationId: "tenant-a"

// 3. URL 경로 기반
// /org/tenant-a/dashboard → organizationId: "tenant-a"
```

### 3.3 미들웨어 구현 (예시)

```typescript
// TenantMiddleware
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const orgId = this.extractOrganizationId(req);

    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    // 컨텍스트 주입
    req.tenantContext = await this.loadTenantContext(orgId);

    next();
  }

  private extractOrganizationId(req: Request): string | null {
    // 1. 헤더에서 추출
    if (req.headers['x-organization-id']) {
      return req.headers['x-organization-id'] as string;
    }

    // 2. 서브도메인에서 추출
    const subdomain = req.hostname.split('.')[0];
    if (subdomain !== 'www' && subdomain !== 'api') {
      return subdomain;
    }

    // 3. URL 경로에서 추출
    const match = req.path.match(/^\/org\/([^\/]+)/);
    if (match) return match[1];

    return null;
  }
}
```

---

## 4. 앱 인스턴스 격리

### 4.1 테넌트별 앱 설정

각 테넌트는 자체 앱 활성화/설정을 가진다.

```typescript
interface TenantAppInstance {
  organizationId: string;
  appId: string;
  status: 'active' | 'inactive';
  settings: Record<string, any>;  // 테넌트별 앱 설정
  installedAt: Date;
  activatedAt?: Date;
}
```

### 4.2 앱 격리 구조

```
┌─────────────────────────────────────────────────────────────┐
│                       App Registry                          │
│                    (전역 앱 목록)                            │
├─────────────────────────────────────────────────────────────┤
│  forum-core, cms-core, organization-core, ...              │
└─────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Tenant A      │ │   Tenant B      │ │   Tenant C      │
│  App Instances  │ │  App Instances  │ │  App Instances  │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ • forum-core ✓  │ │ • forum-core ✓  │ │ • cms-core ✓    │
│ • cms-core ✓    │ │ • sellerops ✓   │ │                 │
│ • forum-yaksa ✓ │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 5. 데이터 격리

### 5.1 테넌트 필터링 적용

모든 쿼리에 자동으로 `organizationId` 필터 적용:

```typescript
// TypeORM Global Scope (예시)
@Injectable()
export class TenantScopeSubscriber implements EntitySubscriberInterface {
  afterLoad(entity: any) {
    // 로드 시 테넌트 검증
  }

  beforeInsert(event: InsertEvent<any>) {
    // 삽입 시 organizationId 자동 설정
    if (this.isTenantEntity(event.entity)) {
      event.entity.organizationId = this.currentTenantId;
    }
  }

  beforeQuery(event: any) {
    // 쿼리 시 자동 필터 추가
  }
}
```

### 5.2 공유 데이터 vs 테넌트 데이터

| 구분 | 테이블 예시 | 특징 |
|------|------------|------|
| **공유** | users, app_registry, system_config | organizationId 없음 |
| **테넌트별** | posts, products, orders, members | organizationId 필수 |
| **하이브리드** | user_organization_roles | 관계 테이블 |

---

## 6. 테넌트 라우팅

### 6.1 URL 구조 옵션

```
# 옵션 1: 서브도메인
tenant-a.platform.com/dashboard
tenant-b.platform.com/dashboard

# 옵션 2: 경로 prefix
platform.com/org/tenant-a/dashboard
platform.com/org/tenant-b/dashboard

# 옵션 3: 커스텀 도메인
custom-domain.com/dashboard  → maps to tenant-a
```

### 6.2 API 라우팅

```
# 기본 API
POST /api/v1/posts

# 테넌트 명시 (관리자용)
POST /api/v1/org/{orgId}/posts
```

---

## 7. 리소스 제한

### 7.1 플랜별 제한

```typescript
const planLimits = {
  free: {
    maxUsers: 5,
    maxStorage: '1GB',
    maxApps: 3,
    features: ['basic-cms'],
  },
  pro: {
    maxUsers: 50,
    maxStorage: '50GB',
    maxApps: 10,
    features: ['basic-cms', 'forum', 'commerce'],
  },
  enterprise: {
    maxUsers: -1,  // unlimited
    maxStorage: '500GB',
    maxApps: -1,
    features: ['*'],
  },
};
```

### 7.2 사용량 모니터링

```typescript
interface TenantUsage {
  organizationId: string;
  currentUsers: number;
  currentStorage: number;  // bytes
  activeApps: string[];
  apiCallsToday: number;
  lastCheckedAt: Date;
}
```

---

## 8. 구현 로드맵

### Phase 1: 기본 격리 (현재 목표)

- [ ] `organizationId` 컬럼 추가 (테넌트 Entity에)
- [ ] TenantMiddleware 구현
- [ ] 기본 쿼리 필터링

### Phase 2: 앱 인스턴스 격리

- [ ] TenantAppInstance 테이블
- [ ] 테넌트별 앱 설정 저장
- [ ] 앱 활성화 API (테넌트 단위)

### Phase 3: 고급 기능

- [ ] 플랜별 제한 적용
- [ ] 사용량 모니터링
- [ ] 커스텀 도메인 지원

---

## 9. 보안 고려사항

### 9.1 Cross-Tenant 접근 방지

1. **API 레벨**: 모든 요청에서 테넌트 컨텍스트 검증
2. **DB 레벨**: Row-Level Security 정책
3. **파일 레벨**: 저장소 경로에 organizationId 포함

### 9.2 관리자 권한

```typescript
// 시스템 관리자: 모든 테넌트 접근 가능
// 테넌트 관리자: 해당 테넌트만 접근 가능

interface AdminContext {
  userId: string;
  role: 'system_admin' | 'tenant_admin' | 'user';
  accessibleTenants: string[] | '*';  // '*' = all
}
```

---

## 10. 관련 문서

| 문서 | 설명 |
|------|------|
| [appstore-overview.md](./appstore-overview.md) | AppStore 아키텍처 |
| [organization-core 스펙](../../specs/organization/) | Organization Core 스펙 |

---

*최종 업데이트: 2025-12-10*
*상태: Phase 14 신규 생성 (설계 문서)*
