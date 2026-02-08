# CLAUDE.md – O4O Platform Development Constitution (v4.0)

> **이 문서는 O4O Platform에서 모든 개발(사람/AI)을 지배하는 최상위 규칙이다.**
> 다른 모든 문서, 가이드, 예시는 본 문서에 종속된다.
> **충돌 시 항상 CLAUDE.md가 우선한다.**

---

## 0. 이 문서의 지위 (중요)

* CLAUDE.md는 **플랫폼 헌법(Constitution)** 이다.
* App / Service / Core / Extension / Infra 구분 없이 **모든 코드 변경은 본 규칙을 따른다.**
* 문서가 아닌 **실제 코드와 운영을 지배하는 규칙**이다.

---

## 0.1. 환경 기본 원칙 (CRITICAL)

> **⚠️ 2026-01-29부터 기본 환경은 프로덕션이다.**

* **모든 작업은 프로덕션 환경 기준**
* **모든 데이터는 프로덕션 데이터베이스에 등록**
* **마이그레이션은 즉시 프로덕션 실행**
* 로컬 개발/테스트는 명시적으로 요청된 경우에만

### 프로덕션 데이터베이스

| 항목 | 값 |
|------|------|
| Instance | `o4o-platform-db` |
| Host | `34.64.96.252` |
| Database | `o4o_platform` |
| Zone | `asia-northeast3-a` |

### 프로덕션 DB 접근 정책 (STRICT)

**⚠️ 로컬 → 프로덕션 DB 직접 연결 금지**

| 접근 방법 | 허용 여부 | 이유 |
|-----------|-----------|------|
| 로컬 psql 클라이언트 | ❌ BLOCKED | 방화벽 차단, 보안 |
| 로컬 migration scripts | ❌ BLOCKED | 타임아웃, 감사 불가 |
| Cloud Run 내부 | ✅ ALLOWED | 안전, 로그 남음 |
| Admin API 엔드포인트 | ✅ ALLOWED | 권한 체크, 감사 |
| Google Cloud Console | ✅ ALLOWED | 공식 도구 |

**이전 동작 (2026-01-29 이전):**
- 로컬에서 `tsx src/scripts/*.ts` 실행 가능했음
- 방화벽이 열려있었음
- 이제는 보안상 차단됨 (**정상 동작**)

### 로컬 환경 제약사항

**로컬 개발 머신 (Windows):**
- `psql` 클라이언트 없음
- 프로덕션 DB 직접 연결 **불가능** (방화벽/타임아웃)
- 로컬 스크립트로 프로덕션 DB 접근 **금지**

**프로덕션 DB 작업 방법 (우선순위순):**
1. **CI/CD 자동 실행** (TypeORM migration:run) — main 배포 시 자동
2. **Admin API 엔드포인트** — 긴급 수동 실행
3. **Google Cloud Console SQL Editor** — SQL 직접 실행
4. ❌ ~~로컬 스크립트~~ — **절대 금지**

### 마이그레이션 실행 원칙

1. **자동 실행 (권장)**: main 브랜치 배포 → CI/CD가 자동 실행
2. **수동 실행 (긴급)**: Admin API 엔드포인트 호출
3. **SQL 직접**: Google Cloud Console SQL Editor
4. ❌ 로컬 psql/scripts 사용 금지

> 📄 상세: `docs/_platform/operations/PRODUCTION-MIGRATION-STANDARD.md`

---

## 1. 브랜치 전략

| 브랜치 | 역할 |
|--------|------|
| `main` | 프로덕션 안정 |
| `develop` | 통합 테스트 |
| `feature/*` | 모든 기능 개발 (**필수**) |

> ⚠ `develop` 브랜치에서 직접 기능 개발 금지
> ⚠ 모든 작업은 반드시 `feature/*`에서 시작한다

---

## 2. 서비스 상태 체계

| 상태 | 정의 |
|------|------|
| **Active** | Template 존재 + 실사용 |
| **Development** | Template 존재 또는 핵심 앱 준비 |
| **Experimental** | 명시적 experimental 표식 |
| **Planned** | ServiceGroup만 정의 |
| **Legacy** | 12개월 이상 비활성 |
| **Deprecated** | 제거 일정 확정 |

---

## 3. App 계층 구조 (절대 규칙)

```
Core → Extension → Feature → Service
```

**금지**: Core → Extension, Core → Service, Extension → Service 방향 의존성

---

## 4. TypeORM Entity – ESM Mandatory Rules (FROZEN)

> **위반 시 API 서버 기동 실패 및 즉시 롤백 대상**

```typescript
// ❌ FORBIDDEN
import { RelatedEntity } from './related.entity.js';
@ManyToOne(() => RelatedEntity, (e) => e.property)

// ✅ REQUIRED
import type { RelatedEntity } from './related.entity.js';
@ManyToOne('RelatedEntity', 'property')
```

