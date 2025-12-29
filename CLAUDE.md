# CLAUDE.md – O4O Platform Development Constitution (v2.0)

> **이 문서는 O4O Platform에서 모든 개발(사람/AI)을 지배하는 최상위 규칙이다.**
> 다른 모든 문서, 가이드, 예시는 본 문서에 종속된다.
> **충돌 시 항상 CLAUDE.md가 우선한다.**

---

## 0. 이 문서의 지위 (중요)

* CLAUDE.md는 **플랫폼 헌법(Constitution)** 이다.
* App / Service / Core / Extension / Infra 구분 없이 **모든 코드 변경은 본 규칙을 따른다.**
* Phase A/B/C를 통해 확정된 기준을 **변경 없이 반영**한다.
* 문서가 아닌 **실제 코드와 운영을 지배하는 규칙**이다.

---

## 1. 브랜치 전략 (확정)

### 1.1 브랜치 구조

| 브랜치 | 역할 | 비고 |
|--------|------|------|
| `main` | 프로덕션 안정 | 운영 중 |
| `develop` | 통합 테스트 | dev-admin |
| `feature/*` | 모든 기능 개발 | **필수** |

> ⚠ `develop` 브랜치에서 직접 기능 개발 금지
> ⚠ 모든 작업은 반드시 `feature/*`에서 시작한다

### 1.2 기본 워크플로우

```bash
# 작업 시작
git checkout develop
git pull origin develop
git checkout -b feature/<app-or-task>

# 작업 중
git add .
git commit -m "feat: ..."

# 통합
git checkout develop
git merge feature/<app-or-task>
git push origin develop

# 배포
git checkout main
git merge develop
git push origin main
```

---

## 2. 플랫폼 기준선 (Phase C Baseline – 핵심)

### 2.1 서비스 상태 체계 (고정)

서비스는 반드시 아래 중 하나의 상태를 가진다.

| 상태 | 정의 |
|------|------|
| **Active** | Template 존재 + 실사용 |
| **Development** | Template 존재 또는 핵심 앱 준비 |
| **Experimental** | 명시적 experimental 표식 |
| **Planned** | ServiceGroup만 정의 |
| **Legacy** | 12개월 이상 비활성 |
| **Deprecated** | 제거 일정 확정 |

> Template 없는 서비스는 **Active 불가**

---

### 2.2 App 유형 체계 (고정)

| App Type | 설명 | AppStore |
|----------|------|----------|
| **core** | 플랫폼/도메인 핵심 | 필수 등록 |
| **feature** | 역할 기반 기능 | 필수 등록 |
| **extension** | Core 확장 | 서비스 Active 시 등록 |
| **standalone** | 독립 서비스 | 필수 등록 |
| **infra-core** | 빌드/런타임 인프라 | ❌ 비대상 |
| **utility** | 보조 도구 | ❌ 비대상 |
| **application** | /apps 실행체 | ❌ 비대상 |
| **legacy** | 폐기 예정 | ❌ 비대상 |

---

### 2.3 AppStore 등록 규칙 (확정)

* `manifest.ts` 존재 + `core/feature/standalone` → **반드시 등록**
* `extension` → 연결 서비스가 **Active/Development**일 때 등록
* `experimental/legacy` → **Hidden 처리**
* `infra-core` → AppStore **절대 등록 금지**

---

### 2.4 InitPack 규칙 (확정)

| 서비스 상태 | InitPack |
|-------------|----------|
| Active | **필수** |
| Development | 선택 |
| Experimental | 선택 |
| Planned | 없음 |

**예외 허용**:
* platform-core
* signage
* *ops 서비스
* cross-service 기능

---

### 2.5 Core 동결(FROZEN) 정책

다음 Core는 **동결 상태**다.

* `cms-core`
* `auth-core`
* `platform-core`
* `organization-core`

❌ 구조 변경 금지
❌ 테이블 변경 금지
⭕ 예외는 명시적 승인 필요

---

## 3. App 개발 규칙 (AppStore 기반)

### 3.1 계층 구조 (절대 규칙)

```
Core → Extension → Feature → Service
```

