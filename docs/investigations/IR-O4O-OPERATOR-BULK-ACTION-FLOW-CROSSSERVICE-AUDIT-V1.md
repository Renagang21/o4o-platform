# IR-O4O-OPERATOR-BULK-ACTION-FLOW-CROSSSERVICE-AUDIT-V1

> **유형**: Investigation (조사 전용 — 코드/UI/API/DB/route/menu 수정 없음)
> **목적**: O4O 4개 서비스 운영자 리스트 화면의 "체크박스 선택 → bulk action" 흐름이 표준 UX를 따르는지 감사.
> **산출**: dead selectable / no-result-modal / custom bulk / 위험 bulk 후보 식별 + 분류 + 우선순위.

---

## 1. 조사 개요

운영자 UI-UX 공통화는 대부분 표준화되었다(OperatorAreaShell·DomainIASidebar·대시보드·회원·포럼 콘솔·주문 view-only). 남은 P1은 운영자 리스트 화면의 **선택 후 작업(bulk)** 일관성이다. 본 IR은 selectable 사용 화면을 전수 grep으로 식별하고, 각 화면의 `ActionBar`/`BulkResultModal`/`useBatchAction` 보유 여부를 교차 확인해 편차를 분류한다.

## 2. 사전 git 상태

```text
branch : main
HEAD   : 138bab607ce5d6bc133d0b5347e6a2f876283430
origin/main ahead/behind : 0 / 0
status --short (본 IR 무관, 미접촉):
  M docs/investigations/CHECK-O4O-OPERATOR-ORDER-VIEW-LOOP-COMPLETION-V1.md   (다른 세션 WIP)
  M packages/shared-space-ui/src/guide/* · web-neture/.../guide/*            (다른 세션 — operator-revenue guide WO 진행 중)
조사 기준 commit : 138bab607
```
> 다른 세션이 Neture guide(operator-revenue 후속 WO)를 활발히 편집 중 — 본 IR은 read-only이며 해당 파일 미접촉.

## 3. 조사 대상 서비스 / 화면

- 서비스: KPA-Society / GlycoPharm / K-Cosmetics / Neture
- 범위: `src/pages/operator/*` + operator형 `src/pages/admin/*` 리스트 콘솔.
- 제외: Supplier/Partner workspace · Store Hub · My Store · public forum · mypage · public guide/landing (→ P3 별도 영역).

## 4. 공통 bulk UX 기준 (표준 레퍼런스)

| 컴포넌트 | 위치 | 역할 |
|---|---|---|
| `DataTable` (`selectable`) | `packages/operator-ux-core/src/list/DataTable.tsx` | 선택 컬럼 자동 생성 |
| `ActionBar` | `packages/ui/src/components/table/ActionBar.tsx` | 선택 시 노출, confirm+reason 지원 |
| `useBatchAction` | `packages/operator-ux-core/src/list/useBatchAction.ts` | bulk 실행 + 성공/실패/부분실패 + retry + processing |
| `BulkResultModal` | `packages/ui/src/components/table/BulkResultModal.tsx` | 결과 요약 + 부분실패 + retry |
| `RowActionMenu` / `buildRowActions` / `defineActionPolicy` | `packages/ui/.../RowActionMenu.tsx`, `operator-ux-core/src/list/action-policy.ts` | 단건 행 action + 정책/confirm |

**표준 흐름(canonical 콘솔)**: `OperatorMembersConsolePage` / `OperatorForumRequestsConsolePage` / `OperatorForumDeleteRequestsConsolePage` (`packages/operator-core-ui/src/modules/*`) — selectable + ActionBar + useBatchAction + BulkResultModal 전부 사용, 위험 action confirm/정책 적용.

→ **표준 = selectable 화면은 ActionBar + useBatchAction + BulkResultModal 3종을 함께 갖춘다.** 본 IR은 이 3종 보유 여부로 편차를 측정한다.

## 5~8. 서비스별 조사 결과 (selectable 화면 × bulk 컴포넌트 매트릭스)

> `AB`=ActionBar, `BRM`=BulkResultModal, `UBA`=useBatchAction (파일 내 사용 카운트). 표준=세 값 모두 ≥1.

