# O4O Commonization Standard

> **상위 문서**: `CLAUDE.md`
> **관련**: `docs/o4o-common-structure.md`, `docs/platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md`, `docs/architecture/STORE-LAYER-ARCHITECTURE.md`, `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md`
> **버전**: V1
> **작성일**: 2026-05-02
> **상태**: Active Standard
>
> 이 문서는 O4O 플랫폼에서 "**이게 공통화 맞느냐**"를 판단하는 기준 문서이다. 모든 공통화 관련 작업(WO/IR/구현/리뷰)은 이 문서를 기준으로 결정한다.

---

## 1. 공통화 정의

| 원칙 | 내용 |
|------|------|
| 공통화 = **구조 동일성** | UI/디자인 동일성이 아니다. 구조(Template/Layout/Config/serviceKey)가 같으면 공통화로 본다. |
| 4-요소 구조 | **공통 Template** + **공통 Layout** + **공통 config** + **serviceKey 기반 데이터 분리** |
| 서비스 차이 | `config` / `capability`로 처리. 코드에 `if (service === 'X')` 분기 금지. |

---

## 2. 공통 Hub 표준

### 2.1 대상 route

| Route | Template | 비고 |
|-------|----------|------|
| `/forum` | `ForumHubTemplate` | 게시판 허브 |
| `/content` | `ContentHubTemplate` | CMS 콘텐츠 라이브러리 |
| `/resources` | `ResourcesHubTemplate` | 자료실 |
| `/lms` (또는 `/education`) | `LmsHubTemplate` | 교육/강좌 |
| `/store-hub` | `StoreHubTemplate` | 매장 운영 안내 허브 |
| `/signage` | `SignageHubTemplate` 또는 `SignageManagerTemplate` | 사이니지 |

### 2.2 조건 (필수)

- 반드시 `@o4o/shared-space-ui`의 Template를 사용한다.
- Custom page (Template를 거치지 않는 자체 구현) 금지.
- Template 상세 규칙(Hero/Search/Pagination/Adapter/Override)은 [`O4O-HUB-TEMPLATE-STANDARD-V1.md`](../platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md) 참조.

---

## 3. 서비스별 채택 범위

| 서비스 | 공통화 범위 |
|--------|-------------|
| **KPA-Society** | 전체 (reference implementation) |
| **GlycoPharm** | 전체 |
| **K-Cosmetics** | 전체 |
| **Neture** | **부분 채택** — `/forum`, `/content`, `/resources`만 |

### 3.1 Neture 예외 사유

Neture는 공급자/파트너 협업 공간이 1차 도메인이며, 매장·교육 도메인을 직접 운영하지 않는다. 따라서 공통 Hub 중 일부만 채택한다.

| Route | Neture 상태 | 사유 |
|-------|-------------|------|
| `/forum` | ✅ 채택 | 커뮤니티 공통 구조 |
| `/content` | ✅ 채택 | CMS 콘텐츠 공통 구조 |
| `/resources` | ✅ 채택 | 자료실 공통 구조 |
| `/lms` | ❌ 제외 | Neture 도메인에 LMS 없음 |
| `/store-hub` | ❌ 제외 | Neture는 매장 운영 주체 아님 |
| `/store` | ❌ 제외 | 단, `/store/*` 일부는 공급자/파트너 운영 화면으로 별도 패턴 운영 (§ 4.2 참조) |
| `/signage` | ⏸ 보류 | 향후 결정 |

---

## 4. Layout 정책 (Hub 외 영역)

### 4.1 Home

- Home은 서비스별로 다를 수 있다 (서비스 정체성 표현 영역).
- 단, **Home에서 연결되는 기능 route는 공통 구조**(§ 2)를 사용해야 한다.

### 4.2 `/store` 구조

매장(서비스 사업자) 운영 화면은 다음 4개 요소로 공통화한다.

| 요소 | 역할 |
|------|------|
| `StoreDashboardLayout` | 좌측 메뉴 + 콘텐츠 영역 공통 레이아웃 |
| `storeMenuConfig` | 메뉴 정의 (서비스별 config) |
| `resolveStoreMenu` | capability 기반 메뉴 필터링 |
| capability 필터 | 매장 자격/권한에 따라 메뉴 노출 분기 |