### 3.2 의존성 규칙 (절대 금지 포함)

| 허용 | 금지 |
|------|------|
| Extension → Core | Core → Extension |
| Feature → Core | Core → Service |
| Service → Core | Extension → Service |

**api-server 직접 import 절대 금지**

### 3.3 AppStore 필수 파일

모든 앱은 다음 필수 파일을 가져야 한다:

```
manifest.ts
lifecycle/install.ts
lifecycle/activate.ts
lifecycle/deactivate.ts
lifecycle/uninstall.ts
```

### 3.4 앱 폴더 구조 규칙

```
packages/<app>/
  src/
    backend/controllers/
    backend/services/
    backend/dto/
    frontend/pages/
    frontend/components/
    lifecycle/
    manifest.ts
    index.ts
```

### 3.5 UI / Design Core 규칙 (강제 - Phase 3 확정)

플랫폼의 UI/디자인은 **Design Core v1.0**을 기준으로 한다.

#### 3.5.1 기본 원칙

- Design Core v1.0은 `packages/ui`에 정의된 코드 기준이다.
- App 내부에서 **독자적인 디자인 시스템을 생성하는 것을 금지**한다.
- 디자인 변경은 Design Core 전용 Work Order를 통해서만 허용된다.

#### 3.5.2 신규 화면 규칙 (강제)

- **모든 신규 화면은 Design Core v1.0을 기본 UI로 사용**
- 신규 화면에서 default UI 생성 ❌
- 신규 화면에서 Variant 분기 ❌ (기본값이 Design Core)

#### 3.5.3 기존 화면 전환 규칙

- 기존 화면은 **Variant 방식으로만 전환**
- `ViewVariant = 'default' | 'design-core-v1'` 타입 사용
- 기존 UI 즉시 제거 ❌
- 암묵적 자동 전환 ❌

#### 3.5.4 확장 요청 처리

- 즉시 확장 ❌
- 별도 Work Order로만 처리 (Phase 4+)
- 서비스 요구로 임의 확장 ❌

> ⚠ 본 규칙을 위반한 UI/디자인 변경은 **기준 위반**으로 간주한다.
> 📄 상세 운영 규칙: `docs/app-guidelines/design-core-governance.md`

---

## 4. Schema & Data 규칙

* **Migration First** 원칙 필수
* Extension/Service에서 Core Entity 수정 금지
* Soft FK(UUID) 패턴 허용
* ecommerceOrderId 규칙은 §7 참조

---

## 5. View / CMS 규칙 (CMS 2.0)

* CPT/ACF 기반 데이터 구조
* ViewComponent + ViewSystem 사용
* 하드코딩 Route/Menu 금지
* manifest.viewTemplates 필수

---

## 6. Work Order 필수 구조

모든 Work Order는 다음 순서를 따른다.

```
조사 → 문제확정 → 최소 수정 → 검증 → 종료
```

> 추측/가정 기반 작업 금지

### 6.1 브랜치 규칙 (필수)

* 모든 기능 개발은 반드시 `feature/*` 브랜치에서 수행
* 브랜치명 규칙: `feature/<app-id>-phase<n>`

### 6.2 품질 기준 (Definition of Done)

* `pnpm -F <app> build` 성공
* AppStore 설치 & 활성화 성공
* UI 화면 정상 렌더링 / 콘솔 에러 없음
* develop 브랜치에 대한 PR 테스트 통과

### 6.3 Work Order 표준 헤더 규칙 (강제)

모든 App / 기능 개발 Work Order는 반드시 다음 문서의 표준 헤더를 포함해야 한다.

```
docs/app-guidelines/work-order-standard-header.md
```

> ⚠ 해당 헤더가 없는 Work Order는 **무효**로 간주한다.
> ⚠ 본 규칙을 위반한 개발 작업은 즉시 중단한다.

### 6.4 신규 서비스 생성 표준 Work Order 규칙 (강제)

모든 신규 서비스 생성 작업은 반드시 아래 표준 Work Order 템플릿을 사용해야 한다.

```
docs/app-guidelines/new-service-workorder-template.md
```

