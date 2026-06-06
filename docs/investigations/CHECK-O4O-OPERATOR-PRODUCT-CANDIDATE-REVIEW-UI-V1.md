# CHECK-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1

> Phase 5 — Operator Product Candidate Review UI 구현 검증 보고.
>
> WO: `WO-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1`
> Baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md)
> 선행: Phase 3 [`CHECK-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1`](CHECK-O4O-PRODUCT-CANDIDATE-REVIEW-QUEUE-V1.md), Phase 4 [`CHECK-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1`](CHECK-O4O-MOBILE-PRODUCT-DRAFT-TO-CANDIDATE-V1.md)
> 작성일: 2026-06-06
> 상태: 구현·정적검증 완료 (브라우저 라이브 smoke 후속)

---

## 1. Summary

Phase 3 Product Candidate Review Queue + Phase 4 Mobile Draft → Candidate 흐름을 운영자가 실제로 검토할 수 있는 **frontend UI** 를 web-neture 에 추가했다. 기존 backend API(`/api/v1/operator/product-candidates`)만 사용하며 **backend 변경은 없다.**

- 운영자 메뉴 `상품 운영 > 상품 후보 검토` + 라우트 `/operator/product-candidates` 추가
- 후보 목록(DataTable) + 상태/매칭/검색 필터 + 통계 카드
- 후보 상세 모달 + 액션: **재매칭 / 수동매칭(기존 Master 연결) / 반려 / 보관**
- 신규 ProductMaster 생성 UI 없음, 자동 승인 UI 없음, `approveAsNewProductMaster` 미호출

검증: web-neture `tsc --noEmit` **0 errors**.

---

## 2. Files Changed

| 파일 | 변경 | 성격 |
|---|---|---|
| `services/web-neture/src/lib/api/operatorProductCandidates.ts` | 신규 | API client + 로컬 타입 |
| `services/web-neture/src/pages/operator/ProductCandidateReviewPage.tsx` | 신규 | 목록+상세+액션 화면 |
| `services/web-neture/src/pages/operator/index.ts` | 수정 | barrel export 추가 |
| `services/web-neture/src/App.tsx` | 수정 | lazy import + `/operator/product-candidates` route (OperatorRoute 블록 내) |
| `services/web-neture/src/config/operatorMenuGroups.ts` | 수정 | UNIFIED_MENU `products` 그룹에 메뉴 항목 추가 |
| `docs/investigations/CHECK-O4O-OPERATOR-PRODUCT-CANDIDATE-REVIEW-UI-V1.md` | 신규 | 본 문서 |

> backend(api-server) · DB · migration · 엔티티 변경 **없음**.

---

## 3. Route / Menu

- **Route:** `/operator/product-candidates` — App.tsx 의 `<OperatorRoute><OperatorLayoutWrapper/></OperatorRoute>` 블록 내부에 등록(기존 operator 페이지와 동일 가드/레이아웃). lazy import via `pages/operator` barrel.
- **Menu:** `operatorMenuGroups.ts` 의 활성 `UNIFIED_MENU.products` 그룹에 `{ label: '상품 후보 검토', path: '/operator/product-candidates' }` 추가 (상품 관리 바로 뒤, adminOnly 아님 → operator 노출). deprecated `OPERATOR_MENU_ITEMS` 는 건드리지 않음.
- **경로 결정 근거:** Phase 3 backend 가 `/api/v1/operator/product-candidates` 로 마운트되어 있어 frontend 경로를 동일 네이밍으로 맞춤. 기존 Operator Product Console(`/operator/all-registered-products`, `/operator/product-approvals`)과 같은 products 그룹·동일 권한 모델.

---

## 4. API Client

`operatorProductCandidateApi` (`lib/api/operatorProductCandidates.ts`) — `api` (authClient axios, baseURL `/api/v1`) 사용:

| 함수 | endpoint |
|---|---|
| `list(filter)` | GET `/operator/product-candidates` (params: status/matchStatus/sourceType/serviceKey/organizationId/page/limit) → `{ items, total }` |
| `get(id)` | GET `/operator/product-candidates/:id` |
| `match(id)` | POST `/:id/match` |
| `manualMatch(id, productMasterId)` | POST `/:id/manual-match` |
| `reject(id, reason?)` | POST `/:id/reject` |
| `archive(id)` | POST `/:id/archive` |

타입(`ProductCandidate`, `ProductCandidateSourceType/Status/MatchStatus`, `ProductCandidateListFilter/ListResult`)은 backend 엔티티와 정렬하여 **로컬 선언**(@o4o/types 미정의). list 는 403 시 권한 에러 throw, 그 외 빈 결과 fallback.

---

## 5. List View

- 컬럼: 후보명(+id 단편) / 식별자(type:value) / 출처 / 서비스 / 상태 / 매칭 / 신뢰도 / 생성일 — `DataTable<ProductCandidate>` (rowKey=id, onRowClick→상세 모달).
- 필터: 상태 탭(전체/대기/검토중/매칭됨/반려/보관), 매칭 상태 select, 텍스트 검색(후보명/식별자 — **client-side**, backend text 검색 미지원이므로 로드된 100건 내 필터).
- 통계 카드: 전체/대기/매칭됨/충돌.
- 상태/매칭/출처 배지 매핑(varchar union → 한글 라벨).

