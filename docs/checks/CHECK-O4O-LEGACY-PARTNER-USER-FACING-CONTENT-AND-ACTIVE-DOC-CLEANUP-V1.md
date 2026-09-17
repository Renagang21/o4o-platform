# CHECK-O4O-LEGACY-PARTNER-USER-FACING-CONTENT-AND-ACTIVE-DOC-CLEANUP-V1

> **WO**: WO-O4O-LEGACY-PARTNER-USER-FACING-CONTENT-AND-ACTIVE-DOC-CLEANUP-V1
> **작성일**: 2026-09-17 · **기준 commit**: census `7b11a9a2e` (origin/main, clean) → 구현 `38723ee1d`
> **선행**: [`CHECK-O4O-NETURE-O4O-BRAND-HEADER-SEO-ALIGNMENT-V1`](CHECK-O4O-NETURE-O4O-BRAND-HEADER-SEO-ALIGNMENT-V1.md) (브랜드·SEO 정렬, CLOSED) · Legacy Partner 은퇴 정본 [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §7
> **정책**: `CURRENT PARTNER = RETIRED` · `FUTURE PARTNER = GREENFIELD` — 「파트너」 문자열 일괄 삭제가 아니라 **의미 기준 분류** 후 은퇴한 Legacy Partner 역할을 현행처럼 서술하는 것만 정정

---

## 1. 목적

Legacy Partner runtime(2026-09-15) · 물리 스키마(2026-09-16) 은퇴 후에도 **현행 사용자 화면** 과 **active 기준문서** 에 남아 있던 "지금 운영 중인 파트너 역할/기능" 처럼 읽히는 표현을 정리한다. 일반어(사업 파트너 · 도매/파트너용) · 타 도메인(Extension partner · `foreign_visitor_partners`) · historical(WO/CHECK/IR/archive · 은퇴 사실을 적은 주석) · 향후 SNS/인플루언서 Partner(GREENFIELD) 는 보존한다.

## 2. Fresh Census (origin/main `7b11a9a2e`)

검색: `services/web-neture/src/**` 의 `파트너|partner|Partner` + 우선 확인 대상 active docs 2건 + 기준문서 전역(`docs/baseline|architecture|platform|rules|guides`).

### 2-1. 분류 결과 요약

| 분류 | 건수(파일 기준) | 처분 |
|---|---|---|
| `LEGACY_PARTNER_ROLE` (현행처럼 읽힘) | 소스 17 · active doc 2 | **정정** (§3) |
| `GENERIC_BUSINESS_TERM` | 7 | 보존 |
| `OTHER_ACTIVE_DOMAIN` | 4 | 보존 |
| `FUTURE_PARTNER` | 0 (현행 UI/문서에 GREENFIELD 설명 없음) | 해당 없음 — 신규 서술 추가 금지 |
| `HISTORICAL_ONLY` | 주석 18+ · WO/CHECK/IR/archive 다수 | 보존 |

### 2-2. LEGACY_PARTNER_ROLE — 소스 (전부 정정)

| 파일 | 원문(요지) | 정정 |
|---|---|---|
| `pages/guide/GuideHomePage.tsx` | 히어로 「공급자/판매자/파트너 참여까지」 · flowLabels `'파트너'` · 기능 설명 「파트너 프로그램 가이드는 「파트너 안내」에」 · 헤더 주석 `07. 파트너 안내` | 「공급자/판매자 참여까지」 · flowLabels 에서 제거 · 「공급자 시작 가이드는 「공급자 참여 안내」에」 · 주석에 은퇴 명기 |
| `pages/CommunityPage.tsx` | usageItems 「공급자, 유통참여형 펀딩, 파트너 협력 방식」 + 주석 2 | 「…, 매장 참여 방식」 · 주석 정정 |
| `pages/SupplierLandingPage.tsx` | 카드 「파트너 마케팅 / 파트너 네트워크를 통해…」 · 히어로 「매장과 파트너를 통해 판매를 확장」 | 카드 「매장 홍보 지원 / 매장 HUB 콘텐츠와 QR 안내로…」 · 「매장을 통해 판매를 확장」 |
| `pages/resources/NetureResourcesPage.tsx` | heroDesc 「공급자·파트너를 위한…」 | 「공급자·매장을 위한 공유 자료 모음입니다.」 |
| `pages/operator/OperatorContactMessagesPage.tsx` | typeLabels `partner: '파트너'` · 필터 「파트너」 · 설명/버튼/주석 「공급자·파트너 문의」 | `'파트너 (접수 종료)'` · 「파트너 (접수 종료 · 과거 문의)」 · 「과거 접수된 파트너 문의 포함」 · 버튼 「공급자 신규 문의 일괄 확인」 |
| `pages/admin/AdminContactMessagesPage.tsx` | `partner: 'Partner'` · 필터 「Partner」 | `'Partner (접수 종료)'` · 「Partner (접수 종료 · 과거 문의)」 |
| `pages/admin/AdminServiceApprovalPage.tsx` | h1 「파트너/서비스 승인 관리」 | 「서비스 승인 관리」 |
| `pages/admin/ai/AiAdminDashboardPage.tsx` | 「파트너 설명용」 | 「공급자 · 영업 설명용」 |
| `pages/supplier/SupplierProfilePage.tsx` | 안내 박스 「**파트너만** — 취급 승인을 받은 판매자에게만」 (select 라벨은 이미 「승인 거래처만」 — 불일치) | 「**승인 거래처만** — 공급 승인된 매장(거래처)에게만 표시됩니다.」 (enum 값 `'partners'` 는 물리 값 — 불변) |
| `pages/supplier/SupplierSupplyOffersPage.tsx` | 「판매자(파트너)를 모집하고」 | 「판매자(매장)를 모집하고」 |
| `services/forumApi.ts` | mock 「공급자 또는 파트너 입장에서」 | 「공급자 또는 매장 입장에서」 |
| 주석 전용 6 | `AiBusinessPackPage` · `EditUserModal` · `UsersManagementPage` · `ServiceUsageGate` · `lib/home-entry.ts` · `AdminDashboardPage` | 「파트너」 열거 제거 또는 은퇴 사실 명기 |

### 2-3. LEGACY_PARTNER_ROLE — active docs (WO 명시 승인 2건, 정정)

| 문서 | 위치 | 원문 | 정정 |
|---|---|---|---|
| `docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md` | §8.3 표 neture 행 | 「공급자 협업 플랫폼 (O4O 대표 진입)」 | 「O4O 통합 업무 공간 (O4O 대표 진입 · Legacy Partner 은퇴 후 「공급자·파트너 협업 플랫폼」 폐기)」 — 구현 `NETURE_HEADER_BRAND.subtitle` 과 일치 |
| 〃 | Phase 4 목록 | 「Supplier/Partner Space의 GlobalHeader 연결」 | 「Supplier Space의 GlobalHeader 연결 (Partner Space 는 2026-09-15 Legacy Partner 은퇴로 소멸)」 |
| 〃 | 헤더 `최종 갱신` · §8.3 도입문 | 2026-08-21 | 2026-09-17 본 WO 추가 · neture 는 `NETURE_HEADER_BRAND` 명기 |
| `docs/architecture/O4O-COMMONIZATION-STANDARD.md` | §1.1 구조도 | 「공급자·파트너 중심 업무」 | 「공급자 중심 업무 (Supplier Workspace) + O4O 대표 진입 홈」 |
| 〃 | §3.0 표 Neture 행 | 「**공급자·파트너 중심 독립 서비스**」 | 「**공급자 중심 독립 서비스**(O4O 공급자 서비스 + O4O 대표 진입 홈)」 |
| 〃 | §3.1 예외 사유 | 「Neture는 공급자/파트너 협업 공간이 1차 도메인」 | 「공급자 업무 공간(Supplier Workspace)과 O4O 대표 진입 홈이 1차 도메인 … (과거 정의는 은퇴로 폐기 — ROLE-WORKSPACE-ARCHITECTURE §7)」 |
| 〃 | §3.1 `/store` 행 · 주의 문단 | 「공급자/파트너 운영 화면」 · 「공급자·파트너 중심의 독립 서비스」 | 「공급자 운영 화면」 · 「공급자 중심의 독립 서비스」 |
| 〃 | 헤더 `개정` · Changelog | — | V3.2 (2026-09-17) 행 추가 — Neture 독립 경계 · 부분 채택 판정 · Hub 매트릭스 **변경 없음** 명기 |

**§16-4 예외 근거**: CLAUDE.md §16-4 는 기준문서의 내용 변경을 인라인 금지하고 별도 WO 로 돌리도록 정한다. 본 WO 는 사용자가 위 2 문서를 **명시적으로 수정 범위에 포함**했으므로(지시문: "위 active docs 2건은 기준문서 내용 정정이지만 이번 WO가 명시적으로 수정 범위를 승인한다") 「§16-4 예외 — 명시적 WO 에 의한 기준문서 내용 정정」 으로 처리한다. 정정은 Legacy Partner 은퇴(ROLE-WORKSPACE-ARCHITECTURE §7, 2026-09-15 확정) 라는 **이미 확정된 상위 판정을 하위 문서에 반영**한 것이며, 두 문서의 판정·경계·매트릭스는 바꾸지 않았다. 그 외 기준문서(§5)는 §16-2 대로 보고만 한다.

### 2-4. 보존 — GENERIC_BUSINESS_TERM

| 파일:행 | 표현 | 판단 |
|---|---|---|
| `components/supplier/B2BContentDrawer.tsx:134,143` · `pages/supplier/SupplierB2BContentPage.tsx:86` | 「도매/파트너용 상품 설명」 | B2B 거래처 일반어 |
| `pages/SellerQRGuidePage.tsx:60` | 「직원용, 파트너 방문 시」 | 매장 방문 거래처 일반어 |
| `pages/forum/ForumRequestPage.tsx:49` · `pages/supplier/RequestCategoryPage.tsx:45` | 태그 placeholder 「파트너협업」 | 협업 일반어 예시 |
| `pages/ContactPage.tsx:325` | `partners@neture.co.kr` | 메일 주소(운영 자산) — 코드에서 변경 불가 |
| `pages/admin-vault/VaultInquiriesPage.tsx` | 「제휴/파트너십 문의」 유형 | 제휴 일반어 |
| `pages/admin/HomepageCmsPage.tsx` | `'partner-logo'` 협력사 로고 슬롯 | 협력사 일반어(주석에 Legacy 아님 명기됨) |

### 2-5. 보존 — OTHER_ACTIVE_DOMAIN

`foreign_visitor_partners`(외국인 관광객 QR 도메인) · `lib/api/admin.ts:735` `contactType 'partner'` 타입(과거 접수 메시지 조회용 backend 계약 — 삭제 시 과거 데이터 표시 불가) · `ContactVisibility 'partners'` enum(물리 값) · Extension partner 개념(shared 패키지) — 모두 불변.

### 2-6. 보존 — HISTORICAL_ONLY

은퇴 사실을 적은 주석(`App.tsx:964` · `RegisterModal:26` · `LatestUpdatesSection:7` · `navigation.ts:38` · `operatorMenuGroups.ts:50` · `contact.ts:10` · `role-constants.ts:29` · `QrLandingPage:13` · `HubPage:11` · `ForumHubPage:146` · `SupplierRecruitmentDetailPage:243` · `dashboard.ts:56` · `admin.ts:614/760` 등) · WO/CHECK/IR/archive · `GLOBAL-HEADER-STANDARD-V1.md:386` 과거 문제 표(Supplier/Partner 등 — "해소" 컬럼이 있는 이력 표) — 불변.

### 2-7. FUTURE_PARTNER

현행 UI/active docs 에 SNS/인플루언서 Partner 설명 0건. 본 WO 는 GREENFIELD 설명을 **추가하지 않는다** (금지 항목: 새 Partner 기능/데이터모델/역할/호환계층).

## 3. 변경 요약

- 소스 17 파일(사용자 노출 문자열 11 · 주석 전용 6) · active docs 2 파일. **코드 로직 · route · API · 타입 · enum 값 · DB 변경 0.**
- `contactType 'partner'` 는 라벨만 「접수 종료」 로 표기 — 과거 접수 문의는 계속 조회·처리 가능.
- Seller 푸터 `© 2026 o4o Platform · Neture` (`pages/seller/MedicalOverviewPage.tsx:60` 외 2곳) 는 파트너 표현이 없어 미변경(우선 확인 대상이었으나 정정 사유 없음).

## 4. 검증

| 항목 | 결과 |
|---|---|
| `npx vitest run --config services/web-neture/vitest.config.mjs` | **92/92 PASS** (13 files · 브랜드 금지 문구 테스트 포함) |
| `npx tsc --noEmit -p tsconfig.json` (web-neture) | PASS |
| `pnpm --filter "@o4o/web-neture" build` | PASS (14.8s) |
| same-scope re-census (`grep -rn 파트너 services/web-neture/src`) | 잔여 = §2-4 일반어 · §2-6 historical 주석 · 「접수 종료」 표기 라벨뿐 — LEGACY_PARTNER_ROLE 0 |
| 배포 | Deploy Web Services `35173281042` success (deploy-neture) |
| 프로덕션 smoke — 비로그인 desktop 1280 | `/guide` 히어로 「공급자/판매자 참여까지」 · 흐름 「공급자 · 서비스 운영자 · 매장」 · `/community` usageItems 「매장 참여 방식」 · `/supplier` 카드 「매장 홍보 지원」+히어로 「매장을 통해 판매를 확장」 · `/resources` 「공급자·매장을 위한 공유 자료 모음」 · `/contact` — 코드 유래 「파트너」 **0** |
| 프로덕션 smoke — mobile 390 | `/guide` · `/supplier` 동일 문구 확인, 「파트너」 0 |
| 프로덕션 smoke — 로그인(KPA 체험 계정 → handoff → neture) | `/supplier/profile` → canonical `/mypage/business-profile` 안내 박스 「승인 거래처만 — 공급 승인된 매장(거래처)에게만 표시됩니다.」 · `/supplier/supply-offers` 「판매자(매장)를 모집하고」 · 두 화면 「파트너」 0 |
| operator/admin 문의 화면 · 서비스 승인 화면 | **미검증** — 체험 계정에 operator/admin 역할 없음(접근 권한 화면). 단위 테스트·빌드·소스 re-census 로만 확인 |

**smoke 관찰**: `/community` 공지사항 목록에 CMS 공지 「파트너십 신청 안내」(`/notices/3b09ff97-…`) 노출 — **코드가 아닌 운영 데이터(DB)**. 프로덕션 DB 는 read-only 경계이므로 본 WO 에서 미변경. 운영자 화면에서 공지 비공개/보관 처리 권고(§6).

## 5. 문서 정합 (§16)

| 문서 | 위치 | 내용 | 처분 |
|---|---|---|---|
| `GLOBAL-HEADER-STANDARD-V1.md` · `O4O-COMMONIZATION-STANDARD.md` | §2-3 | Legacy Partner 를 현행처럼 서술 | **정정** (§16-4 예외 — 명시적 WO 승인) |
| `docs/architecture/ui-ux/O4O-SHARED-SPACE-CROSS-SERVICE-ANALYSIS-V1.md` | L120,127,137,140,154,194 | 파트너 공간/역할 서술 | 보고만 — WO 범위 밖 |
| `docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md` | L227 「공급자·파트너(Neture)」 | Frozen F12 계열 baseline 본문 | 보고만 — §16-4 Frozen 본문 수정 금지 |
| `docs/platform/promotion/PROMOTION-SERVICE-SLOT-MATRIX-V1.md` | L63 「Supplier/Partner 진입」 | 슬롯 매트릭스 | 보고만 — WO 범위 밖 |

`문서 정합: 발견 5건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건` (범위 밖 3 문서 묶음 정정 WO — 선택).

## 6. 범위 밖 관찰 (미수정)

1. CMS 공지 「파트너십 신청 안내」 — 운영 데이터. 운영자가 공지 비공개 처리 권고(코드 변경 불요).
2. `partners@neture.co.kr` 연락 메일 — 운영 자산. 필요 시 메일 라우팅 차원에서 결정.
3. 범위 밖 active docs 3건(§5) — 별도 WO 후보(문서 전용, 코드 변경 0).
4. Seller 푸터 `© 2026 o4o Platform · Neture` — 파트너 표현 없음. 브랜드 표기 통일은 브랜드 WO 후속 판단 사항.

## 7. Git

- 구현: `38723ee1d` (19 files, path-specific stage · `check-staged-scope` 19/19) → push → Deploy `35173281042` success.
- CHECK: 본 문서(별도 docs 커밋).

## 8. 최종 판정

```
LEGACY_PARTNER_USER_FACING = 0
LEGACY_PARTNER_ACTIVE_DOC  = 0   (WO 승인 2건 정정 · 범위 밖 3건은 보고)
GENERIC_PARTNER_TERM       = PRESERVED
OTHER_DOMAIN_PARTNER       = PRESERVED
HISTORICAL_PARTNER         = PRESERVED
FUTURE_PARTNER             = GREENFIELD_ONLY  (현행 서술 0 · 신규 추가 0)
NEW_PARTNER_RUNTIME        = 0
NEXT = GO_HANDOFF_SESSION_PERSISTENCE_IR
```

구조 작업 없음. 다음은 `IR-O4O-CROSSSERVICE-HANDOFF-SESSION-PERSISTENCE-V1` 조사만(별도 지시 대기).