> ⚠ 본 템플릿을 사용하지 않은 신규 서비스 생성 작업은 **무효**로 간주한다.
> ⚠ Service Template / InitPack / AppStore 정합성 판단은 본 템플릿을 기준으로 수행한다.

**적용 대상**
* 새로운 ServiceGroup 기반 서비스
* 기존 서비스의 신규 버전/변형
* Development → Active 전환을 목표로 하는 모든 서비스

**금지 사항**
* 템플릿 없이 임의로 Service Template 생성
* InitPack 없이 Active 서비스 전환
* Phase C Baseline을 벗어난 상태 지정

---

## 7. E-commerce Core 절대 규칙

> 주문/결제 기능이 있는 모든 서비스는 예외 없이 준수

### 7.1 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **주문 생성 = E-commerce Core** | 모든 주문은 `EcommerceOrderService.create()` 호출 필수 |
| **OrderType 불변성** | OrderType은 생성 시 결정, 이후 변경 금지 |
| **ecommerceOrderId 필수 연결** | 서비스 Entity는 반드시 ecommerceOrderId 저장 |

### 7.2 금지 사항

| 금지 | 사유 |
|------|------|
| E-commerce Core 우회 주문 생성 | 판매 원장 무결성 훼손 |
| OrderType 생성 후 변경 | 통계/분기 로직 파괴 |
| ecommerceOrderId 없이 서비스 주문만 생성 | 통합 조회 불가 |

### 7.3 미적용 예외

* 주문/결제 개념이 없는 순수 컨텐츠/커뮤니티 서비스
* 인프라/UI 전용 패키지
* **단, 미적용 시 반드시 문서화 필수**

---

## 8. 인프라 정보

> **GCP 단일 운영 체계** (Phase R5 확정)
> 상세: `docs/_platform/infra-migration-gcp.md`

### 8.1 서버 정보

| 서버 | 위치 | 역할 |
|------|------|------|
| **API 서버** | GCP Cloud Run (asia-northeast3) | o4o-core-api |
| 웹서버 | 13.125.144.8 (`ssh o4o-web`) | Nginx 프록시 + Static |

### 8.2 배포 경로

| 앱 | 배포 대상 | 방식 |
|----|-----------|------|
| API | Cloud Run (o4o-core-api) | GitHub Actions 자동 |
| Admin (개발) | `/var/www/dev-admin.neture.co.kr` | o4o-web |
| Admin (프로덕션) | `/var/www/admin.neture.co.kr` | o4o-web |
| Main Site | `/var/www/neture.co.kr` | o4o-web |

### 8.3 배포 규칙

* **API 서버**: `main` 브랜치 push 시 Cloud Run 자동 배포
* **프론트엔드**: `apps/main-site/**` 또는 `apps/admin-dashboard/**` 변경 시 수동 배포
* 스크립트: `./scripts/deploy-admin-manual.sh`, `./scripts/deploy-main-site-manual.sh`

### 8.4 금지 사항

* ❌ AWS EC2로의 배포 시도
* ❌ 신규 AWS 리소스 생성
* ❌ `43.202.242.215` (구 API 서버) 참조

---

## 9. 문서 정책 (간소화)

* CLAUDE.md = 최상위 기준
* 다른 문서는 **보조 설명**
* 중복 문서 생성 금지
* 충돌 시 CLAUDE.md 우선

### 9.1 문서 구조

```
docs/
├── app-guidelines/  # 앱 개발 가이드라인
├── specs/           # 앱별 스펙
├── reports/         # 완료 보고서
├── guides/          # 사용자 매뉴얼
└── plan/active/     # 진행 중인 작업
```

### 9.2 표준 템플릿 참조 원칙

CLAUDE.md가 참조하는 표준 템플릿 문서는 실무 실행 기준이며,
모든 개발 에이전트는 이를 우선 적용한다.

| 템플릿 | 용도 |
|--------|------|
| `work-order-standard-header.md` | 모든 Work Order 필수 헤더 |
| `new-service-workorder-template.md` | 신규 서비스 생성 표준 |
| `phase-d-new-app-checklist.md` | 신규 앱 개발 체크리스트 |
| `design-core-governance.md` | Design Core 적용 운영 규칙 |