> 📄 상세: `docs/reports/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md`

---

## 5. Core 동결 정책

동결된 Core: `cms-core`, `auth-core`, `platform-core`, `organization-core`

❌ 구조/테이블 변경 금지 | ⭕ 명시적 승인 필요

---

## 6. Work Order 필수 구조

```
조사 → 문제확정 → 최소 수정 → 검증 → 종료
```

> 📄 템플릿: `docs/app-guidelines/work-order-standard-header.md`
> 📄 신규 서비스: `docs/app-guidelines/new-service-workorder-template.md`

---

## 7. E-commerce Core 절대 규칙

> 주문/결제 기능이 있는 모든 서비스는 예외 없이 준수

| 원칙 | 설명 |
|------|------|
| 주문 생성 | `checkoutService.createOrder()` 필수 |
| OrderType 불변 | 생성 시 결정, 이후 변경 금지 |
| 금지 테이블 | `*_orders`, `*_payments` 생성 금지 |

**OrderType**:
| 서비스 | OrderType | 상태 |
|--------|-----------|------|
| Dropshipping | DROPSHIPPING | ✅ |
| Cosmetics | COSMETICS | ✅ |
| Tourism | TOURISM | ✅ |
| GlycoPharm | GLYCOPHARM | ❌ BLOCKED |

> 📄 상세: `docs/_platform/E-COMMERCE-ORDER-CONTRACT.md`

---

## 8. 인프라 (GCP Cloud Run)

| 서비스 | 역할 |
|--------|------|
| `o4o-core-api` | API 서버 |
| `neture-web` | 네처 메인 |
| `glycopharm-web` | 글라이코팜 |
| `glucoseview-web` | 글루코스뷰 |
| `k-cosmetics-web` | K-화장품 |
| `kpa-society-web` | 약사회 SaaS |

**금지**: Source 배포, PM2, AWS EC2, `43.202.242.215` 참조

---

## 9. 문서 정책

* CLAUDE.md = 최상위 기준
* 충돌 시 CLAUDE.md 우선
* 상세 규칙은 별도 문서 참조

---

## 10. API 호출 규칙

* **authClient 사용 필수**: `authClient.api.get()`, `authClient.api.post()`
* 환경변수 직접 사용 금지
* 하드코딩된 URL 금지

---

## 11. Cosmetics Domain Rules

> 📄 상세: `docs/architecture/COSMETICS-DOMAIN-RULES.md`

핵심:
- 독립 DB 스키마 (`cosmetics_` prefix)
- 주문은 E-commerce Core 통해 처리 (OrderType: COSMETICS)
- cosmetics-api: 비즈니스 로직만, JWT 발급 금지
- cosmetics-web: UI만, DB 접근 금지

---

## 12. Business Service Rules

> 📄 상세: `docs/architecture/BUSINESS-SERVICE-RULES.md`

핵심:
- OpenAPI 계약 우선 (코드보다 스펙이 기준)
- API/Web 템플릿에서 시작 필수
- 서비스 간 직접 호출/DB 접근 금지
- 각 서비스는 독립 배포/DB/스키마

---

## 13. O4O Store & Order Guardrails

> 📄 상세: `docs/architecture/O4O-STORE-RULES.md`

### 핵심 원칙:
- **모든 매장은 O4O Store Template 사용**
- **모든 주문은 checkoutService.createOrder()**
- **독립 주문 테이블 생성 금지**

### 3중 방어:
| 레이어 | 방어 수단 |
|--------|----------|
| 런타임 | OrderCreationGuard |
| 계약 | OrderType 강제 |
| 스키마 | 금지 테이블 검사 |

### Reference Implementation:
| 매장 | OrderType |
|------|-----------|
| Cosmetics | COSMETICS |
| Tourism | TOURISM |

### GlycoPharm Legacy (Phase 9-A):
- `glycopharm_orders`: READ-ONLY
- `OrderType.GLYCOPHARM`: BLOCKED
- 📄 교훈: `docs/_platform/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md`

---

## 14. 화면 디버깅 규칙 (Alpha 기준)

### 핵심 원칙

```
❌ AI가 브라우저 직접 테스트
✅ 사람이 관측 → AI가 JSON 분석 → 코드 위치 추적
```

### 공식 진단 Entry Point (Alpha)

| 분류 | URL / 엔드포인트 | 용도 |
|------|------------------|------|
| **Auth 진단** | `/__debug__/auth-bootstrap` | 로그인/세션/토큰 문제 |
| **시스템 상태** | `/health/detailed` | 전체 컴포넌트 상태 |
| **DB 상태** | `/health/database` | DB 연결, 버전, 쿼리 |
| **인증 상태** | `/api/v1/auth/status` | 현재 인증 여부 확인 |

