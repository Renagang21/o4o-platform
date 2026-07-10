# CHECK-O4O-ADMIN-PRODUCT-MASTER-CONSOLE-SIMPLIFICATION-V1

> **WO:** WO-O4O-ADMIN-PRODUCT-MASTER-CONSOLE-SIMPLIFICATION-V1
> **선행 IR:** IR-O4O-ADMIN-PRODUCT-MANAGEMENT-SIMPLE-OPERATIONS-AUDIT-V1 (commit `9a314f4b4`)
> **대상 서비스:** `admin.neture.co.kr`
> **대상 화면:** `/admin/o4o-product-db/masters`, `/admin/o4o-product-db/masters/:id`
> **작업일:** 2026-07-10
> **성격:** 프론트엔드 정리 전용. DB·migration·백엔드 API·mutation·프로덕션 데이터 변경 0건.

---

## 1. 작업 목적

관리자 기본상품 콘솔에서 **동작하지 않는 UI와 관리자 책임 범위 밖 요소를 제거**하여, 다음 상태 관리 기능(후속 WO)을 붙일 수 있는 단순한 콘솔로 정리한다. 새 기능 추가 없음.

재확정된 관리자 책임:
> 관리자는 O4O 표준 상품 정보와 O4O 상품 DB에서의 이용 가능 여부만 단순하게 관리한다. 참여자가 상품을 어디에서 어떻게 활용하는지는 조사·통제하지 않는다.

---

## 2. 제거한 UI와 코드

### 목록 — `ProductMastersPage.tsx`
- **행 체크박스**: `_select` 시스템 컬럼(각 행 `<input type=checkbox>`) 제거.
- **선택 상태 dead code**: `selectedKeys` state, `toggleSelect` 핸들러, 검색/초기화/페이지크기 변경 시 `setSelectedKeys(new Set())` 호출 4곳 제거.
- **BaseTable 선택 props**: `selectable`, `selectedKeys`, `onSelectionChange` 제거 → 헤더 전체선택 체크박스도 함께 사라짐(BaseTable 은 `_select` 컬럼 + `selectable` 동시 존재 시에만 헤더 체크박스 렌더).
- **빈 ActionBar**: `selectedKeys.size > 0` 조건부 블록 전체 + `ActionBar` import + "선택 항목에 대한 일괄 작업은 후속 WO에서 제공됩니다." 문구 제거.
- **비활성 QR 메뉴**: RowActionMenu 의 `{ key: 'qr', label: 'QR 연결 (후속 WO)', disabled: true }` 항목 제거. 상세 보기(`view`)만 유지.
- 헤더 주석의 컬럼 목록·패턴 설명을 실제와 일치하도록 갱신.

### 상세 — `ProductMasterDetailPage.tsx`
- **사용 상태 / 활용 연결 PanelSection 전체 제거**: UsageCard 3종(조직 상품 연결 수 / 매장 취급 연결 수 / 자료함 콘텐츠 연결 수), UsageList 3종(조직 상품 연결 / 매장 취급 / 자료함 콘텐츠), 조회 전용 안내 문구.
- **usage-links 프론트 호출 제거**: `getProductUsageLinks(id)` 호출 + `usage` state + `getProductUsageLinks`·`ProductUsageLinks` import 제거.
- **연결 수 집계 제거**: `row.usageSummary` 참조 전부 제거(사용 상태 섹션과 함께).
- **QR placeholder 제거**: 설명 후보 패널의 정적 pill `QR 연결 · 후속 WO` 및 하단 "QR 연결은 후속 WO 범위입니다." 문구 제거.
- **dead code 제거**: 렌더 미참조 `FollowupNote` 컴포넌트 제거. 사용 상태 섹션 제거로 미사용이 된 헬퍼 `UsageCard` / `UsageList` / `UsageRow` / `statusLabel` / `workspaceLabel` 제거.
- 헤더 주석을 상품 정보·운영 기록 중심으로 갱신.

---

## 3. 유지한 기능

### 목록
검색 · 검색 초기화 · 페이지당 건수(20/50/100) · 총 상품 수 · 새 상품 등록 · 이미지 상태 배지 · 설명서 KO/ZH 배지 · 행 클릭 상세 이동 · `상세 보기` 행 메뉴 · 페이지 캐시/prefetch · URL query 동기화 · 컬럼 표시 설정.

