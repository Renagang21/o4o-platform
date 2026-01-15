# WO-PARTNER-DASHBOARD-API-INTEGRATION-V1

**(파트너 대시보드 API 연동 Work Order v1)**

---

## 1. Work Order 목적 (Purpose)

본 Work Order는 다음을 수행한다.

* 현재 Mock 데이터로 구현된 파트너 대시보드 UI를
  **실제 API 기반 데이터로 단계적 전환**한다.
* 파트너 대시보드의 **책임 경계(BASELINE)** 를
  API 레벨에서도 명확히 고정한다.
* v1 범위에서는
  **"조회 + 제한된 입력"까지만 허용**하고
  운영·성과·승인 영역은 절대 포함하지 않는다.

👉 본 WO는 **API 연동의 시작점(v1)** 이며,
기능 확장이 아닌 **정합성 확보용 연동**이다.

---

## 2. 적용 대상 (Scope)

### ✅ 적용 서비스

* GlycoPharm
* K-Cosmetics
* GlucoseView

### ✅ 적용 UI

```
/partner/overview
/partner/targets
/partner/content
/partner/events
/partner/status
```

### ❌ 적용 제외

* Neture
* 관리자(Admin) API
* 공급자(Supplier) API
* 판매자(Seller) API
* 파트너 성과/통계 API

---

## 3. 상위 기준 문서 (Normative – 반드시 준수)

* WO-SERVICE-PARTNER-DASHBOARD-BASELINE-V1
* WO-SERVICE-PARTNER-DASHBOARD-UI-SKELETON-V1
* WO-SERVICE-PARTNER-DASHBOARD-ROUTING-MENU-V1
* WO-SERVICE-PARTNER-DASHBOARD-FE-IMPLEMENTATION-V1
* WO-GLYCOPHARM-PARTNER-DASHBOARD-IMPLEMENTATION-V1
* WO-PARTNER-DASHBOARD-REPLICATION-KCOS-GVIEW-V1

👉 API 설계가 위 문서 중 하나라도 침범하면 **즉시 중단**한다.

---

## 4. API 연동 기본 원칙 (중요)

### 4.1 파트너 API의 성격

> **파트너 API는 "운영 API"가 아니라
> "홍보 실행 보조 API"이다.**

따라서 다음 원칙을 강제한다.

* 모든 API는 **partner context** 에서만 동작
* 파트너는

  * 승인 ❌
  * 정책 결정 ❌
  * 성과 조회 ❌

---

### 4.2 API 네임스페이스

모든 API는 다음 prefix를 사용한다.

```
GET    /api/v1/partner/...
POST   /api/v1/partner/...
PATCH  /api/v1/partner/...
```

❌ `/admin/partner/*`
❌ `/analytics/*`
❌ `/operator/*`

---

## 5. 연동 대상 API 정의 (v1)

### 5.1 Overview API (요약)

**목적**
파트너 대시보드 Overview 카드 데이터 제공

**Endpoint**

```
GET /api/v1/partner/overview
```

**Response (예시)**

```json
{
  "activeContentCount": 3,
  "activeEventCount": 1,
  "status": "active"
}
```

⚠️ 포함 금지

* 매출
* 클릭 수
* 전환율

---

### 5.2 Targets API (홍보 대상 – Read Only)

**Endpoint**

```
GET /api/v1/partner/targets
```

**Response**

```json
[
  {
    "id": "store_1",
    "name": "서울 ○○약국",
    "serviceArea": "GlycoPharm 혈당 관리"
  }
]
```

❌ POST / PATCH / DELETE 없음
👉 **조회 전용**

---

### 5.3 Content API (콘텐츠)

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
PATCH /api/v1/partner/content/{id}
```

**허용 필드**

* type: text | image | link
* title
* body / url
* isActive

❌ 상품 정보
❌ 가격 / 재고
❌ 노출 위치

---

### 5.4 Events API (이벤트 조건)

#### 목록

```
GET /api/v1/partner/events
```

#### 생성 / 수정

```
POST  /api/v1/partner/events
PATCH /api/v1/partner/events/{id}
```

**허용 필드**

* startDate
* endDate
* region
* targetScope

❌ 이벤트 콘텐츠
❌ 결과 데이터
❌ 성과 필드

---

### 5.5 Status API (상태)

```
GET /api/v1/partner/status
```

**Response**

```json
{
  "contents": [
    { "id": "c1", "status": "active" }
  ],
  "events": [
    { "id": "e1", "status": "ended" }
  ]
}
```

👉 **집계/분석 없음**

---

## 6. 인증 & 권한 규칙 (필수)

* 모든 `/api/v1/partner/*`

  * 로그인 필수
  * `partner` Role 필수
* Partner ↔ Service 매핑 검증 필수

❌ 파트너가 없는 경우 빈 데이터 or 403
❌ 승인 대기 상태 노출 ❌

---

## 7. 프론트엔드 연동 지시

### 7.1 전환 원칙

* Mock 데이터 → API 데이터
* **페이지 단위로 순차 전환**

권장 순서:

1. Overview
2. Targets
3. Status
4. Content
5. Events

---

### 7.2 오류 처리

* API 실패 시:

  * 빈 상태 UI
  * 오류 메시지 최소화
* 승인 요청/문의 유도 ❌

---

## 8. Hard Fail 조건 (API)

다음 중 하나라도 포함되면 **Fail**.

* 성과/통계 필드
* 승인 상태
* 관리자/운영자 개념
* 파트너 권한 확장

---

## 9. Definition of Done (DoD)

다음 조건을 모두 만족해야 완료로 간주한다.

* 세 서비스 모두

  * Mock 제거
  * 실제 API 연동
* UI 변경 없음
* Hard Rules 위반 0건
* API 명세가 문서로 남음

---

## 10. 최종 기준 문장

> **파트너 API는
> 파트너를 "도와줄 뿐",
> 파트너에게 권한을 주지 않는다.**

---

### 다음 단계 (v1 이후)

* v1 안정화 후:

  * 파트너 콘텐츠 승인 흐름 논의 ❌ (서비스 내부 처리)
  * 성과/통계 API ❌ (별도 기획 필요)
* 가능한 다음 WO:
  1. 파트너 API v1 실제 구현 (BE)
  2. 파트너 대시보드 API v1 연동 구현 (FE)

---

*Version: 1.0*
*Status: Active*
