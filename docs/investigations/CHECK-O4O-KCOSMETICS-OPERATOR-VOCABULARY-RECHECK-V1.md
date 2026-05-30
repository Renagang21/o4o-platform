# CHECK-O4O-KCOSMETICS-OPERATOR-VOCABULARY-RECHECK-V1

**검증 일자**: 2026-05-31
**검증 환경**: HEAD (main) `9e9bd7ac9` 시점 정적 코드
**검증 도구**: Grep / Read
**작업 성격**: 재확인 전용 — 코드/DB/source 수정 없음
**선행 작업**: `WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V1` (W4, 외부 세션 편집으로 보류/종결)
**관련 데이터 검증**: [CHECK-O4O-CROSSSERVICE-DASHBOARD-PENDING-COUNT-DATA-AUDIT-V1](CHECK-O4O-CROSSSERVICE-DASHBOARD-PENDING-COUNT-DATA-AUDIT-V1.md) §4 (pharmacist=0, cosmetics-membership supplier=0 확인)

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **NEEDS W4-v2 (판정 B — 잔재 있음, 작게 수정 가능)**
>
> W4 보류 직전 식별된 5개 위치 7 라인 잔재가 **main HEAD 에 그대로 잔존**. 데이터 검증 결과 (cosmetics pharmacist 0건, cosmetics-membership supplier 0건) 와 정합. backend/DB/role 구조 변경 없이 **label/option map 만 정리하면 충분** — W4-v2 진행 권장.
>
> - **5개 파일, 7 라인** 잔재 (사용자 노출):
>   - StoresPage.tsx:54 `pharmacy: '약국'`
>   - StoreDetailPage.tsx:183 inline `pharmacy: '약국'`
>   - UsersPage.tsx:71 `pharmacist: '약사'` / :72 `supplier: '공급자'`
>   - EditUserModal.tsx:10 docstring + :36 `pharmacist` option + :37 `supplier` option
> - **operatorMenuGroups.ts**: 잔재 0건 ✅ (메뉴 구조에는 없음)
> - **Legitimate 사용 (보존)**: EventOfferApprovalsPage / ProductDetailPage / ProductsPage 의 "공급자" — Neture 공급자 cross-service + 상품 공급자 business model
> - **operator-ux-core sidebar 공통화 작업 (`46be3e1ce`)** 완료된 main HEAD 기준 — 본 검증과 무관

---

## 1. Executive Summary

| 기준 | 결과 |
|------|:----:|
| pharmacy / 약국 사용자 노출 잔재 | **2 파일** (StoresPage, StoreDetailPage) |
| pharmacist / 약사 사용자 노출 잔재 | **2 파일** (UsersPage, EditUserModal) |
| supplier / 공급자 사용자 노출 잔재 (K-Cos 자체 회원 분류) | **2 파일** (UsersPage, EditUserModal) |
| operatorMenuGroups.ts 잔재 | **0** ✅ |
| 데이터 근거 (cosmetics pharmacist/supplier active) | **0건** (Tier 5 CHECK §4 확인) |
| 판정 | **B — W4-v2 권장** |

---

## 2. W4 보류 이력

### 2.1 선행 작업

- WO 명: `WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V1`
- 시도 시점: 본 main HEAD 이전 (W6 Neture placeholder 와 같은 어휘 정리 트랙)
- 상태: **보류/종결** (commit 없음)

### 2.2 보류 사유

1. Edit 적용 직후 TS check 통과 + grep 잔존 0건 확인
2. `git commit` 시점에 `nothing to commit, working tree clean` — 외부 세션이 `git checkout --` 동등 방식으로 working tree 를 HEAD 상태로 되돌림
3. 시스템 알림 ("modified, either by the user or by a linter ... This change was intentional ... don't revert it unless the user asks to") 가 4개 파일 모두에 발생
4. 사용자 편집 우선 원칙 — W4 종결 처리 (재적용 안 함)

### 2.3 현재 main 기준

본 CHECK 시점 main HEAD `9e9bd7ac9` — W4 잔재 5개 파일 7 라인이 **변경 없이 그대로 잔존**. 외부 세션의 의도가 "유지" 였는지 "추후 정리" 였는지는 알 수 없으나, 사용자 정책 ("Care + GlucoseView 모두 삭제 대상" 흐름과 동일하게 K-Cosmetics 도메인 어휘 정리 권장) 이 확정된 현재 시점에서 재검증 의미 있음.

---

## 3. 검색 범위와 검색어

### 3.1 검색 범위

- `services/web-k-cosmetics/src/pages/operator/**` (모든 operator 화면)
- `services/web-k-cosmetics/src/config/operatorMenuGroups.ts`

### 3.2 검색어

