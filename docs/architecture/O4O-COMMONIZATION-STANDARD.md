# O4O Commonization Standard

> **상위 문서**: `CLAUDE.md`
> **관련**: `docs/o4o-common-structure.md`, `docs/platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md`, `docs/architecture/STORE-LAYER-ARCHITECTURE.md`, `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md`
> **버전**: V2
> **작성일**: 2026-05-02 · **개정**: 2026-08-03 (V2 — 공식 대상 서비스 재정렬)
> **상태**: Active Standard
>
> 이 문서는 O4O 플랫폼에서 "**이게 공통화 맞느냐**"를 판단하는 기준 문서이다. 모든 공통화 관련 작업(WO/IR/구현/리뷰)은 이 문서를 기준으로 결정한다.

---

## 0. 현재 스코프 선언 (V2)

> 근거: [`WO-O4O-COMMONIZATION-STANDARD-SCOPE-REALIGNMENT-V1`](../work-orders/WO-O4O-COMMONIZATION-STANDARD-SCOPE-REALIGNMENT-V1.md) · [`IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1`](../investigations/IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1.md)

### 0.1 Cycle 1 은 종료되었다

**공통화 Cycle 1 은 2026-06-15 CLOSED** 되었다([`CHECK-O4O-CROSS-SERVICE-COMMONIZATION-CYCLE1-CLOSURE-V1`](../checks/CHECK-O4O-CROSS-SERVICE-COMMONIZATION-CYCLE1-CLOSURE-V1.md)). 14개 축(LMS·AI편집·내매장 실행·콘텐츠/자료실·POP/QR/블로그·운영자 공통 콘솔·법정정보·서비스 가이드·아이콘/사이드바·Contact·주문 상태 라벨·Forum/community·Mypage·회원관리)은 2026-08-03 실측에서도 유지된다.

> **이 14개 축에 대해 "공통화를 새로 설계"하는 작업은 중복이다.** V2 이후의 작업은 **재설계가 아니라 재정렬 + adoption** 이다.

### 0.2 V2 개정의 성격

| 구분 | 내용 |
|------|------|
| 변경한 것 | **공식 대상 서비스 집합**(§3) 과 그에 따른 매트릭스 표기(§9) |
| 변경하지 않은 것 | 공통화 정의(§1) · Hub 표준(§2) · Layout 정책(§4) · Template 원칙(§5) · 판정 체크리스트(§6) · 금지사항(§7) · dead code 기준(§8) |
| 번복하지 않은 것 | Cycle 1 종료 판정, 기존 채택 검증 기록 |

### 0.3 Frozen baseline 은 본 개정으로 변경되지 않는다

[`UX-CORE-FREEZE-V1`](../baseline/UX-CORE-FREEZE-V1.md) · [`STORE-UI-CORE-FREEZE-V1`](../baseline/STORE-UI-CORE-FREEZE-V1.md) · [`O4O-CORE-FREEZE-V1`](./O4O-CORE-FREEZE-V1.md)(F10) · [`STORE-LAYER-ARCHITECTURE`](./STORE-LAYER-ARCHITECTURE.md)(F3) 는 전부 그대로 유효하다.

### 0.4 legacy 정비와 신규 adoption 을 섞지 않는다

| 트랙 | 내용 | 문서 |
|------|------|------|
| **legacy 정비** | 소비 0 패키지·불명확한 seam 정리 | 별도 WO/IR |
| **신규 adoption** | 신규 서비스가 기존 core 를 채택 | 별도 IR |

한 작업에서 둘을 함께 처리하면 "core 가 바뀐 것"과 "채택이 늘어난 것"을 구분할 수 없게 된다.

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

### 3.0 공식 대상 서비스 (V2, 2026-08-03)

