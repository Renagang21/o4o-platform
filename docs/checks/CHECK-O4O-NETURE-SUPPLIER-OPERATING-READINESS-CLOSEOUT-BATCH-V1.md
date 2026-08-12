# CHECK-O4O-NETURE-SUPPLIER-OPERATING-READINESS-CLOSEOUT-BATCH-V1

**WO**: WO-O4O-NETURE-SUPPLIER-OPERATING-READINESS-CLOSEOUT-BATCH-V1
**작업일**: 2026-08-12
**범위**: Neture 공급자 영역 운영 마감 점검 (공급자 화면 전체)
**판정**: PASS_WITH_REPORTED (수정 7건 · HOLD 0건 · 보고 3건)

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `ea1f501e6` |
| 브랜치 | `main` |
| 작업트리 | WO 범위 경로 clean. 다른 세션의 미추적 문서 1건(`docs/ir/IR-O4O-PHARMACIST-BRANCH-SERVICE-RECOVERY-AND-REUSE-AUDIT-V1.md`)은 **접촉하지 않음** |

---

## 2. 공급자 route 전체 조사표 (§8 smoke 대상)

정본: `services/web-neture/src/App.tsx` (단일 route 파일) · 사이드바 SSOT: `components/layouts/SupplierSpaceLayout.tsx`

| # | Route | 화면 | route 실재 | 사이드바 진입점 | 결과 |
|---|---|---|:---:|:---:|:---:|
| 1 | `/supplier/dashboard` | SupplierDashboardPage | O | O | PASS |
| 2 | `/supplier/products` | SupplierProductsPage | O | O | PASS |
| 3 | `/supplier/products/new` | 상품 등록 | O | O (`/products/register`) | PASS |
| 4 | `/supplier/products/bulk` | 대량 등록 | O | O | PASS |
| 5 | `/supplier/products/import-assistant` | 등록 도우미 | O | O | PASS |
| 6 | `/supplier/store-descriptions` | SupplierStoreDescriptionsPage | O | O | PASS |
| 7 | `/supplier/store-materials-status` | SupplierStoreMaterialsStatusPage | O | O | PASS (대시보드 진입점 추가) |
| 8 | `/supplier/tablet-screen-sets` | SupplierTabletScreenSetsPage | O | O | PASS |
| 9 | `/supplier/signage` | SupplierSignagePage | O | O | PASS |
| 10 | `/supplier/recruitments` | SupplierRecruitmentsPage | O | O | PASS (마감·재개 무음 결함 수정) |
| — | `/supplier/b2b-content` | SupplierB2BContentPage | O | O | PASS (h1 어휘 정렬) |
| — | `/supplier/library` | SupplierLibraryPage | O | **X** | 보고 (§8 참조) |

**legacy redirect (정상 동작 · dead link 아님)**
- `/supplier/csv-import` → `/supplier/products/bulk`
- `/supplier/profile` → `/mypage/business-profile`
- `/account/supplier/*` 6건 → `/supplier/*`
- `/workspace/supplier/*` catch-all → `/supplier/*`

**데드링크**: 공급자 화면 내부 링크 전수 대조 결과 App.tsx route 와 불일치 **0건**.

---

## 3. 수정한 링크 · CTA · 상태 문구

| # | 파일 | 유형 | 변경 |
|---|---|---|---|
| A | `SupplierRecruitmentsPage.tsx` | **기능 결함** | 모집 **마감·재개 실패 무음** 제거. `close()`/`reopen()` 은 throw 하지 않고 `{success:false}` 를 돌려주는데 결과를 버리고 `load()` 만 했다 → `actionError` 상태 + 상단 오류 배너 추가. 상세 화면(`SupplierRecruitmentDetailPage`)의 기존 처리 방식과 동일하게 정렬 |
| B | `SupplierDashboardPage.tsx` | **링크 누락** | 매장용 콘텐츠 Quick Link 에 `검수·게시 현황`(`/supplier/store-materials-status`) 추가 |
| C | `SupplierDashboardPage.tsx` | 용어 통일 | `매장용 설명서` → `매장용 상품 설명서`, `태블릿` → `태블릿 화면 자료` (사이드바 canonical 라벨과 일치) |
| D | `SupplierTabletScreenSetsPage.tsx` | 용어 통일 | h1 `매장용 태블릿 콘텐츠` → `태블릿 화면 자료` |
| E | `SupplierB2BContentPage.tsx` | 용어 통일 | h1 `B2B 콘텐츠 관리` → `제품 콘텐츠` (사이드바 개명 반영 누락분) |
| F | `ProductDetailDrawer.tsx` | **부정확 문구** | `전용 공급 방식 관리 화면은 준비 중입니다.` → 실재하는 공급 오퍼 화면 안내로 전환 |
| G | `SupplierLibraryPage.tsx` | **부정확 문구** | `파일 업로드 기능은 추후 제공됩니다.` → 현재 동작(게시된 파일 URL 입력) 그대로 안내 |