---

## 6. Detail View

행 클릭 → 모달. 표시: 식별자(type/value/normalized) · 출처 · 서비스 · 조직 · 브랜드/제조사/카테고리/규격·단위/가격 · 신뢰도 · matched Master/Identifier id · 생성일 · 검토 메모 · 후보 이미지(있을 때). (자체 모달 — 별도 Drawer 컴포넌트 미생성, clean & simple.)

---

## 7. Actions

| 액션 | 동작 | 비고 |
|---|---|---|
| 재매칭 | `match(id)` | Identifier Core 자동 매칭 재시도. 자동 승격 아님(backend 가 matched 까지만) |
| 수동매칭 | `manualMatch(id, productMasterId)` | ProductMaster UUID 직접 입력 → 기존 Master 연결. 정밀 검색 UI 는 후속(WO §5 허용) |
| 반려 | `reject(id, reason?)` | 사유 입력 |
| 보관 | `archive(id)` | — |

금지 준수: 신규 ProductMaster 생성 UI 없음, 자동 승인 UI 없음, `approveAsNewProductMaster`(501) 미호출.

---

## 8. Permission / Boundary

- `/operator/product-candidates` 는 기존 `OperatorRoute` 가드(operator-or-above + neture membership) 하위 — 별도 가드 불필요.
- service scope 는 backend(`resolveOperatorScope`)가 응답을 필터링 → frontend 는 받은 결과만 표시.
- 권한 없음 처리는 기존 operator 화면과 동일(가드 리다이렉트 + list 403 throw).

---

## 9. What Was Not Changed

- ✅ ProductMaster 구조 변경 없음
- ✅ ProductIdentifier 구조 변경 없음
- ✅ ProductCandidate backend 구조 변경 없음 (API만 소비)
- ✅ MobileProductDraft 구조 변경 없음
- ✅ ProductMaster 자동 생성 없음 (생성 UI 없음, approveAsNewProductMaster 미호출)
- ✅ OTC/Rx 미구현
- ✅ 모바일 UI 미구현
- ✅ 공급자 상품 등록 흐름 변경 없음
- ✅ 약국/매장 상품 등록 화면 변경 없음
- ✅ backend/DB/migration 변경 없음 (frontend only + 문서)

---

## 10. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` | ✅ 0 errors (page·client·App·barrel·menu 포함 전체) |
| route compile / barrel export | ✅ |
| API client compile | ✅ |
| 메뉴 항목 추가 (활성 UNIFIED_MENU.products) | ✅ (deprecated 메뉴 미접촉) |
| 기존 operator 메뉴/route no-regression | ✅ (additive) |
| empty state / 상세 모달 / 액션 버튼 정적 렌더 | ✅ (코드 경로) |

> 정적(컴파일 + 코드 경로) 검증 기준. 실제 화면·동작(목록/상세/재매칭/수동매칭/반려/보관)은 배포 후 `/operator/product-candidates` 브라우저 smoke 로 확인한다. (참고: sohae2100 = platform:super_admin → scope 우회 가능, 빈 목록/렌더 확인 위주)

### 10.1 Live smoke (2026-06-06)

| 항목 | 결과 |
|---|---|
| CI 배포 (Deploy Web Services, Phase 5 커밋 `dbb624184`) | ✅ completed/success → neture-web 리비전 `00943` |
| 백엔드 API probe `GET /api/v1/operator/product-candidates` (무인증) | ✅ HTTP 401 `AUTH_REQUIRED` — 라우트 마운트 + requireAuth 가드 동작 확인 |
| 브라우저 UI smoke (메뉴/목록/필터/상세모달/액션 렌더) | ⏸ **BLOCKED** — Playwright 브라우저 프로필을 다른 세션이 점유 중(`mcp-chrome-...` lock). parallel-session hygiene 으로 강제 점유하지 않음. 브라우저 가용 시 재시도 필요 |

> 백엔드 의존성(엔드포인트·가드)·배포는 확인됨. 프론트 화면 렌더링 육안 확인만 브라우저 lock 으로 보류.

---

## 11. Follow-ups

| # | 항목 | 비고 |
|---|---|---|
| F1 | 브라우저 라이브 smoke | 배포 후 목록/필터/상세/4개 액션 동작 확인 |
| F2 | 수동매칭 ProductMaster 검색 UI | 현재 UUID 직접 입력 — 검색 picker 는 후속 WO |
| F3 | matched Master 요약 표시 | 현재 master id 만 표시 — 상세 요약(이름/바코드) 조인 표시는 후속 |
| F4 | candidate → Store/Pharmacy 활용 연결 | 다음 단계(WO 로드맵 2번) |
| F5 | cross-service 화면 확장 | 필요 시 glycopharm/k-cosmetics operator 에도 동형 추가(공통화는 parity 후) |

---

**작성:** O4O Platform Team · 2026-06-06
**상태:** Phase 5 구현·정적검증 완료 / 브라우저 smoke 후속. 다음: Candidate → Store/Pharmacy 활용 연결 → OTC extension.