| 서비스 | 경로 | 역할 | 공통화 범위 | 성숙도 |
|--------|------|------|-------------|--------|
| **KPA-Society** | `services/web-kpa-society` | **reference implementation** — 기준 구현 제공 | 전체 | `MATURE_REFERENCE` |
| **K-Cosmetics** | `services/web-k-cosmetics` | **frame 검증체** — 공통 core 를 가장 얇게 소비 | 전체 | `MATURE_SHARED_CORE_CONSUMER` |
| **Neture** | `services/web-neture` | **독립 앱 + 넓은 공통 소비** | **부분 채택** — §3.1 | `INDEPENDENT_APP_WITH_SHARED_CORES` |
| **PharmacyHub** | `services/web-pharmacy-hub` | **신규 서비스** — 공통 인증만 채택 | **adoption 초기** — §3.3 | `NEW_SERVICE_EARLY_ADOPTION` |

### 3.0.1 KPA reference 의 의미

KPA 가 reference 라는 것은 **"KPA 코드 전체 = 공통 프레임"이라는 뜻이 아니다.** KPA 코드를 공통화 판단 근거로 쓸 때는 항상 3분류한다.

| 구분 | 처리 |
|------|------|
| 다른 서비스에도 적용해야 하는 **canonical core** | 기준 구현 |
| KPA 에서 먼저 구현되었으나 아직 추출되지 않은 **공통 후보** | 실제 소비 축이 **2개 이상**일 때만 추출(투기적 추상화 금지) |
| 약국·약사·의약품 업무 전용 **KPA extension** | 서비스 고유. 공통화 대상 아님 |

KPA↔K-Cosmetics 비교의 목적은 **두 앱을 하나로 합치는 것이 아니라**, 두꺼운 기준 구현과 얇은 adoption 구현을 대조해 `core` / `service config` / `extension` / `KPA local 잔여` 4가지를 분리해 내는 것이다.

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

> **주의**: Neture 가 채택하지 않은 축(LMS · 매장 실행)은 **adoption gap 이 아니라 의도된 서비스 경계**다. 이 축들을 "미달"로 집계하거나 채택을 요구하지 않는다.

### 3.3 PharmacyHub 취급 원칙 (V2 신설)

PharmacyHub 는 현재 **공통 인증(`@o4o/auth-client` · `@o4o/auth-utils`)만 채택**했고, 그 외 화면은 공통 패키지를 경유하지 않는 자체 구현이다.

> **이 사실이 "PharmacyHub 는 모든 공통 core 를 의무 적용해야 한다"는 뜻은 아니다.** 자체 구현이 잘못되었다는 판정도 아니다.

PharmacyHub 영역은 다음 3구분으로만 다룬다.

| 구분 | 내용 |
|------|------|
| **① 기반 채택 대상** (적용 가능성 높음) | `@o4o/types` · `@o4o/ui` · `@o4o/error-handling` · `@o4o/account-ui` · `@o4o/shared-space-ui` · `@o4o/operator-ux-core` · 일부 `@o4o/operator-core-ui` |
| **② 화면별 판단 대상** | `@o4o/store-ui-core` · `@o4o/store-products-ui` · `@o4o/content-editor` · forum · tablet · signage |
| **③ 서비스 고유 유지** | 공급자↔약국 경영자 직접 연결 · B2B 주문 · 결제 · 거래 조건 · PharmacyHub 전용 membership · 역할별 업무 흐름 |

**판정 단위는 패키지가 아니라 화면군이다.** 화면군별 판정은 후속 `IR-O4O-PHARMACY-HUB-COMMON-CORE-ADOPTION-SCOPE-V1` 범위이며, 본 문서는 판정 결과를 선점하지 않는다.

### 3.4 GlycoPharm — historical out-of-scope (V2)

GlycoPharm 은 **제거 검토 중**이므로 공식 대상 서비스에서 제외한다.

| 항목 | 처리 |
|------|------|
| 조사 | 하지 않음 (기능 비교 · route parity 조사 금지) |
| 신규 공통 모듈 적용 | 검토하지 않음 |
| extension 정비 | 하지 않음 |
| 코드 수정·삭제 | 하지 않음 |
| core 요구사항 | GlycoPharm 을 이유로 확대하지 않음 |
| **기존 문서 기재** | **삭제하지 않는다** — `historical` 로 표시해 Cycle 1 검증 기록의 사실성을 보존한다 |