수정 후 공급자 범위 전수 재검색: `준비 중 / 추후 / 곧 제공 / 후속 단계 / coming soon` **0건**
(단, `SupplierOrdersPage` 의 주문 상태 라벨 `준비중`(preparing) 은 실제 주문 상태값이며 대상 아님)

---

## 4. 상품 · 설명서 · 태블릿 · 사이니지 상태 정합

| 축 | 상태 | 판정 |
|---|---|:---:|
| 상품 등록·수정·삭제 후 상태 | 직전 배치(`...PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1`, `...DELETE-POLICY-AND-REVIEW-ROUNDTRIP-BATCH-V1`)에서 마감. 재확인 결과 회귀 없음 | PASS |
| 매장용 상품 설명서 상태 | `draftsByMasterLang` (masterId → Map<lang, draft>) · rank `revision_requested > canonical > needs_review > draft` | PASS |
| 검수 요청 / 수정 요청 / 재요청 | 상태 전이 표시 및 사유 노출 정상 | PASS |
| 태블릿 화면 자료 | 로드 오류·액션 오류 모두 하드닝 완료. publish 실패 코드별 문구 분기(`MEDICATION_PHARMACY_ONLY` / `HUB_TARGET_REQUIRED` / `EMPTY_SCREEN_SET` / `SCREEN_SET_NAME_REQUIRED`) | PASS |
| 디지털 사이니지 | `loadError` / `productsError` 분리 + 액션 try/catch | PASS |
| 모집·거래 화면 | 목록 조회는 load-error 계약 준수. **액션 실패 무음**은 본 배치에서 수정(§3 A) | FIXED |

용어 충돌: 위 §3 C·D·E 로 해소. 잔여 충돌 0건.

---

## 5. store-materials-status 결과

`SupplierStoreMaterialsStatusPage.tsx` — **수정 없음 (이미 기준 충족)**

- 4개 소스를 `Promise.allSettled` 로 개별 수집, 실패한 소스명을 배너에 명시하고 부분 실패 / 전체 실패를 분기
- 설명서 행 제목에 언어 칩(`· KO`) 표기
- 게시 대상이 없는 자료는 `—` (태블릿 화면 자료에만 대상 축 존재 — 확정 정책)
- 요약 4카드: 수정 요청 / 검수 대기 / 매장 노출·게시 중 / 작성 중·임시저장

상태 문구 명확성 기준 충족.

---

## 6. 언어별 STORE 설명서 상태 표기

- SPD 언어축 ko/en/zh/ja 는 각 언어가 **독립 작업행**이며 canonical 유일성은 `(master, type, COALESCE(language,'ko'))` 단위
- `/supplier/store-descriptions` 는 `(masterId, language)` 단위로 상태를 집계·표시
- `/supplier/store-materials-status` 는 행 제목에 언어를 병기

→ 언어별 상태가 하나로 뭉개지는 문제 **없음**. 수정 불필요.

---

## 7. QR · 태블릿 직접 적용 UI 부재 확인

| 확인 | 결과 |
|---|:---:|
| 공급자 화면에 QR 발행 UI | **없음** |
| 공급자 화면에 태블릿 코너 배치·적용 UI | **없음** |
| 공급자 화면에 매장 지정 배포 UI | **없음** |
| 백엔드 차단 | `supplier-screen-set.controller.ts` 에서 공급자 origin 의 매장 직접 적용 차단 유지 |
| 매장 반입 모델 | 매장이 HUB 에서 가져갈 때 **매장 소유 독립 사본** 생성 (태블릿 화면 자료 화면 안내 문구에 명시) |

→ 매장 경영자의 선택·적용 권한 침범 **0건**.

---