**원칙**: 구조는 공통, 차이는 config로 처리.

상세: [`STORE-LAYER-ARCHITECTURE.md`](./STORE-LAYER-ARCHITECTURE.md), [`O4O-STORE-RULES.md`](./O4O-STORE-RULES.md).

### 4.3 `/operator` 구조

- `OperatorShell` 기반 공통 레이아웃을 사용한다.
- 서비스별 wrapper(`KpaOperatorLayoutWrapper`, `OperatorLayoutWrapper` 등)는 **허용** — 단, OperatorShell의 구조(사이드바 + 5-Block Dashboard)를 동일하게 유지하는 조건.
- wrapper 자체를 custom layout으로 판단하지 않는다.

상세: [`OPERATOR-DASHBOARD-STANDARD-V1.md`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md).

---

## 5. Template 사용 원칙

| 규칙 | 내용 |
|------|------|
| 패키지 단일 | `@o4o/shared-space-ui`만 사용 |
| Template 복사 금지 | 서비스별 디렉터리에 Template 코드 복사 금지 |
| 서비스별 custom Template 금지 | `XxxForumHubTemplate.tsx` 같은 서비스 전용 Template 신설 금지 |
| Override 최소화 | Config로 표현 가능한 차이는 Config로. `renderXxxSection` override는 명시 WO 승인 필요 |
| 우선순위 | Config > section override > 별도 페이지 (Override) |

Override 정책 상세: [`O4O-HUB-TEMPLATE-STANDARD-V1.md` § 8](../platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md).

---

## 6. 판정 체크리스트

새 화면 도입, 기존 화면 리뷰, 공통화 점검 시 아래 6개 모두 ✅이면 공통화 OK.

- [ ] **같은 Template**을 사용하는가 (`@o4o/shared-space-ui`)
- [ ] **같은 Layout**을 사용하는가 (NetureLayout / KpaLayout 등 — 동일 구조 wrapper 포함)
- [ ] **config 기반**으로 서비스 차이가 분리되는가 (코드 분기 X)
- [ ] **serviceKey로 데이터 격리**되는가
- [ ] **route ↔ menu 연결**이 일관되게 정의되어 있는가
- [ ] **API/DB 참조 일관성**이 유지되는가 (서비스별 독립 테이블/엔드포인트 X)

하나라도 ❌면 공통화 미달 → 작업 대상.

---

## 7. 금지사항

| 금지 | 이유 |
|------|------|
| 서비스별 page 복사 후 수정 | 유지보수 분기 발생, 공통 구조 분열 |
| 동일 기능의 custom page 유지 | Template로 가능한데 별도 구현 시 표준 위반 |
| Template bypass | Template 미사용으로 직접 구현 (Override WO 없이) |
| 공통 구조 대신 서비스별 구현 | Boundary Policy 위반 |
| Forum/LMS/Signage 별도 재구현 | 공통 구조 원칙 위반 — [`o4o-common-structure.md` § 6](../o4o-common-structure.md) 참조 |
| 서비스별 독립 테이블 (e.g. `kpa_forum_posts`) | 데이터 레이어 분열 |

---

## 8. Dead Code 정리 기준

| 기준 | 내용 |
|------|------|
| 기능 제거 후 관련 코드 제거 | route, page, API client, 메뉴 항목 모두 |
| fallback / debug 코드 | 도입 목적이 끝나면 최종 제거 대상 |
| 사용되지 않는 route/API | 등록만 되고 호출 없는 라우트/엔드포인트 금지 |
| 중복 route 정리 | 동일 path가 다른 layout에 중복 등록되는 경우 canonical만 유지 |

공통화 작업의 마지막 단계는 항상 dead code 제거이다.

---

## 9. 현재 채택 매트릭스 (코드 검증 기준)

**검증 일자**: 2026-05-02
**기준**: `services/web-{service}/src/pages/**/*.tsx`에서 `@o4o/shared-space-ui` Template import 여부

