# WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1

**(파트너 대시보드 API v1 – 백엔드 구현 실행 지시서)**

---

## 1. Work Order 목적 (Purpose)

본 Work Order는 다음을 수행한다.

* 파트너 대시보드 UI에서 사용될
  **Partner API v1을 실제 백엔드 엔드포인트로 구현**한다.
* 파트너의 역할 경계를 **API 레벨에서 강제**한다.
* v1 범위에서는
  **조회 + 제한된 입력(Create / Patch)** 만 제공하고
  승인·운영·성과 개념은 일절 포함하지 않는다.

👉 본 문서는 **API 구현 전용 실행 지시서**이다.

---

## 2. 구현 대상 및 환경

* 서버: `apps/api-server`
* 프레임워크: NestJS
* ORM: TypeORM
* 인증: 기존 Auth Guard / Role Guard 사용
* 대상 서비스:

  * GlycoPharm
  * K-Cosmetics
  * GlucoseView
    (서비스 구분은 **context 기반**, API 분기 ❌)

---

## 3. 필수 준수 문서 (Normative)

다음 문서를 기준으로 **재해석 없이 그대로 구현**한다.

* WO-PARTNER-DASHBOARD-API-INTEGRATION-V1
* WO-SERVICE-PARTNER-DASHBOARD-BASELINE-V1

구현 중 위 문서와 충돌 감지 시 → **즉시 중단 후 보고**

---

## 4. API 네임스페이스 및 공통 규칙

### 4.1 공통 Prefix

```
/api/v1/partner/*
```

* 모든 엔드포인트는 이 prefix 하위에만 생성
* 다른 prefix 사용 ❌

---

### 4.2 공통 Guard

모든 Partner API에 **동일 Guard 적용**

* AuthGuard (로그인 필수)
* RoleGuard (`partner` role 필수)
* PartnerContextGuard (아래 정의)

---

### 4.3 PartnerContextGuard (필수)

다음 조건을 **모든 요청마다 검증**한다.

* 요청 사용자에게 `partner` Role 존재
* partner ↔ service 연결 관계 존재
* 현재 서비스 컨텍스트에 유효한 partner인지 검증

❌ 승인 상태
❌ 대기 상태
❌ 관리 개념 노출

---

## 5. 구현할 API 목록 (v1 고정)

### 5.1 Overview API

**Endpoint**

```
GET /api/v1/partner/overview
```

**Service Method**

```
PartnerOverviewService.getOverview(partnerId, serviceId)
```

**Response DTO**

```ts
{
  activeContentCount: number;
  activeEventCount: number;
  status: 'active' | 'inactive';
}
```

⚠️ 집계 기준은 단순 count
⚠️ 매출/전환/성과 필드 절대 금지

---

### 5.2 Targets API (Read Only)

**Endpoint**

```
GET /api/v1/partner/targets
```

**Service Method**

```
PartnerTargetService.getTargets(partnerId, serviceId)
```

**Response DTO**

```ts
{
  id: string;
  name: string;
  serviceArea: string;
}[]
```

❌ POST / PATCH / DELETE 구현하지 않음

---

### 5.3 Content API

#### 목록 조회

```
GET /api/v1/partner/content
```

#### 생성

```
POST /api/v1/partner/content
```

#### 수정 / 비활성

```
PATCH /api/v1/partner/content/:id
```

**Entity (신규 또는 기존 확장)**

```
PartnerContent
- id
- partnerId
- serviceId
- type (text | image | link)
- title
- body
- url
- isActive
- createdAt
```

❌ 상품 ID
❌ 가격/재고
❌ 노출 위치 필드

---

### 5.4 Events API

#### 목록

```
GET /api/v1/partner/events
```

#### 생성 / 수정

```
POST  /api/v1/partner/events
PATCH /api/v1/partner/events/:id
```

**Entity**

```
PartnerEvent
- id
- partnerId
- serviceId
- startDate
- endDate
- region
- targetScope
- isActive
```

❌ 이벤트 콘텐츠
❌ 성과 데이터
❌ 결과 필드

---

### 5.5 Status API

```
GET /api/v1/partner/status
```

**Response DTO**

```ts
{
  contents: { id: string; status: 'active' | 'inactive' }[];
  events: { id: string; status: 'active' | 'ended' }[];
}
```

---

## 6. Controller / Module 구조 (권장)

```
apps/api-server/src/modules/partner/
 ├─ partner.module.ts
 ├─ partner.controller.ts
 ├─ partner-overview.service.ts
 ├─ partner-target.service.ts
 ├─ partner-content.service.ts
 ├─ partner-event.service.ts
 ├─ partner-status.service.ts
 └─ guards/partner-context.guard.ts
```

* 다른 도메인 모듈 침범 ❌
* Admin / Operator 모듈 참조 ❌

---

## 7. Hard Fail 조건 (BE)

다음 중 하나라도 구현되면 **즉시 실패**.

* 성과/통계 컬럼
* 승인 상태 필드
* 관리자/운영자 개념
* 파트너 권한 확장
* `/admin/partner/*` 엔드포인트

---

## 8. Definition of Done (DoD)

다음 조건을 모두 만족해야 완료로 간주한다.

* 모든 `/api/v1/partner/*` 엔드포인트 구현
* Guard 정상 동작
* Mock 데이터 제거
* FE 연동 가능한 실제 데이터 반환
* Swagger 또는 명세 문서 자동 생성 가능 상태

---

## 9. 최종 실행 문장

> **이 API는
> 파트너를 통제하지 않고,
> 파트너를 대신 판단하지 않는다.**
>
> 오직 "홍보 실행을 위한 데이터"만 제공한다.

---

### 다음 단계 (병렬 가능)

* FE API 연동 실행 지시서 작성
* BE 구현 완료 후:

  * FE 연동 즉시 착수
  * 3개 서비스 동시 테스트

---

*Version: 1.0*
*Status: Active*