## 8. HOLD / 보고 항목

**HOLD: 0건** (§7 HOLD 조건 해당 없음)

**보고(수정하지 않음): 3건**

| # | 내용 | 판단 |
|---|---|---|
| R1 | `/supplier/library`(공급자 자료실) — route · 화면 · 백엔드(`/api/v1/neture/library/*`, requireLinkedSupplier / requireActiveSupplier 가드) 모두 살아 있으나 사이드바·타 화면 진입점 **0건** | `CHECK-O4O-NETURE-SUPPLIER-DASHBOARD-OPS-STATUS-V1` 이 대시보드 Quick Link 의 `/supplier/library` 를 **legacy 경로로 판정하고 제거**한 선행 기록이 있다. 반면 `IR-O4O-STORE-MATERIALS-AND-PRODUCTIONS-STATE-AUDIT-V1` 은 active 로 기록한다. **판정이 엇갈리므로 임의로 사이드바에 되살리지 않고 보고만 한다.** 이 화면의 공개 범위 `서비스 공개` 는 매장 운영자에게 노출되는 **4번째 매장 도달 경로**가 될 수 있어, 은퇴/부활 결정은 매장 제공 자료 3종 정책과 함께 별도 WO 로 판단해야 한다 |
| R2 | `SupplierProductsPage.tsx:1036` `if (!meta?.ready \|\| !meta.path) return; // 준비 중 → no-op` — `SUPPLIER_OFFER_ACTION_META` 4개 액션이 모두 `ready: true` 가 되어 도달 불가 분기 | 사용자 영향 0. 방어 코드로 무해하여 제거하지 않음 |
| R3 | `SupplierSupplyOffersPage.tsx` 파일 헤더 주석의 "전용 오퍼 모드 선택 화면은 후속: WO-…-OFFER-MODE-SELECTION-V1" — 이미 구현된 후속을 가리키는 stale 주석 | 화면 문구 아님(주석). 사용자 영향 0 |

---

## 9. Smoke 결과

**정적 검증으로 대체한 항목 명시** — 본 배치의 변경은 링크·라벨·오류 배너로 한정되고, `tsc --noEmit` 및 프로덕션 빌드가 전량 통과했다.

| 항목 | 방법 | 결과 |
|---|---|:---:|
| §8 route 10종 실재 | App.tsx 전수 대조 | PASS (blank route 0) |
| 공급자 화면 내부 링크 ↔ route 정합 | 전수 grep 대조 | PASS (데드링크 0) |
| 프런트 API 경로 ↔ 백엔드 마운트 정합 | `lib/api/supplier*.ts` 경로 추출 후 `apps/api-server` 라우터 대조 | PASS (미마운트 0 → API 404 0) |
| legacy · dead CTA | 전수 검색 | 0건 (redirect 4종은 정상 계약) |
| 준비중·추후 문구 | 전수 검색 | 0건 (주문 상태 라벨 제외) |
| QR · 태블릿 직접 적용 UI | 전수 검색 | 0건 |
| 타입 검증 | `tsc --noEmit` | PASS (오류 0) |

---

## 10. build · deploy 결과

| 항목 | 결과 |
|---|---|
| `web-neture` typecheck | `npx tsc --noEmit` — **오류 0** |
| `web-neture` build | `pnpm build` (`tsc && vite build`) — **✓ built in 16.38s** |
| api-server | **변경 없음** → typecheck·test·배포 모두 미실행 (§9 조건) |
| 배포 대상 | `web-neture` 단일. 변경 서비스만 배포 (CI `detect-changes` 경유) |

> `web-neture` 에는 별도 `typecheck` script 가 없다. 위와 같이 `tsc --noEmit` 직접 실행 + `build` 를 타입 검증 기준으로 사용했다.

---

## 11. commit SHA

`(커밋 후 기재)`

---

## 12. push 결과

`(push 후 기재)`

---

## 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
→ `/supplier/library` 에 대해 `CHECK-…-DASHBOARD-OPS-STATUS-V1`(legacy 판정)과 `IR-…-STORE-MATERIALS-AND-PRODUCTIONS-STATE-AUDIT-V1`(active 기록)이 엇갈린다. 둘 다 기록물(`docs/checks/`·`docs/archive/`)이므로 §16-1 에 따라 손대지 않고 별도 WO 로 제안한다.