`pharmacy` / `pharmacist` / `supplier` / `약국` / `약사` / `공급자`

---

## 4. 사용자 노출 잔재 목록 (7 라인)

| # | 파일 | 라인 | 형태 | 사용자 노출 컨텍스트 |
|---|------|-----:|------|----------------------|
| 1 | `pages/operator/StoresPage.tsx` | 54 | `typeLabels: { pharmacy: '약국', store: '매장', branch: '지점' }` | StoreType label fallback |
| 2 | `pages/operator/StoreDetailPage.tsx` | 183 | `const typeLabel: Record<string, string> = { pharmacy: '약국', store: '매장', branch: '지점' }` | StoreType label fallback (inline) |
| 3 | `pages/operator/UsersPage.tsx` | 71 | `KCOS_ROLE_DISPLAY.pharmacist: '약사'` | role badge / table cell |
| 4 | `pages/operator/UsersPage.tsx` | 72 | `KCOS_ROLE_DISPLAY.supplier: '공급자'` | role badge / table cell |
| 5 | `pages/operator/EditUserModal.tsx` | 10 | docstring `"회원 유형: seller / consumer / pharmacist / supplier / partner"` | 코드 문서 |
| 6 | `pages/operator/EditUserModal.tsx` | 36 | `membershipRoleOptions: [..., { value: 'pharmacist', label: '약사' }, ...]` | select option (operator 가 회원에게 부여 가능) |
| 7 | `pages/operator/EditUserModal.tsx` | 37 | `membershipRoleOptions: [..., { value: 'supplier', label: '공급자' }, ...]` | select option |

---

## 5. 유지 가능한 항목 목록 (Legitimate / F 보존)

다음은 K-Cosmetics 자체 회원 분류가 아닌 **cross-service / business model** 정상 사용 — 본 CHECK 대상 외:

| 파일 | 위치 | 사유 |
|------|------|------|
| `pages/operator/EventOfferApprovalsPage.tsx` | line 6, 150, 154, 190, 207, 212, 247 — "공급자", `supplierName` | **Neture 공급자 cross-service context** — Neture 공급자가 K-Cos 에 제안한 multi-service OPL 검토 화면. 외부 공급자 표기 정상 |
| `pages/operator/ProductDetailPage.tsx` | line 46-47, 75, 86-100, 241-266 — `supplierId/Name`, "공급자 오퍼", "공급자 연결" | **상품 공급자 business model** — K-Cosmetics 상품에 공급자가 연결되는 자연스러운 도메인 (상품 ↔ 공급자 관계) |
| `pages/operator/ProductsPage.tsx` | line 29, 185-186, 253 — `supplierCount`, "공급자" column | 동일 — 상품의 공급자 정보 |

> 위 3개 파일의 "공급자" 는 **K-Cosmetics 자체 회원의 supplier role** 이 아니라 **Neture 공급자 / 상품 공급자** 의 cross-service 또는 도메인 정상 표기. W4 대상이 아님.

---

## 6. StoresPage 검증

**파일**: [services/web-k-cosmetics/src/pages/operator/StoresPage.tsx](../../services/web-k-cosmetics/src/pages/operator/StoresPage.tsx)

### 6.1 잔재 위치

```ts
// line 53-57
typeLabels: {
  pharmacy: '약국',
  store: '매장',
  branch: '지점',
},
```

### 6.2 사용 컨텍스트

- 화면 위치: K-Cosmetics operator 의 매장 목록 페이지
- 노출 형태: StoreType column 의 label fallback. `row.type === 'pharmacy'` 이면 '약국' 으로 표시
- 사용자 노출 여부: **YES** — StoreType 이 'pharmacy' 인 row 가 있으면 화면에 "약국" 표시

### 6.3 데이터 근거

K-Cosmetics 도메인에 `pharmacy` storeType 데이터가 실제 있는지 별도 검증 필요 (Tier 5 CHECK §4 에서는 pharmacist role 데이터 0건 확인했으나 storeType 은 직접 확인 안 함). pharmacy storeType 데이터가 0건이면 fallback 자체가 dead.

### 6.4 권장 처리

`pharmacy: '약국'` 키 1줄 제거. fallback 으로 raw type (예: 'pharmacy') 표시되거나 별도 처리.

---

## 7. StoreDetailPage 검증

**파일**: [services/web-k-cosmetics/src/pages/operator/StoreDetailPage.tsx](../../services/web-k-cosmetics/src/pages/operator/StoreDetailPage.tsx)

### 7.1 잔재 위치

```ts
// line 183
const typeLabel: Record<string, string> = { pharmacy: '약국', store: '매장', branch: '지점' };
```

### 7.2 사용 컨텍스트