---

## 10. API 호출 규칙

* **authClient 사용 필수**: `authClient.api.get()`, `authClient.api.post()`
* 환경변수 직접 사용 금지 (`VITE_API_URL` 등)
* 하드코딩된 URL 금지

---

## 11. Cosmetics Domain Rules (Mandatory)

> cosmetics 도메인은 Core와 분리된 독립 DB 스키마를 가지며,
> 아래 규칙을 위반하는 작업은 **즉시 중단 및 재설계 대상**이다.

### 11.1 DB 소유권 원칙

| 원칙 | 설명 |
|------|------|
| 독립 스키마 | cosmetics 도메인은 자체 DB 스키마를 가진다 |
| Core 생성 금지 | Core DB에 cosmetics 전용 테이블 생성 금지 |
| 참조만 허용 | Core DB는 `user_id` 참조만 가능, 소유권 없음 |

### 11.2 테이블 네이밍 규칙

모든 cosmetics 테이블은 `cosmetics_` prefix 필수 (예외 없음)

```
cosmetics_products
cosmetics_brands
cosmetics_price_policies
```

### 11.3 절대 금지 데이터

cosmetics DB에 아래 데이터 저장 금지:
* 사용자 개인정보 (email, phone, name 등)
* 역할/권한/인증 정보
* Core 설정값 (apps, settings 등)

### 11.4 Core 관계 규칙

* `user_id`는 문자열/UUID로만 저장
* **FK 제약을 Core 테이블에 설정 금지** (서비스 간 결합 방지)
* Core DB 변경이 cosmetics DB에 영향을 주면 안 됨

### 11.5 마이그레이션 규칙

* cosmetics DB 마이그레이션은 **cosmetics-api만** 수행
* Core 마이그레이션과 **동시 실행 금지**
* cosmetics 스키마 변경은 Core 배포와 **독립적**이어야 함

> 📄 상세 규정: `docs/architecture/cosmetics-db-schema.md`

---

## 12. Cosmetics API Rules (Mandatory)

> cosmetics-api는 화장품 비즈니스 로직만 담당하며,
> 플랫폼 기능(인증, 사용자 관리 등)을 재구현하는 것은 **절대 금지**한다.

### 12.1 API 책임 범위

| 허용 | 금지 |
|------|------|
| 상품/브랜드/가격 CRUD | 사용자 CRUD |
| 비즈니스 검증 | 로그인/토큰 발급 |
| Cosmetics DB 관리 | 인증/권한 처리 |
| 감사 로그 기록 | Core 설정 접근 |

### 12.2 인증 규칙

| 허용 | 금지 |
|------|------|
| JWT 검증 (verify) | JWT 발급 (sign) |
| user_id 추출 | 토큰 갱신 (refresh) |
| Scope 확인 | 새 토큰 생성 |

**Scope 규칙**: `cosmetics:read`, `cosmetics:write`, `cosmetics:admin`만 사용

### 12.3 데이터 접근 규칙

| DB | 읽기 | 쓰기 |
|----|------|------|
| Cosmetics DB | ✅ | ✅ |
| Core DB | ⚠️ 제한적 | ❌ 절대 금지 |

Core DB 읽기 허용: `users.id`, `users.name` (감사 로그 표시용만)

### 12.4 금지 API 엔드포인트

```
POST /cosmetics/users          ❌
POST /cosmetics/auth/login     ❌
POST /cosmetics/auth/token     ❌
GET  /cosmetics/settings       ❌
POST /cosmetics/orders         ❌
```

### 12.5 통신 규칙

| 허용 | 금지 |
|------|------|
| cosmetics-web → cosmetics-api | core-api → cosmetics-api |
| cosmetics-api → core-api (읽기) | cosmetics-api → 타 business-api |

### 12.6 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| 금지 API 생성 | 즉시 삭제 |
| JWT 발급 구현 | 즉시 제거 |
| Core DB 쓰기 | 롤백 및 재설계 |

