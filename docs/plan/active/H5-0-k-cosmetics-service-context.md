# H5-0: K-Cosmetics Service Context 등록

## 개요

| 항목 | 내용 |
|------|------|
| Work Order | H5-0 |
| 목적 | k-cosmetics 웹 채널을 위한 최소 백엔드 환경 슬롯 생성 |
| 상태 | **완료** |
| 완료일 | 2026-01-02 |

## 배경

- `k-cosmetics.site` LB 연결 완료
- Cloud Run 기반 **웹 서버만 존재**
- 전용 API 서버는 만들지 않음 (의도된 결정)
- 기존 `o4o-api-server`에 "논리적 서비스 슬롯"만 생성

---

## 수행된 작업

### 1. Service Registry 생성

**파일**: `apps/api-server/src/config/service-registry.ts`

```typescript
export const SERVICE_REGISTRY: Record<string, ServiceDefinition> = {
  glycopharm: { ... },
  glucoseview: { ... },
  'k-cosmetics': {
    code: 'k-cosmetics',
    name: 'K-Cosmetics',
    description: '한국 화장품 쇼핑몰 (Travel/Local 채널)',
    channelType: 'web',
    domain: 'k-cosmetics.site',
    apiPrefix: '/api/v1', // 공용 API 사용
    status: 'development',
    hasDedicatedApi: false, // 전용 API 없음
    registeredAt: '2026-01-02',
  },
};
```

**기능**:
- `getService(code)` - 서비스 정의 조회
- `isRegisteredService(code)` - 서비스 존재 확인
- `getServiceByDomain(domain)` - 도메인으로 서비스 조회
- `getActiveServices()` - 활성 서비스 목록

### 2. 서비스 디렉토리 슬롯 생성

**경로**: `apps/api-server/src/routes/k-cosmetics/`

```
routes/k-cosmetics/
└── index.ts   ← 서비스 메타데이터 + placeholder
```

**현재 상태**:
- controllers/ ❌
- services/ ❌
- entities/ ❌
- routes 파일 ❌

**향후 API 추가 시**:
- 위 디렉토리들 생성
- `k-cosmetics.routes.ts` 추가
- main.ts에 라우트 등록

### 3. Service Scopes 예약

**파일**: `apps/api-server/src/config/service-scopes.ts`

```typescript
export const SERVICE_SCOPES: Record<string, ServiceScopes> = {
  glycopharm: { public: [...], member: [...], admin: [...] },
  glucoseview: { public: [...], member: [...], admin: [...] },
  'k-cosmetics': {
    public: [],   // 향후: k-cosmetics:products:read
    member: [],   // 향후: k-cosmetics:orders:write
    admin: [],    // 향후: k-cosmetics:admin:manage
  },
};
```

**기능**:
- `getAllScopes(serviceCode)` - 서비스의 모든 스코프
- `getScopesByLevel(serviceCode, level)` - 레벨별 스코프
- `hasScope(serviceCode, scope)` - 스코프 존재 확인
- `extractServiceFromScope(scope)` - 스코프에서 서비스 코드 추출

---

## 아키텍처

### 현재 상태

```
┌─────────────────────────────────────────┐
│           o4o-api-server                │
│  (GCP Cloud Run - o4o-core-api)         │
├─────────────────────────────────────────┤
│  routes/                                │
│  ├── glycopharm/     ← 전용 API 있음    │
│  ├── glucoseview/    ← 전용 API 있음    │
│  └── k-cosmetics/    ← 빈 슬롯 (H5-0)   │
│                                         │
│  config/                                │
│  ├── service-registry.ts  ← 서비스 등록 │
│  └── service-scopes.ts    ← 스코프 예약 │
└─────────────────────────────────────────┘
           │
           │ (공용 API)
           ▼
┌─────────────────────────────────────────┐
│        k-cosmetics.site                 │
│   (GCP Cloud Run - 웹 서버만)           │
│                                         │
│   전용 API 없음, 공용 API 사용          │
└─────────────────────────────────────────┘
```

### 요청 컨텍스트 분리 (향후)

```typescript
// 미들웨어에서 서비스 컨텍스트 설정 가능
req.context = {
  serviceCode: 'k-cosmetics',
  domain: 'k-cosmetics.site',
  channel: 'travel', // 또는 'local'
};

// 로그/모니터링 분리
logger.info('Request', { service: req.context.serviceCode });
```

---

## 생성된 파일

| 파일 | 설명 |
|------|------|
| `apps/api-server/src/config/service-registry.ts` | 서비스 레지스트리 |
| `apps/api-server/src/config/service-scopes.ts` | 서비스별 스코프 정의 |
| `apps/api-server/src/routes/k-cosmetics/index.ts` | 서비스 슬롯 (빈 상태) |

---

## 수행하지 않은 것 (명시적)

| 금지 항목 | 이유 |
|-----------|------|
| API 엔드포인트 추가 | H5-0 범위 외 |
| DB 테이블/Migration | H5-0 범위 외 |
| 상품/주문 로직 | H5-0 범위 외 |
| Travel/Local 분기 구현 | H5-0 범위 외 |
| Admin UI | H5-0 범위 외 |

---

## 빌드 검증

| 패키지 | 결과 |
|--------|------|
| api-server | **성공** |

---

## 이 작업 후 상태

> **"k-cosmetics는 웹 서버만 존재하지만,
> 백엔드에서는 이미 '존재하는 서비스'로 인식된다."**

이 상태가 되어 향후 어떤 선택도 깨끗하게 할 수 있음:
- H5-1: k-cosmetics 전용 API 일부 추가
- H6: Travel 전용 백엔드 분기
- 또는 아무것도 안 하고 웹만 계속

---

## 후속 가능 작업

### 옵션 1: 현 상태 유지
- 웹 서버만 운영
- 공용 API 사용 (ecommerce-orders 등)
- 추가 작업 없음

### 옵션 2: H5-1 - 기본 API 추가
```
routes/k-cosmetics/
├── controllers/
│   └── products.controller.ts
├── services/
│   └── products.service.ts
└── k-cosmetics.routes.ts
```

### 옵션 3: H6 - Travel 채널 분기
- Tax Refund API
- 여권 검증
- 채널별 가격 정책

---

## 참고

- [CLAUDE.md §11-14](../../../CLAUDE.md) - Cosmetics 도메인 규칙
- [H4-3 완료 보고서](./H4-3-checkout-ecommerceorder-transition.md)