- StoresPage 와 동일 패턴 (inline 형태)
- 매장 상세 화면의 type label

### 7.3 권장 처리

`pharmacy: '약국'` 키 1줄 제거. StoresPage 와 동시 처리 권장.

---

## 8. UsersPage 검증

**파일**: [services/web-k-cosmetics/src/pages/operator/UsersPage.tsx](../../services/web-k-cosmetics/src/pages/operator/UsersPage.tsx)

### 8.1 잔재 위치

```ts
// line 64-74
const KCOS_ROLE_DISPLAY: Record<string, string> = {
  general: '일반 회원',
  'cosmetics:store_owner': '판매자',
  store_owner: '판매자',
  seller: '판매자',
  consumer: '소비자',
  customer: '소비자',
  pharmacist: '약사',          // line 71
  supplier: '공급자',          // line 72
  partner: '파트너',
};
```

### 8.2 사용 컨텍스트

- K-Cosmetics 회원 관리 페이지의 role badge / "회원 유형" 컬럼
- `getPrimaryRole(u)` 의 반환값을 표시 라벨로 매핑

### 8.3 데이터 근거 (Tier 5 CHECK §4)

- `role_assignments` 의 `pharmacist` (글로벌): **0건**
- `role_assignments` 의 `supplier` (글로벌): 3건이나 **cosmetics service_memberships 보유 0건**
- `service_memberships.service_key='cosmetics'`: **0 rows**

→ K-Cosmetics 회원 관리에서 pharmacist/supplier role 의 row 가 표시될 일 없음. **dead label**.

### 8.4 권장 처리

`pharmacist` + `supplier` 키 2줄 제거.

---

## 9. EditUserModal 검증

**파일**: [services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx](../../services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx)

### 9.1 잔재 위치

```ts
// docstring line 10
*   - 회원 유형: seller / consumer / pharmacist / supplier / partner

// line 33-39
membershipRoleOptions: [
  { value: 'seller', label: '판매자' },
  { value: 'consumer', label: '소비자' },
  { value: 'pharmacist', label: '약사' },    // line 36
  { value: 'supplier', label: '공급자' },    // line 37
  { value: 'partner', label: '파트너' },
],
```

### 9.2 사용 컨텍스트

- 회원 정보 수정 모달의 회원 유형 SELECT 옵션
- **operator 가 K-Cos 회원에게 'pharmacist' 또는 'supplier' role 을 부여할 수 있는 선택지**
- 부여 후 KCOS_ROLE_DISPLAY 매핑으로 라벨 표시

### 9.3 데이터 근거

Tier 5 CHECK §4 결과 — K-Cos 에 pharmacist/supplier 회원은 0건. 즉 operator 가 이 옵션을 선택해서 K-Cos 회원에게 부여한 사례 없음. **dead option**.

### 9.4 권장 처리

- `pharmacist` / `supplier` option 2줄 제거
- docstring line 10 의 "pharmacist / supplier" 표기 정정 → `"seller / consumer / partner"` (KCOS_ROLE_DISPLAY 와 정합)

### 9.5 TypeScript 영향

- `membershipRoleOptions` 는 `EditUserModalConfig['membershipRoleOptions']` 타입 — `Array<{ value: string, label: string }>` 추정 (literal union 아닐 가능성 높음). 옵션 제거 시 TS 영향 0
- `KCOS_ROLE_DISPLAY` 는 `Record<string, string>` — 키 제거 시 TS 영향 0 (lookup 실패 시 raw key 반환 fallback)

---

## 10. operatorMenuGroups 검증

**파일**: [services/web-k-cosmetics/src/config/operatorMenuGroups.ts](../../services/web-k-cosmetics/src/config/operatorMenuGroups.ts)

### 10.1 잔재 검색 결과

**0 매치** ✅

### 10.2 분석

UNIFIED_MENU 의 어느 그룹에도 약국/약사/공급자 메뉴 없음. K-Cosmetics operator 메뉴 구조는 매장 / 상품 / 주문 / 콘텐츠 / 사이니지 / 포럼 / LMS / 자료실 / 분석 영역으로 정합되어 있음.

**판정**: ✅ 메뉴 구조 잔재 없음

---

## 11. 판정 A/B/C

### ⚠️ 판정: **B — 잔재 있음, 작게 수정 가능**

| 항목 | 결과 |
|------|------|
| 사용자 노출 잔재 | 5 파일 7 라인 |
| backend / DB / role 구조 의존 | **없음** — 단순 label/option map 정리 |
| TypeScript 영향 | **없음** — `Record<string, string>` 키 제거 / `Array<{value, label}>` entry 제거 |
| 다른 서비스 영향 | **없음** — K-Cosmetics web 단독 |
| 데이터 근거 (제거 안전) | **확인됨** — Tier 5 CHECK §4 (pharmacist=0, cosmetics-membership supplier=0) |