즉 GlycoPharm 관련 기재는 **이력(historical)** 이며, **현재 서비스의 판정 근거로 사용하지 않는다.**

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

### 9.0 매트릭스 갱신 원칙 (V2 신설)

| 원칙 | 내용 |
|------|------|
| **실측 근거** | `package.json` 의 dependency 선언은 **채택 근거가 아니다.** `src/**` 의 실제 import 를 확인한 결과만 기재한다 |
| **미조사 = 공백** | 확인하지 않은 칸은 추정으로 채우지 않고 `미조사` 로 표기한다 |
| **의도적 제외 ≠ gap** | 서비스 경계상 해당 없는 축은 `제외` 로 표기하며 미달 집계에 포함하지 않는다 |
| **historical 보존** | 대상에서 빠진 서비스의 과거 검증 기록은 삭제하지 않고 `(historical)` 로 남긴다 |

> dependency 만 있고 import 가 0 인 실제 사례가 존재한다(`@o4o/operator-core` 는 저장소 전체 소비 0인데 3개 서비스가 dependency 선언 유지). 반대로 import 0 이 정상인 사례도 있다(`@o4o/screen-content-core` — 간접/빌드 의존). 그래서 실측이 필요하다.

### 9.1 Hub Template

**검증 일자**: 2026-05-02 (KPA/GP/KCos/Neture) · 2026-08-03 (PharmacyHub 열 추가)
**기준**: `services/web-{service}/src/pages/**/*.tsx`에서 `@o4o/shared-space-ui` Template import 여부

| Domain | KPA-Society | K-Cosmetics | Neture | PharmacyHub | GlycoPharm *(historical)* |
|--------|:-----------:|:-----------:|:------:|:-----------:|:-----------------------:|
| **Forum** | ✅ A | ✅ A | ✅ A | — 미채택 | ✅ A |
| **Content** | ✅ A | ✅ A | ✅ A | — 미채택 | ✅ A |
| **Resources** | ✅ A | ✅ A | ✅ A | — 미채택 | ✅ A |
| **LMS** | ✅ A | ✅ A | ❌ 제외 | — 미채택 | ✅ A |
| **Store-Hub** | ✅ A | ✅ A | ❌ 제외 | — 미채택 | ✅ A |
| **Signage** | ✅ A (Manager) | ✅ A (Manager) | ⏸ 보류 | — 미채택 | ✅ A (Hub) |

범례:
- **A** = Adopted (Template 채택)
- **제외** = Domain 자체가 적용 대상 아님 (gap 아님)
- **보류** = 향후 결정
- **미채택** = 실측상 Template import 0. **적용 대상 여부는 미판정** — 화면군별 판정은 후속 IR(§3.3)
- *(historical)* = 공식 대상에서 제외된 서비스의 과거 검증 기록 (§3.4). **현재 판정 근거로 사용하지 않음**
- (Manager) = `SignageManagerTemplate` (영상/플레이리스트형) · (Hub) = `SignageHubTemplate` (콘텐츠 목록형)

### 9.2 채택 파일 위치 (verified)

| Domain | KPA | K-Cos | Neture | PharmacyHub | Glyco *(historical)* |
|--------|-----|-------|--------|-------------|--------------------|
| Forum | `forum/ForumHomePage.tsx` | `forum/ForumHubPage.tsx` | `forum/ForumHubPage.tsx` | — | `forum/ForumHubPage.tsx` |
| Content | `pharmacy/HubContentLibraryPage.tsx` | `library/ContentLibraryPage.tsx` | `library/ContentLibraryPage.tsx` | — | `hub/HubContentListPage.tsx` |
| Resources | `resources/ResourcesHubPage.tsx` | `resources/ResourcesPage.tsx` | `resources/NetureResourcesPage.tsx` | — | `resources/ResourcesPage.tsx` |
| LMS | `lms/EducationPage.tsx` | `lms/EducationPage.tsx` | — | — | `education/EducationPage.tsx` |
| Store-Hub | `pharmacy/StoreHubPage.tsx` | `hub/KCosmeticsHubPage.tsx` | — | — | `hub/StoreHubPage.tsx` |
| Signage | `signage/ContentHubPage.tsx` (Manager) | `signage/ContentHubPage.tsx` (Manager) | — | — | `store-management/signage/ContentLibraryPage.tsx` (Hub) |

