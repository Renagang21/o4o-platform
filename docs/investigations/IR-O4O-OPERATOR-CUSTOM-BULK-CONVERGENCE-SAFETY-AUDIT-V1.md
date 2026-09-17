# IR-O4O-OPERATOR-CUSTOM-BULK-CONVERGENCE-SAFETY-AUDIT-V1

> **유형**: Investigation (조사 전용 — 코드/UI/API/DB/route/menu 수정 없음)
> Neture `AllRegisteredProductsPage` 의 custom bulk 흐름을 정독해 표준(ActionBar+useBatchAction+BulkResultModal) 수렴 안전성을 판단.

---

## 1. 조사 개요

선행 `IR-O4O-OPERATOR-BULK-ACTION-FLOW-CROSSSERVICE-AUDIT-V1` 는 두 화면을 "custom bulk(D), 위험 action 정독 필요"로 분류했다. 본 IR은 두 화면을 **소스+API client+backend route까지 정독**해 (a) 위험 action 가드 (b) batch contract (c) 단건/bulk 정책 (d) 수렴 가능성을 확정한다.

## 2. 사전 git 상태

```text
branch : main
HEAD   : c499c426d55c6bfd1e90e5c6400299e6f6b8af3a
origin/main ahead/behind : 0 / 0
status --short (본 IR 무관, 미접촉):
  M docs/investigations/CHECK-O4O-OPERATOR-ORDER-VIEW-LOOP-COMPLETION-V1.md  (다른 세션 WIP)
  ?? c:tmpcheck_guide_links.sh                                              (임시물)
조사 기준 commit : c499c426d
```

## 3. 조사 대상 파일

---

## 8. Neture AllRegisteredProductsPage — 현재 구조

DataTable(964-982) + `selectable`(979) + `selectedOfferIds`(246) + RowActionMenu(680-691, `buildRowActions`+`defineActionPolicy`) + BaseDetailDrawer(1034) + 검색/규제타입 필터/KPI 필터/페이지네이션 + empty/loading. **ActionBar 사용. useBatchAction/BulkResultModal 미사용 — 대신 custom 부분실패 toast.**

## 9. Neture bulk action 정독 — ★이미 안전

| action | key | handler | 방식 | confirm | reason | 가역성 | API | backend |
|---|---|---|:--:|:--:|:--:|:--:|---|---|
| 승인 | approve | handleBulkApprove(379) | **batch** | ✅(890) | — | ✅ | `batchApprove(ids)` | `POST /operator/products/batch-approve` (neture:operator) |
| 거절 | reject | handleBulkReject(405) | **batch** | ✅(904) | ✅(opt) | ✅ | `batchReject(ids,reason)` | `POST /operator/products/batch-reject` (neture:operator) |
| 활성화 | activate | handleBulkToggleActive(true)(916) | **batch** | ✅(920) | — | ✅ | `batchToggleActive(ids,true)` | `PATCH /operator/all-offers/batch-active` ⚠️ |
| 비활성화 | deactivate | handleBulkToggleActive(false)(934) | **batch** | ✅(934) | — | ✅ | `batchToggleActive(ids,false)` | `PATCH /operator/all-offers/batch-active` ⚠️ |
| 삭제 | delete | handleBulkDelete(355) | **fan-out** | ✅(949) | — | **soft(휴지통 복원 가능)** | `softDelete(id)×N` | `POST /operator/product-cleanup/soft-delete/:id` (neture:operator) |

- 모든 bulk action에 **confirm 객체**(title/message/variant) 존재, reject는 `showReason`. 부분실패는 toast로 `성공 N / 실패 M` 표시 + 성공 후 reload. delete는 **soft(휴지통)** → 가역.
- 단건(RowActionMenu, policy 174-215)도 approve/reject/delete에 confirm·reason 동일 적용. 단건/bulk **정책 일관**(엔드포인트만 단건 vs batch 차이, 동일 service 로직).

## 10. Neture 단건/bulk 정책 비교

일관됨. 단건 confirm/reason ↔ bulk confirm/reason 대응. 위험 action(delete)은 양쪽 soft + confirm. **bulk가 단건보다 위험을 더 쉽게 실행하는 구조 아님.**

## 11. Neture API/guard 확인 — ★backend guard gap 1건

- batch endpoint: approve/reject/toggle-active 존재(최대 100건), delete는 단건 soft-delete fan-out. 부분실패 식별 가능(results/failed).
- **⚠️ guard gap**: `PATCH /operator/all-offers/batch-active` (neture.routes.ts:124) 와 `GET /operator/all-offers`(:95)가 **`requireAuth` 만** 적용 — `requireNetureScope('neture:operator')` 없음. 주석(:382) "all-offers 라우트는 operator sub-router 가드 이전에 등록됨" → operator scope 우회. **인증된 비-operator도 batch-active 호출 가능성**. (approve/reject/soft-delete 는 `neture:operator` 가드 정상.)