### 표준 진단 루틴

```
1. 재현: 브라우저에서 문제 확인
2. JSON 진단: 위 Entry Point 실행 → JSON 복사
3. 원인 특정: success/error/code 필드 분석
4. 코드 추적: error.code → 해당 컨트롤러/미들웨어
5. 수정 후 동일 진단으로 검증
```

### JSON 응답 표준

```typescript
// 성공
{ success: true, data: T }

// 에러 (머신 리더블 code 필수)
{ success: false, error: "message", code: "ERROR_CODE" }
```

### Alpha 단계 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| `/__debug__/auth-bootstrap` | ✅ 구현됨 | admin-dashboard |
| `/__debug__/login` | 📋 참고 설계 | 필요 시 구현 |
| `/__debug__/navigation` | 📋 참고 설계 | 필요 시 구현 |
| `/__debug__/api` | 📋 참고 설계 | 필요 시 구현 |

> 📄 상세: `docs/debugging/DIAGNOSTIC-INFRASTRUCTURE-INVENTORY.md`
> 📄 가이드: `docs/debugging/README.md`

---

## 15. Design Core 규칙

- **모든 신규 화면은 Design Core v1.0 사용**
- App 내 독자적 디자인 시스템 생성 금지
- 디자인 변경은 Work Order 통해서만

> 📄 상세: `docs/app-guidelines/design-core-governance.md`

---

## 16. 플랫폼 개발 기준 참조 규칙 (중요)

> **Content / LMS / Signage / CMS / Extension 관련 개발을 수행할 경우,
> 반드시 다음 문서를 선행 참조한다.**

### 필수 참조 문서

| 영역 | 문서 | 경로 |
|------|------|------|
| Content Core | Content Core 개요 | `docs/platform/content-core/CONTENT-CORE-OVERVIEW.md` |
| LMS Core | Core-Extension 원칙 | `docs/platform/lms/LMS-CORE-EXTENSION-PRINCIPLES.md` |
| LMS Core | 데이터 소유권 | `docs/platform/lms/LMS-CORE-DATA-OWNERSHIP.md` |
| LMS Core | API 계약 | `docs/platform/lms/LMS-CORE-CONTRACT.md` |
| LMS Core | 이벤트 표준 | `docs/platform/lms/LMS-EVENT-STANDARD.md` |
| Navigation | 운영자 대시보드 네비게이션 | `docs/platform/navigation/OPERATOR-DASHBOARD-NAVIGATION.md` |
| Extension | 일반 가이드 | `docs/platform/extensions/EXTENSION-GENERAL-GUIDE.md` |
| Extension | 파트너 가이드 | `docs/platform/extensions/EXTENSION-PARTNER-GUIDE.md` |

### 적용 규칙

1. **선행 참조 필수**: 위 영역 개발 시작 전 해당 문서 확인
2. **기준 준수**: 문서에 명시된 원칙과 제약을 따름
3. **일관성 유지**: 기존 패턴과 구조를 벗어나지 않음
4. **변경 시 승인**: 기준 문서 변경 시 CLAUDE.md 규칙에 따라 승인 필요

### 핵심 원칙 요약

- **Content는 단일 출처**: 모든 콘텐츠는 Content Core를 통해 관리
- **Core는 불변**: Extension이 Core를 수정하지 않음
- **데이터 소유권 명확**: Core 데이터와 Extension 데이터 분리
- **이벤트 기반 통신**: Core → Extension 방향으로 이벤트 발행
- **통합 네비게이션**: Extension은 통합 사이드바에 메뉴 등록

---

## 17. KPA Society 구조 기준

> kpa-society 관련 작업(기획, 조사, 개발, 정비)은
> `docs/_platform/KPA-SOCIETY-SERVICE-STRUCTURE.md` 문서를 최상위 기준으로 참조한다.

### 핵심 구조

kpa-society.co.kr에는 **3개 서비스**가 공존:

| 서비스 | 상태 | 설명 |
|--------|------|------|
| 커뮤니티 서비스 | 유지 | 약사/약대생 커뮤니티 (Forum 포함) |
| 분회 서비스 | 유지 | 실제 분회 운영 서비스 |
| 지부/분회 서비스 데모 | 제거 예정 | `/demo` 경로 |

### 준수 규칙

- **라우트 위치 ≠ 서비스 소속**: Forum은 "커뮤니티 서비스"의 기능
- **상단 메뉴**: 서비스 진입점만 노출 (기능 나열 금지)
- **혼선 발생 시**: 기준 문서로 즉시 판단

### KPA-Society Membership Architecture Reference