### 5. KPA-Society
| 화면 | AB | BRM | UBA | 판정 |
|---|:--:|:--:|:--:|:--:|
| operator/ForumCategoriesManagementPage | 3 | 3 | 2 | A 표준 |
| operator/ProductApplicationManagementPage | 3 | 3 | 2 | A 표준 |
| operator/PharmacyRequestManagementPage | 4 | 4 | 3 | A 표준 |
| operator/OperatorForumPage | 2 | 2 | 2 | A 표준 |
| operator/OperatorLmsCoursesPage | 2 | 2 | 2 | A 표준 |
| operator/blog/OperatorBlogListPage | 4 | 4 | 3 | A 표준 |
| operator/pop·qr/Operator{Pop,Qr}ListPage | 3 | 3 | 3 | A 표준 |
| operator/signage/{ForcedContent,HqPlaylists,HqMedia,Templates} | 2 | 2 | 2 | A 표준 |
| **operator/QualificationRequestsPage** | 2 | **0** | 2 | **C — BulkResultModal 없음** |
| **admin/AdminMemberManagementPage** | 2 | **0** | **0** | **D — custom selectable+ActionBar, 표준 미수렴 (admin scope)** |

### 6. GlycoPharm
| 화면 | AB | BRM | UBA | 판정 |
|---|:--:|:--:|:--:|:--:|
| operator/blog·pop·qr/Operator*ListPage | 2 | 2 | 2 | A 표준 |
| operator/OperatorLmsCoursesPage | 2 | 2 | 2 | A 표준 |
| **operator/QualificationRequestsPage** | 2 | **0** | 2 | **C — BulkResultModal 없음** |
| **operator/PharmaciesPage** | 4 | **0** | **0** | **D — custom bulk(ActionBar만), 표준 미수렴. deactivate 등 위험 action 확인 필요** |
| operator/OrdersPage | (주석) | 0 | 0 | B — selectable 미사용(주석뿐), view-only 정상 ✅ |

### 7. K-Cosmetics
| 화면 | AB | BRM | UBA | 판정 |
|---|:--:|:--:|:--:|:--:|
| operator/blog·pop·qr/Operator*ListPage | 2 | 2 | 2 | A 표준 |
| operator/OperatorLmsCoursesPage | 2 | 2 | 2 | A 표준 |
| **operator/ProductsPage** | **0** | **0** | **0** | **H/C — DEAD selectable (P0)** |
| operator/OrdersPage | (주석) | 0 | 0 | B — selectable 미사용(주석뿐), view-only 정상 ✅ |

### 8. Neture
| 화면 | AB | BRM | UBA | 판정 |
|---|:--:|:--:|:--:|:--:|
| operator/OperatorProductApprovalPage | 3 | 3 | 2 | A 표준 (V4 canonical) |
| **operator/AllRegisteredProductsPage** | 3 | **0** | **0** | **D — custom bulk(ActionBar만), publish/unpublish/delete. 위험 action 확인 필요** |
| **operator/MarketTrialApprovalDetailPage** | 0 | 0 | 0 | **G — selectable이 단일선택(radio식) detail 패턴, bulk 아님** |
| **admin/AdminMemberManagementPage** | 1 | **0** | **0** | **D — custom selectable+ActionBar (admin scope)** |

## 9. 체크박스 / selectable 현황

- selectable 사용 operator/admin 화면: 약 28개. 그중 **대다수(약 20)는 표준 3종 완비(A)**.
- 공통 콘솔(회원/포럼 신청/포럼 삭제요청)은 4서비스 thin wrapper로 표준 유지(A).
- 편차 화면: §13 목록.

## 10. ActionBar 사용 현황

표준 화면 전부 ActionBar 사용. **ActionBar는 있으나 useBatchAction/BulkResultModal이 없는 custom 화면**: GP PharmaciesPage(AB=4), Neture AllRegisteredProductsPage(AB=3), KPA/Neture AdminMemberManagementPage(AB=1~2). → custom bulk 구현(D).

## 11. BulkResultModal / useBatchAction 사용 현황