> 📄 상세 규정: `docs/architecture/cosmetics-api-rules.md`
> 📄 API 스펙: `docs/services/cosmetics/api-definition.md`
> 📄 서비스 흐름: `docs/services/cosmetics/service-flow.md`

---

## 13. Cosmetics Web Integration Rules (Mandatory)

> cosmetics-web은 UI/UX 전담이며,
> 비즈니스 로직/DB 접근/인증 처리를 직접 구현하는 것은 **절대 금지**한다.

### 13.1 역할 분리

| 구성 요소 | 책임 | 금지 |
|-----------|------|------|
| cosmetics-web | UI/UX, 상태 표현 | 비즈니스 로직, DB 접근 |
| cosmetics-api | 비즈니스 로직, 검증 | JWT 발급, 사용자 관리 |
| core-api | 인증, 권한 | 도메인 비즈니스 |

### 13.2 호출 규칙

| 허용 | 금지 |
|------|------|
| Browser → cosmetics-web → cosmetics-api | Browser → cosmetics-api 직접 |
| cosmetics-web → core-api (로그인만) | cosmetics-web → 타 API 직접 |

### 13.3 인증/권한 흐름

```
로그인: Browser → cosmetics-web → core-api → JWT 발급
API:   cosmetics-web → cosmetics-api (Bearer JWT)
```

* JWT 저장: cosmetics-web (localStorage/cookie)
* JWT 검증: cosmetics-api만
* JWT 발급: core-api만

### 13.4 금지 사항 (절대)

| 금지 | 이유 |
|------|------|
| Web에서 비즈니스 검증 | API 책임 |
| Web에서 DB/ORM 접근 | 계층 분리 |
| Web에서 Core 설정 참조 | 도메인 분리 |
| API URL 하드코딩 | 환경 분리 |
| Browser → API 직접 호출 | 보안/CORS |

### 13.5 환경변수 규칙

```
# cosmetics-web 필수
COSMETICS_API_URL=https://cosmetics-api.neture.co.kr
CORE_API_URL=https://api.neture.co.kr

# 금지
하드코딩 URL ❌
```

### 13.6 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| Web에서 비즈니스 로직 | API로 이전 |
| Web에서 DB 접근 | 즉시 제거 |
| Browser → API 직접 | cosmetics-web 경유로 변경 |

> 📄 상세 규정: `docs/architecture/cosmetics-web-integration-rules.md`
> 📄 호출 계약: `docs/services/cosmetics/web-api-contract.md`
> 📄 배포 경계: `docs/services/cosmetics/deployment-boundary.md`

---

## 14. API Contract Enforcement Rules (Mandatory)

> OpenAPI 스펙은 **문서가 아니라 계약**이며,
> 코드보다 우선한다. 계약 위반 코드는 **빌드/배포 단계에서 차단**된다.

### 14.1 OpenAPI의 지위

| 원칙 | 설명 |
|------|------|
| 단일 진실 원본 | `openapi.yaml`이 API 계약의 유일한 기준 |
| 계약 우선 | 코드와 스펙 충돌 시 → 코드가 틀린 것 |
| CI 강제 | 계약 위반 시 빌드 실패 |

### 14.2 허용/금지 스키마

| 허용 | 금지 |
|------|------|
| 도메인 비즈니스 스키마 | User/Auth 스키마 |
| 명시적 타입 정의 | `any`, `additionalProperties: true` |
| `cosmetics:*` scope | `users:*`, `admin:*` scope |

### 14.3 HTTP 상태코드 규칙

허용 상태코드: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `500`

```yaml
# 금지: 의미 없는 200
responses:
  '200':
    description: OK  ❌

# 필수: 명확한 스키마
responses:
  '200':
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Response'  ✅
```

### 14.4 CI 검증 규칙

| 대상 | 검증 항목 | 실패 시 |
|------|-----------|---------|
| API | OpenAPI에 없는 라우트 | 빌드 실패 |
| API | 응답 스키마 불일치 | 빌드 실패 |
| Web | OpenAPI에 없는 API 호출 | 빌드 실패 |
| Web | 요청/응답 타입 불일치 | 빌드 실패 |