### 9.1 Hub Template

| Domain | KPA-Society | GlycoPharm | K-Cosmetics | Neture |
|--------|:-----------:|:----------:|:-----------:|:------:|
| **Forum** | ✅ A | ✅ A | ✅ A | ✅ A |
| **Content** | ✅ A | ✅ A | ✅ A | ✅ A |
| **Resources** | ✅ A | ✅ A | ✅ A | ✅ A |
| **LMS** | ✅ A | ✅ A | ✅ A | ❌ 제외 |
| **Store-Hub** | ✅ A | ✅ A | ✅ A | ❌ 제외 |
| **Signage** | ✅ A (Manager) | ✅ A (Hub) | ✅ A (Manager) | ⏸ 보류 |

범례:
- **A** = Adopted (Template 채택)
- **제외** = Domain 자체가 적용 대상 아님
- **보류** = 향후 결정
- (Manager) = `SignageManagerTemplate` (영상/플레이리스트형)
- (Hub) = `SignageHubTemplate` (콘텐츠 목록형)

### 9.2 채택 파일 위치 (verified)

| Domain | KPA | Glyco | K-Cos | Neture |
|--------|-----|-------|-------|--------|
| Forum | `forum/ForumHomePage.tsx` | `forum/ForumHubPage.tsx` | `forum/ForumHubPage.tsx` | `forum/ForumHubPage.tsx` |
| Content | `pharmacy/HubContentLibraryPage.tsx` | `hub/HubContentListPage.tsx` | `library/ContentLibraryPage.tsx` | `library/ContentLibraryPage.tsx` |
| Resources | `resources/ResourcesHubPage.tsx` | `resources/ResourcesPage.tsx` | `resources/ResourcesPage.tsx` | `resources/NetureResourcesPage.tsx` |
| LMS | `lms/EducationPage.tsx` | `education/EducationPage.tsx` | `lms/EducationPage.tsx` | — |
| Store-Hub | `pharmacy/StoreHubPage.tsx` | `hub/StoreHubPage.tsx` | `hub/KCosmeticsHubPage.tsx` | — |
| Signage | `signage/ContentHubPage.tsx` (Manager) | `store-management/signage/ContentLibraryPage.tsx` (Hub) | `signage/ContentHubPage.tsx` (Manager) | — |

### 9.3 Layout 표준 (Hub 외)

| 영역 | 표준 문서 | 적용 |
|------|----------|------|
| `/store` | `STORE-LAYER-ARCHITECTURE.md` | 전체 서비스 (Neture 부분) |
| `/operator` | `OPERATOR-DASHBOARD-STANDARD-V1.md` | 전체 서비스 |
| `/mypage` | (별도 표준 문서 미정) | 서비스별 운영, 향후 표준화 검토 |

---

## 10. 참조 문서

| 영역 | 문서 |
|------|------|
| 상위 원칙 | `CLAUDE.md` § 13 (O4O 공통 구조 원칙), § 13-A (APP 표준화) |
| 공통 구조 원칙 | [`docs/o4o-common-structure.md`](../o4o-common-structure.md) |
| Hub Template 명세 | [`docs/platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md`](../platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md) |
| Store Layer | [`docs/architecture/STORE-LAYER-ARCHITECTURE.md`](./STORE-LAYER-ARCHITECTURE.md) |
| Store/Order | [`docs/architecture/O4O-STORE-RULES.md`](./O4O-STORE-RULES.md) |
| Operator Dashboard | [`docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) |
| Boundary Policy | [`docs/architecture/O4O-BOUNDARY-POLICY-V1.md`](./O4O-BOUNDARY-POLICY-V1.md) |
| KPA reference 구조 | [`docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md`](../baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md) |

---

## Changelog

| 날짜 | 버전 | 변경 |
|------|------|------|
| 2026-05-02 | V1 | 초안 작성 — 공통화 정의, 6개 Hub 채택 매트릭스 코드 검증, Neture 부분 채택 명시, 판정 체크리스트, 금지/dead code 정리 기준 |
