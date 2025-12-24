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

## 11. 최종 원칙

> **새 앱을 만들기 전에,
> "이게 위 기준을 모두 만족하는가?"를 먼저 확인하라.**

---

*Updated: 2025-12-16*
*Version: 2.1*
*Status: Active Constitution*