### 14.5 변경 프로세스

```
1. OpenAPI 스펙 먼저 업데이트 (Phase 승인)
2. 타입 재생성
3. API/Web 구현
4. CI 통과 확인
5. 병합
```

**금지**: 코드 먼저 구현 후 스펙 업데이트

### 14.6 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| OpenAPI에 없는 API 구현 | CI 실패, 병합 불가 |
| 금지 스키마 포함 | 즉시 제거 |
| 승인 없는 스펙 변경 | 롤백 |

> 📄 OpenAPI 스펙: `docs/services/cosmetics/openapi.yaml`
> 📄 작성 규칙: `docs/services/cosmetics/openapi.rules.md`
> 📄 검증 가이드: `docs/services/cosmetics/contract-validation.md`

---

## 15. Business API Template Rules (Mandatory)

> 모든 Business API는 **템플릿에서 시작**해야 하며,
> 임의 생성은 금지된다. 템플릿을 통과한 것만 개발 허용.

### 15.1 적용 대상

| API | 상태 |
|-----|------|
| cosmetics-api | Active (템플릿 원본) |
| yaksa-api | Planned |
| dropshipping-api | Planned |
| tourism-api | Planned |
| 이후 모든 business-api | 필수 적용 |

### 15.2 공통 원칙

| 원칙 | 설명 |
|------|------|
| 자신의 DB만 소유 | `{business}_` prefix 테이블 |
| Core 의존 최소화 | 인증·권한만 Core 사용 |
| OpenAPI 계약 필수 | 단일 진실 원본 |
| 독립 배포 | Core와 분리된 Cloud Run 서비스 |

### 15.3 금지 사항 (공통)

| 금지 | 이유 |
|------|------|
| 사용자/권한/인증 처리 | Core 책임 |
| Core DB 쓰기 | 절대 금지 |
| 다른 Business API 호출 | 결합 방지 |
| OpenAPI 미정의 API | 계약 위반 |
| 템플릿 없이 생성 | 표준화 위반 |

### 15.4 템플릿 사용 절차

```bash
# 1. 템플릿 복사
cp -r docs/templates/business-api-template docs/services/{business}/

# 2. 플레이스홀더 치환
sed -i 's/{business}/cosmetics/g' *.md *.yaml

# 3. OpenAPI 정의
vim openapi.yaml

# 4. 규칙 확인 후 개발
```

### 15.5 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| 템플릿 미사용 | 개발 중단, 재시작 |
| 금지 API 구현 | 즉시 삭제 |
| Core DB 쓰기 | 롤백 |
| 타 Business 호출 | 제거 |

> 📄 템플릿 디렉터리: `docs/templates/business-api-template/`
> 📄 공통 규칙: `docs/architecture/business-api-template.md`

---

## 16. Business Web Template Rules (Mandatory)

> 모든 Business Web은 **템플릿에서 시작**해야 하며,
> 임의 생성은 금지된다. 템플릿을 통과한 것만 개발 허용.

### 16.1 적용 대상

| Web | 상태 |
|-----|------|
| cosmetics-web | Planned (템플릿 원본) |
| yaksa-web | Planned |
| dropshipping-web | Planned |
| tourism-web | Planned |
| 이후 모든 business-web | 필수 적용 |

### 16.2 역할 정의

| 허용 | 금지 |
|------|------|
| UI 렌더링 및 사용자 상호작용 | 비즈니스 로직 구현 |
| API 응답 데이터 표시 | 데이터 검증 (형식만 허용) |
| 폼 입력 수집 및 API 전달 | DB/ORM 직접 접근 |
| JWT 보관 및 전달 | JWT 발급/검증 |

### 16.3 호출 규칙

| 허용 | 금지 |
|------|------|
| Browser → {business}-web | Browser → {business}-api 직접 |
| {business}-web → {business}-api | {business}-web → Core API 직접 |
| {business}-web → Core (로그인만) | {business}-web → 타 business-api |

### 16.4 JWT 처리 규칙