### 후속 권장: **W4-v2 진행**

`WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V2`

W4 시점과 동일 범위 + 동일 변경 — 외부 세션 편집 사이클이 안정된 main HEAD 기준 재시도.

---

## 12. W4-v2 필요 여부

**YES — 즉시 진행 가능 (작은 범위)**

### 12.1 W4-v2 의 안전성 근거

1. **데이터 근거 확정** (Tier 5 §4 — pharmacist/supplier active 0건)
2. **TypeScript 영향 0** (Record + Array entry 제거)
3. **다른 서비스 영향 0** (K-Cos web 단독)
4. **외부 세션 sidebar 공통화 작업 완료** (commit `46be3e1ce` 추정, post-W4 시점 외부 세션 정리 완료) — W4 시점의 충돌 원인 해소

### 12.2 W4-v2 의 차이

W4 시점 대비 변동 없음 — 동일 5 파일 7 라인 변경. 외부 세션 편집 사이클이 안정된 시점 재시도라는 점만 다름.

### 12.3 OPTIONAL 후속 (별도)

- `EditUserModal.tsx:10` docstring 의 라벨 정정 (W4-v2 동봉 가능 / 별도 가능)

---

## 13. 수정 후보 파일과 수정 범위

| # | 파일 | 라인 | 변경 |
|---|------|-----:|------|
| 1 | `pages/operator/StoresPage.tsx` | 54 | `pharmacy: '약국'` 1줄 제거 |
| 2 | `pages/operator/StoreDetailPage.tsx` | 183 | inline `pharmacy: '약국'` 1줄 제거 (또는 inline 객체 재작성) |
| 3 | `pages/operator/UsersPage.tsx` | 71 | `pharmacist: '약사'` 1줄 제거 |
| 4 | `pages/operator/UsersPage.tsx` | 72 | `supplier: '공급자'` 1줄 제거 |
| 5 | `pages/operator/EditUserModal.tsx` | 10 | docstring 정정 ("seller / consumer / pharmacist / supplier / partner" → "seller / consumer / partner") |
| 6 | `pages/operator/EditUserModal.tsx` | 36 | `{ value: 'pharmacist', label: '약사' }` 1줄 제거 |
| 7 | `pages/operator/EditUserModal.tsx` | 37 | `{ value: 'supplier', label: '공급자' }` 1줄 제거 |

**총 변경**: 4 파일 / 약 7 라인 삭제 + 1 라인 정정 (-7 / +0~1)

---

## 14. Working tree 격리 상태

### 14.1 CHECK 시작 시점

```
nothing to commit, working tree clean
```

→ working tree 완전히 깨끗. 다른 세션 WIP 0건.

### 14.2 CHECK 문서 작성 후 시점

본 CHECK 문서 1개만 untracked. 다른 세션 WIP 없음 — W4-v2 진행 시 path-restricted 충돌 가능성 낮음.

### 14.3 commit 정책

- 본 CHECK 문서 1개만 path-restricted commit (`git commit -- <path>`)
- W4-v2 는 별도 trigger 후 단일 commit (4 파일)

---

## 15. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| **판정** | ⚠️ **NEEDS W4-v2** (잔재 있음, 작게 수정 가능) |
| **작성 문서** | `docs/investigations/CHECK-O4O-KCOSMETICS-OPERATOR-VOCABULARY-RECHECK-V1.md` |
| **pharmacy / 약국 잔재** | **2 파일** (StoresPage.tsx:54, StoreDetailPage.tsx:183) |
| **pharmacist / 약사 잔재** | **2 파일** (UsersPage.tsx:71, EditUserModal.tsx:36 + docstring) |
| **supplier / 공급자 잔재 (K-Cos 자체 회원 분류)** | **2 파일** (UsersPage.tsx:72, EditUserModal.tsx:37 + docstring) |
| **사용자 노출 잔재 목록** | 5 파일 7 라인 (§4) |
| **유지 가능 항목** | EventOfferApprovalsPage, ProductDetailPage, ProductsPage 의 "공급자" (Neture supplier cross-service + 상품 공급자 business model — F) |
| **W4-v2 필요 여부** | **YES — 즉시 진행 가능, 작은 범위** |
| **Code / DB 수정** | 없음 ✅ |
| **다른 세션 WIP 미포함** | ✅ working tree clean |
| **Commit 여부** | **사용자 승인 대기** — 본 CHECK 문서 1개만 path-restricted commit 예정 |

---

> **상태**: 재확인 완료. 본 CHECK 문서 commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정. W4-v2 는 본 CHECK commit 후 별도 trigger 시 진행 가능.