- 표준 화면: BRM+UBA 함께 사용.
- **UBA는 있으나 BRM 없음(결과 모달 누락)**: KPA·GP QualificationRequestsPage. bulk는 `useBatchAction.executeBatch`로 실행되고 `result`를 받지만(KPA `QualificationRequestsPage.tsx:196·200`), `BulkResultModal`로 성공/실패/부분실패를 표시하지 않음 → **결과 투명성 갭(C)**.
- **UBA·BRM 모두 없음**: GP Pharmacies / Neture AllRegisteredProducts / Admin member pages / K-Cos Products.

## 12. 위험 action bulk 노출 여부

| 화면 | 위험 bulk 후보 | 확인 필요 |
|---|---|---|
| GP PharmaciesPage | deactivate(?) | ActionBar에 confirm 있는지, deactivate가 bulk에 노출되는지 |
| Neture AllRegisteredProductsPage | delete / unpublish | bulk delete confirm·guard 유무 |
| KPA AdminMemberManagementPage | (admin) member 처리 | admin scope 정책 |
> 본 IR은 컴포넌트 보유만 정적 확인. 위 3건은 후속 WO 착수 시 **위험 action confirm/reason guard를 화면 단위로 정독 검증** 필요(현재 단정 않음).

## 13. dead selectable / no-op action 현황

| # | 화면 | 증상 | 근거 |
|---|---|---|---|
| **D1** | **K-Cosmetics operator/ProductsPage** | **DEAD selectable** — `selectable`(294) + `selectedKeys`(295) + `onSelectionChange`(296) + `selectedIds` state(67)이나, ActionBar/useBatchAction/BulkResultModal 전무. `selectedIds`는 set만 되고 **어떤 action에도 소비되지 않음**. `onRowClick`은 상세 이동(292). → 체크박스가 아무 일도 하지 않음 | `services/web-k-cosmetics/src/pages/operator/ProductsPage.tsx:67,292,294-296` |

> (참고) GP/KCos OrdersPage의 `selectable` 매치는 **주석뿐**(`조회 전용 — selectable 없음`) — 실제 미사용, view-only 정상.

## 14. 화면별 분류표 (요약)

| 분류 | 화면 |
|---|---|
| **A 표준 완료** | 4서비스 공통 콘솔(회원/포럼/포럼삭제) + KPA/GP/KCos 의 blog·pop·qr·lms·signage·forum·product-application·pharmacy-request 등 약 20 |
| **B selectable 불필요·정상** | GP/KCos OrdersPage (view-only) |
| **C selectable 있으나 결과/표준 일부 누락** | KPA·GP QualificationRequestsPage (BulkResultModal 없음), K-Cos ProductsPage (전부 없음) |
| **D custom bulk — 공통 수렴 가능** | GP PharmaciesPage, Neture AllRegisteredProductsPage, KPA·Neture AdminMemberManagementPage |
| **E 위험 bulk 노출 (즉시)** | (단정 보류) GP Pharmacies / Neture AllRegisteredProducts — §12 후속 정독 후 확정 |
| **G 도메인 특수 — 유지** | Neture MarketTrialApprovalDetailPage (단일선택 detail 패턴) |
| **H mock/dead UI** | K-Cos ProductsPage (dead selectable — C와 중복, 가장 시급) |
| **I 별도 영역** | Supplier/Store Hub/My Store/Guide (범위 외) |

## 15. 즉시 정비 가능한 후보 (작고 안전)

1. **(P0) K-Cos ProductsPage dead selectable 정리** — 두 방향: (a) selectable 제거(체크박스 없앰, onRowClick 상세 이동만 유지) 또는 (b) bulk action 와이어. 현재 ProductsPage가 마스터 콘솔(읽기/상세 중심)이면 **(a) selectable 제거가 최소·안전**. 단건 작업만 필요.
2. **(P1) QualificationRequestsPage(KPA·GP)에 BulkResultModal 적용** — useBatchAction `result`를 이미 받고 있으므로 BulkResultModal 연결만 추가하면 표준화(작은 변경).

## 16. backend/API 선행 후보

- GP Pharmacies / Neture AllRegisteredProducts 가 custom bulk를 표준(useBatchAction)으로 수렴하려면 **bulk API(batch endpoint) 존재 여부 확인** 필요. 없으면 fan-out + useBatchAction로 수렴 가능하나, 위험 action(delete/deactivate)은 backend guard 확인 후 진행(P2).