| 역할 | 허용/금지 |
|------|-----------|
| JWT 저장 | ✅ (localStorage 또는 httpOnly cookie) |
| JWT 전달 | ✅ (Authorization 헤더) |
| JWT 만료 확인 | ✅ (exp 클레임 확인만) |
| JWT 발급 | ❌ |
| JWT 서명 검증 | ❌ |

### 16.5 라우팅 규칙

**허용 패턴**:
```
/                     # 메인 페이지
/{entities}           # 목록 페이지
/{entities}/{id}      # 상세 페이지
/admin/{entities}     # 관리 페이지
```

**금지 패턴**:
```
/api/*                ❌  # API 라우트 처리 금지
/auth/*               ❌  # Core 담당
/users/*              ❌  # Core 담당
/settings/*           ❌  # Core 담당
```

### 16.6 템플릿 사용 절차

```bash
# 1. 템플릿 복사
cp -r docs/templates/business-web-template docs/services/{business}/web/

# 2. 플레이스홀더 치환
sed -i 's/{business}/cosmetics/g' *.md

# 3. 앱 디렉터리 생성
mkdir -p apps/{business}-web
```

### 16.7 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| 템플릿 미사용 | 개발 중단, 템플릿에서 재시작 |
| 비즈니스 로직 구현 | API로 이전 |
| DB 직접 접근 | 즉시 제거 |
| Browser → API 직접 호출 | Web 경유로 변경 |

> 📄 템플릿 디렉터리: `docs/templates/business-web-template/`
> 📄 공통 규칙: `docs/architecture/business-web-template.md`

---

## 17. Multi-Business Operations Rules (Mandatory)

> 여러 Business 서비스가 동시에 운영될 때의 규칙.
> 서비스 간 격리 및 독립성을 보장해야 한다.

### 17.1 독립성 원칙

| 원칙 | 설명 |
|------|------|
| 배포 독립 | 각 서비스는 독립 배포 단위 |
| 데이터 독립 | 각 서비스는 자체 DB/스키마 소유 |
| 장애 격리 | 하나의 장애가 다른 서비스에 영향 없음 |
| 버전 독립 | 각 서비스는 독립 버전 관리 |

### 17.2 금지 통신 경로

| 금지 경로 | 이유 |
|-----------|------|
| cosmetics-api → yaksa-api | 서비스 간 직접 호출 금지 |
| cosmetics-web → yaksa-api | 타 서비스 API 호출 금지 |
| cosmetics-api → yaksa_db | 타 서비스 DB 접근 금지 |
| Core API → {business}-api | 역방향 호출 금지 |

### 17.3 DB 분리 규칙

| 원칙 | 설명 |
|------|------|
| 전용 DB/스키마 | 각 서비스는 자체 DB 소유 |
| 테이블 네이밍 | `{business}_` 접두사 필수 |
| FK 금지 | 타 서비스 테이블에 FK 설정 금지 |
| 직접 접근 금지 | API를 통해서만 데이터 접근 |

### 17.4 Scope 분리

각 서비스는 자체 Scope 네임스페이스를 가진다:

```
cosmetics:read, cosmetics:write, cosmetics:admin
yaksa:read, yaksa:write, yaksa:admin
dropshipping:read, dropshipping:write, dropshipping:admin
```

### 17.5 개발 환경 포트 할당

| 서비스 | Web 포트 | API 포트 |
|--------|----------|----------|
| Core | - | 3001 |
| cosmetics | 4001 | 4002 |
| yaksa | 4011 | 4012 |
| dropshipping | 4021 | 4022 |

### 17.6 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| 서비스 간 직접 호출 | 즉시 제거 |
| 타 서비스 DB 접근 | 즉시 제거 및 재설계 |
| Core 테이블 FK 설정 | FK 제거 |
| 공유 패키지에 도메인 로직 | 서비스로 이전 |

> 📄 상세 규정: `docs/architecture/multi-business-operations.md`

---

## 18. 최종 원칙

> **새 앱을 만들기 전에,
> "이게 위 기준을 모두 만족하는가?"를 먼저 확인하라.**

---

*Updated: 2025-12-29*
*Version: 2.8*
*Status: Active Constitution*