kpa-society.co.kr은 하나의 사이트처럼 보이지만,
회원 구조상 다음 3개의 독립 서비스로 구성된다:

- **SVC-A**: 커뮤니티 (약사 / 약대생)
- **SVC-B**: 지부/분회 서비스 데모 (제거 예정)
- **SVC-C**: 분회 서비스 (실서비스)

모든 회원/로그인/승인/권한 논의는
**"Account와 Service Membership 분리"** 원칙을 따른다.

자세한 기준은 다음 문서를 참조한다:

| 문서 | 경로 |
|------|------|
| 서비스 구조 기준 | `docs/_platform/KPA-SOCIETY-SERVICE-STRUCTURE.md` |
| Phase 0 현황 조사 | `docs/investigations/kpa-society-auth-current-state.md` |
| Phase 2 데이터 모델 | `docs/investigations/KPA-SOCIETY-PHASE2-MEMBERSHIP-DATA-MODEL.md` |
| Phase 2 가입/승인 흐름 | `docs/investigations/KPA-SOCIETY-PHASE2-SIGNUP-AND-APPROVAL-FLOW.md` |
| Phase 2 서비스 이동 규칙 | `docs/investigations/KPA-SOCIETY-PHASE2-SERVICE-NAVIGATION-RULES.md` |

---

## 18. APP 표준화 규칙 (Baseline Lock · 2026-02)

> **O4O 플랫폼은 APP 단위 표준화 구조를 기준선으로 고정한다.**

### 핵심 원칙

1. **APP 단위가 최상위 기준이다**
   - O4O는 서비스가 아니라 **APP 단위**로 설계·구현한다
   - 서비스는 APP를 조합·설정하여 구성한다

2. **표준 APP 구조** — 모든 APP은 아래 3요소를 가진다
   - `@o4o/types/{app}` : 공통 타입·라벨·상수
   - `{App}QueryService` : 공통 조회/정렬 로직 (`apps/api-server/src/modules/{app}/`)
   - 표준 UI 패턴 : APP별 1종 고정

3. **서비스 코드는 얇게 유지한다**
   - 서비스 라우트/컨트롤러는 **QueryService 호출 + 설정(serviceKey, scope, limit)만** 담당
   - Raw SQL / 중복 로직 금지

4. **서비스별 UI 예외를 허용하지 않는다**
   - UI 차이가 필요하면 **APP를 분리**한다
   - 기존 APP에 조건 분기 추가 금지

### 기준선 APP (Frozen Baseline)

| APP | Types | QueryService | 상태 |
|-----|-------|-------------|------|
| APP-CONTENT | `@o4o/types/content` | `ContentQueryService` | Frozen |
| APP-SIGNAGE | `@o4o/types/signage` | `SignageQueryService` | Frozen |
| APP-FORUM | `@o4o/types/forum` | `ForumQueryService` | Frozen |

- 이 APP들은 **변경 없는 기준선**으로 취급한다
- 추가 리팩토링 금지, 예외적 서비스 분기 금지
- 신규 서비스/앱은 **이 패턴을 그대로 사용**

---

## 19. 최종 원칙

> **새 앱을 만들기 전에,
> "이게 위 기준을 모두 만족하는가?"를 먼저 확인하라.**

---

## 상세 규칙 문서 목록

| 영역 | 문서 |
|------|------|
| Cosmetics 도메인 | `docs/architecture/COSMETICS-DOMAIN-RULES.md` |
| Business 서비스 | `docs/architecture/BUSINESS-SERVICE-RULES.md` |
| O4O Store/Order | `docs/architecture/O4O-STORE-RULES.md` |
| E-commerce 계약 | `docs/_platform/E-COMMERCE-ORDER-CONTRACT.md` |
| GlycoPharm Legacy | `docs/_platform/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md` |
| Store Template | `docs/templates/o4o-store-template/` |
| ESM Entity 규칙 | `docs/reports/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md` |
| 디버깅 가이드 | `docs/debugging/README.md` |
| **진단 인프라 기준** | `docs/debugging/DIAGNOSTIC-INFRASTRUCTURE-INVENTORY.md` |
| Design Core | `docs/app-guidelines/design-core-governance.md` |
| **Content Core** | `docs/platform/content-core/CONTENT-CORE-OVERVIEW.md` |
| **LMS Core** | `docs/platform/lms/` |
| **Navigation** | `docs/platform/navigation/OPERATOR-DASHBOARD-NAVIGATION.md` |
| **Extension** | `docs/platform/extensions/` |
| **KPA Society 구조** | `docs/_platform/KPA-SOCIETY-SERVICE-STRUCTURE.md` |

---

*Updated: 2026-02-08*
*Version: 4.4*
*Status: Active Constitution*