### 9.3 Layout 표준 (Hub 외)

| 영역 | 표준 문서 | 적용 |
|------|----------|------|
| `/store` | `STORE-LAYER-ARCHITECTURE.md` | KPA · K-Cos (Neture 부분 · PharmacyHub 미채택) |
| `/operator` | `OPERATOR-DASHBOARD-STANDARD-V1.md` | KPA · K-Cos · Neture (PharmacyHub 미채택) |
| `/mypage` | (별도 표준 문서 미정) | 서비스별 운영, 향후 표준화 검토 |

> 상세 adoption 실측(공통 패키지 25종 × 4서비스)은 [`IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1` §7](../investigations/IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1.md) 참조.

---

## 10. 현재 트랙 (V2)

이번 정비는 **공통화 설계가 아니라** 다음 3축이다.

| 축 | 내용 | 상태 |
|:--:|------|------|
| **A** | **기준 문서 재정렬** — 공식 대상 서비스 집합 갱신, GlycoPharm historical 분리 | **본 V2 개정으로 완료** |
| **B** | **PharmacyHub adoption** — 화면군 단위 판정 → 우선순위 → 리팩터링 순서 → 회귀 검증 | 후속 IR |
| **C** | **legacy · seam 정비** — `@o4o/operator-core` · `@o4o/auth-context` · 서비스별 `AuthContext` · `forum-core`↔`shared-space-ui` 경계 · GP 페어링 추출물 잔존 소비처 · dormant LMS export | 후속 WO/IR |

**축 B 와 축 C 를 같은 작업에서 처리하지 않는다**(§0.4).

---

## 11. 참조 문서

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
| **Cycle 1 종료 기록** | [`docs/checks/CHECK-O4O-CROSS-SERVICE-COMMONIZATION-CYCLE1-CLOSURE-V1.md`](../checks/CHECK-O4O-CROSS-SERVICE-COMMONIZATION-CYCLE1-CLOSURE-V1.md) |
| **공통화 자산 현황 조사** | [`docs/investigations/IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1.md`](../investigations/IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1.md) |
| **V2 재정렬 WO** | [`docs/work-orders/WO-O4O-COMMONIZATION-STANDARD-SCOPE-REALIGNMENT-V1.md`](../work-orders/WO-O4O-COMMONIZATION-STANDARD-SCOPE-REALIGNMENT-V1.md) |

---

## Changelog

| 날짜 | 버전 | 변경 |
|------|------|------|
| 2026-05-02 | V1 | 초안 작성 — 공통화 정의, 6개 Hub 채택 매트릭스 코드 검증, Neture 부분 채택 명시, 판정 체크리스트, 금지/dead code 정리 기준 |
| 2026-08-03 | V2 | **공식 대상 서비스 재정렬** — §0 스코프 선언 신설(Cycle 1 CLOSED 계승 · frozen baseline 불변 · legacy↔adoption 분리) · §3.0 공식 4서비스(KPA/K-Cos/Neture/PharmacyHub) + 역할·성숙도 · §3.0.1 KPA reference 3분류 · §3.3 PharmacyHub 취급 원칙(3구분, 의무 적용 아님) · §3.4 GlycoPharm historical out-of-scope(삭제 아닌 표시) · §9.0 매트릭스 갱신 원칙(dependency≠adoption) · §9.1~9.3 매트릭스 열 재정렬 · §10 현재 트랙 3축(기존 §10 참조 문서 → §11). **공통화 정의·Hub 표준·Layout 정책·Template 원칙·체크리스트·금지사항은 변경 없음** |