---

## 12. 위험 action 안전성 판단

| 화면 | action | 현재 가드 | 판단 |
|---|---|---|---|
 Pharmacies | suspend/activate (bulk·단건) | confirm 없음 + **no-op + backend 없음** | 부작용 없음(미구현). dead UI 오인 위험만 |
| Neture | approve/reject | confirm(+reason) + neture:operator | ✅ 안전 |
| Neture | activate/deactivate | confirm + **requireAuth-only(scope 누락)** | 🟡 FE 안전, **BE scope guard 보강 필요** |
| Neture | delete | confirm + **soft(가역)** + neture:operator | ✅ 안전 |

---

## 13. 표준 수렴 가능성 판정

| 화면 | 분류 | 판정 |
|---|:--:|---|
| **Neture AllRegisteredProductsPage** | **A−(표준 동등)** | **이미 confirm+batch+부분실패+가역 삭제로 안전.** useBatchAction/BulkResultModal 미사용이나 custom toast로 동등 충족. 수렴은 **선택적 폴리시(BulkResultModal+retry UX 향상)** — 긴급도 낮음. 별개로 **BE scope guard gap(§11)** 은 보안 후속. |

---

## 14. 후속 WO 후보

```text
   - PharmaciesPage 의 no-op bulk/단건 action + dead selectable 정리
     (K-Cos ProductsPage / mock-surface guard 와 동일 패턴).
   - 또는 화면 전체를 "준비 중" 안내로 격하(데이터 항상 0, 기능 미구현).
   - backend pharmacy management 구현 시 재설계.

B. (보안) IR/WO-O4O-NETURE-ALL-OFFERS-SCOPE-GUARD-FIX-V1
   - /operator/all-offers GET·batch-active 의 requireAuth-only → neture:operator 가드 보강.
   - backend 변경이므로 별도 확인(라우트 등록 순서 의도 검증) 후 진행.

C. (선택·후순위) WO-O4O-NETURE-ALL-REGISTERED-PRODUCTS-BULKRESULTMODAL-POLISH-V1
   - 이미 안전한 custom toast → useBatchAction+BulkResultModal 로 폴리시(부분실패 모달+retry).
   - 긴급도 낮음. 기능/정책 변화 없이 UX 표준화만.
```

> 선행 IR의 단일 "WO-O4O-OPERATOR-CUSTOM-BULK-CONVERGENCE-V1(두 화면 묶음)"은 **부적절** — 두 화면 성격이 정반대. 화면별 분리가 맞다.

## 15. 우선순위 제안

| 우선 | 항목 |
|:--:|---|
| **P1** | K-Cos cleanup 의 자매 작업 |
| **P1/보안** | B — Neture all-offers scope guard gap 보강 (backend, 라우트 순서 검증 선행) |
| **P3** | C — Neture AllRegisteredProducts BulkResultModal 폴리시(선택) |
| — | Neture 수렴은 "지금 즉시" 불필요(이미 안전). |

---

## 16. Current Structure vs O4O Philosophy Conflict Check

| 확인 | 결과 |
|---|---|
| bulk 결과 예측·확인 가능 | Neture ✅(toast 부분실패). |
| 위험 action이 쉽게 실행되지 않는가 | Neture ✅(전 action confirm, delete soft). |
| 단건/bulk 정책 일관 | Neture ✅. |
| 실패/부분실패 투명성 | Neture ✅(toast). |
| 도메인 custom vs 단순 편차 구분 | — |
| 공통화가 유지보수에 유리한가 | Neture는 이미 표준 동등 → 수렴 이득 작음. |
| 영역 혼입 없음 | ✅ — Supplier workspace/Store Hub/My Store/Guide 미혼입 |

---

## 최종 요약

- **수정 파일 없음** (read-only). 생성 IR: `docs/investigations/IR-O4O-OPERATOR-CUSTOM-BULK-CONVERGENCE-SAFETY-AUDIT-V1.md`. 조사 기준 commit `c499c426d`.
- **Neture AllRegisteredProductsPage 판정**: **이미 안전(confirm+batch+부분실패+soft delete)** — 즉시 수렴 불필요. BulkResultModal 폴리시는 선택(P3).
- Neture delete(soft·confirm, 안전).
- **Neture all-offers scope guard gap 보강(보안, WO B)**.
- git: 다른 세션 WIP(check md/tmp) 미접촉, 본 IR 문서만 commit.

*코드/UI/API/DB/route/menu 변경 없음. 본 IR 은 조사 기록으로 commit 한다.*