## 17. 별도 채팅방으로 넘길 후보 (P3)

- Supplier/Partner workspace, Store Hub, My Store, Guide, public/community surface, mypage — 본 축(operator) 아님.

## 18. 우선순위 제안

| 우선 | 항목 | 분류 |
|:--:|---|:--:|
| **P0** | K-Cos ProductsPage dead selectable 제거(또는 bulk 와이어) | H/C |
| **P1** | QualificationRequests(KPA·GP) BulkResultModal 적용 | C |
| **P1** | GP Pharmacies / Neture AllRegisteredProducts custom bulk → 표준 수렴 (+위험 action confirm 검증) | D(E 후보) |
| **P2** | Admin member pages(KPA·Neture) 표준 수렴 또는 admin 정책 명문화 | D |
| **P2** | GP Pharmacies / Neture AllRegisteredProducts 위험 bulk(delete/deactivate) guard 정독 검증 | E |
| **P3** | 범위 외 영역 | I |

## 19. 후속 WO 후보

```text
WO-O4O-KCOS-OPERATOR-PRODUCTS-DEAD-SELECTABLE-CLEANUP-V1   (P0, 최소·안전 — 첫 후속 권장)
WO-O4O-OPERATOR-QUALIFICATION-BULK-RESULT-MODAL-V1         (P1, KPA·GP 결과 모달 표준화)
WO-O4O-OPERATOR-CUSTOM-BULK-CONVERGENCE-V1                 (P1, GP Pharmacies + Neture AllRegisteredProducts)
WO-O4O-OPERATOR-ADMIN-MEMBER-BULK-STANDARDIZE-V1           (P2, admin scope)
(검증) GP Pharmacies / Neture AllRegisteredProducts 위험 bulk guard 정독 → 필요 시 분리 WO
```

## 20. Current Structure vs O4O Philosophy Conflict Check

| 확인 | 결과 |
|---|---|
| 선택 후 다음 작업을 예측 가능한가 | 대부분 ✅. **K-Cos Products는 ✗(dead selectable)** — 체크박스가 기대를 배신 |
| bulk 성공/실패 투명성 | 표준 화면 ✅. **QualificationRequests·custom bulk는 BulkResultModal 없어 부분실패 불투명** |
| 위험 작업 bulk 보호 | 공통 콘솔 ✅(confirm/정책). custom bulk(GP Pharmacies / Neture AllRegisteredProducts)는 **후속 정독 필요** |
| 의견 필수 action의 bulk 오노출 | 공통 콘솔은 정책상 제외(예: forum revision bulk 제외). custom 화면 별도 확인 |
| 서비스 편차/도메인 구분 | ✅ — MarketTrial 단일선택은 도메인(G)로 구분, OrdersPage view-only는 정상(B) |
| 1인 유지보수성 | 표준 3종(ActionBar+useBatchAction+BulkResultModal) 수렴이 유지보수에 유리 — custom 4건이 수렴 대상 |
| 영역 혼입 없음 | ✅ — 주문은 view-only 유지, Supplier/Store/Guide 미혼입 |

---

## 최종 요약

- **수정 파일 없음** (read-only).
- 생성 IR: `docs/investigations/IR-O4O-OPERATOR-BULK-ACTION-FLOW-CROSSSERVICE-AUDIT-V1.md`
- 조사 기준 commit: `138bab607`
- 서비스별 bulk 흐름: 대다수 표준(A). 편차는 소수.
- **dead selectable**: K-Cos ProductsPage (P0, 유일·확정).
- **결과 모달 누락(C)**: KPA·GP QualificationRequests.
- **custom bulk(D)**: GP Pharmacies, Neture AllRegisteredProducts, KPA·Neture Admin member.
- **위험 bulk(E 후보)**: GP Pharmacies / Neture AllRegisteredProducts — 후속 정독 검증.
- 즉시 WO: **K-Cos Products dead selectable 정리(P0)** → QualificationRequests BulkResultModal(P1).
- git: working tree에 다른 세션 WIP(guide/check) 존재 — 미접촉, 본 IR 문서만 commit.

*코드/UI/API/DB/route/menu 변경 없음. 본 IR 은 조사 기록으로 commit 한다.*