### 상세
기본 정보 · 규제 정보 · 식별자 · 이미지(추가/대표/숨김/복원) · 공식 소비자 설명 · 설명 후보(KO/ZH 상태) · 후보·원천 연결 · **관리 메모(조회/작성/숨김)** · **작업 이력(read-only 타임라인 + 미기록 영역 disclosure)** · **실제 동작하는 ProductQrSection**(`/p/{key}` 랜딩 QR, 별개 기능이라 유지).

---

## 4. 실제 변경 파일

```text
apps/admin-dashboard/src/pages/o4o-product-db/ProductMastersPage.tsx      (54 lines 변경, -41 net)
apps/admin-dashboard/src/pages/o4o-product-db/ProductMasterDetailPage.tsx (122 lines 변경, -109 net)
docs/checks/CHECK-O4O-ADMIN-PRODUCT-MASTER-CONSOLE-SIMPLIFICATION-V1.md    (신규)
```
- 예상 범위(프론트 2개 파일) 내. 별도 component 파일 추가 변경 없음.
- 제거된 헬퍼(`UsageCard` 등)는 모두 두 대상 파일 내부에 있던 **파일-로컬 함수**로, 다른 파일에서 import 하지 않아 추가 파일 변경 불필요.

---

## 5. 세부 확인

| 항목 | 결과 |
|------|------|
| usage-links 프론트 호출 제거 | ✔ (`getProductUsageLinks` import·호출·state 모두 제거, grep 잔여 0) |
| ProductQrSection 유지 | ✔ (상세 `{id && <ProductQrSection masterId={id} />}` 및 컴포넌트 정의 그대로) |
| 관리 메모 회귀 | 없음 (list/add/delete API·핸들러·UI 무변경) |
| 작업 이력 회귀 | 없음 (audit-log API·타임라인·gaps disclosure 무변경) |
| 백엔드 usage-links endpoint | 유지(삭제 안 함) — 프론트 배선만 제거 |

---

## 6. 검증 결과

| 검증 | 명령 | 결과 |
|------|------|------|
| typecheck | `pnpm --dir apps/admin-dashboard type-check` | **PASS** (에러 0) |
| build | `pnpm --dir apps/admin-dashboard build:prod` | **PASS** (✓ built in 1m 6s) |
| whitespace | `git diff --check` | **PASS** |
| 잔여 참조 grep | `selectedKeys/toggleSelect/ActionBar/usage/UsageCard/FollowupNote/statusLabel/workspaceLabel` | 코드 참조 0 (주석 1건만) |

### smoke (실브라우저)
- 대상 화면은 로그인·배포 게이트 화면(`admin.neture.co.kr`)이며, 이번 변경은 순수 프론트 UI 제거로 typecheck·build 로 정합성이 확인됨.
- **실브라우저 smoke 는 배포(push→CI) 후 별도 수행 필요** — 확인 항목:
  - 목록: 진입/검색/페이지 이동/페이지 크기/행 클릭 상세 이동/상세 보기 메뉴/새 상품 등록 정상, **체크박스·ActionBar·비활성 QR 메뉴 미표시**.
  - 상세: 기본정보/이미지/설명/관리 메모(작성 포함)/작업 이력/ProductQrSection 정상, **사용 상태·활용 연결·QR placeholder 미표시**, console error 0, usage-links API 미호출.

---

## 7. 변경 0 확인

- 코드 변경: 프론트 2개 파일(+CHECK 문서)로 한정.
- DB 변경: **0**
- migration: **0**
- 백엔드 API 변경: **0** (usage-links·note·audit-log·landing QR endpoint 모두 무변경, 프론트 호출만 제거)
- API mutation 추가: **0**
- 프로덕션 데이터 변경: **0**
- 타 세션 WIP(`pnpm-lock.yaml`) 미포함 — path-specific 커밋.

---

## 8. 다음 작업

- **2순위** `WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-FOUNDATION-V1`: `product_masters.status`(ACTIVE/SUSPENDED/ARCHIVED) 컬럼 + migration + 생성 기본값 + 최소 상태 변경 기록.
- **3순위** `WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1`: 단건 보관/이용 중단/정상 복원 + 관리자 상태 배지·필터 + 참여자 검색 ACTIVE-only(`searchProductMasters` `statuses`).
- 배포 후 실브라우저 smoke 수행(§6).
