# IR-O4O-NETURE-SUPPLIER-DEACTIVATION-GOVERNANCE-AND-APPROVAL-CONSOLE-GATE-V1

- WO: IR-O4O-NETURE-SUPPLIER-DEACTIVATION-GOVERNANCE-AND-APPROVAL-CONSOLE-GATE-V1
- 성격: **READ-ONLY 정책·구조 감사.** 코드 변경 0 / route 변경 0 / UI 변경 0 / DB write 0 / 공급자 상태 변경 0 / 배포 0.
- 기준: `main` (0eaa7f7d9 시점), 프로덕션 DB read-only 집계(SELECT 전용).
- 판정: **OPTION_B_ADMIN_GOVERNANCE** — 단, 재활성화·사유 계약 부재로 후속 WO 에서 governance 화면 정비를 전제한다.
- 선행: [IR-O4O-NETURE-SUPPLIER-APPROVAL-AND-QUALITY-CONSOLE-CANONICALIZATION-AUDIT-V1](IR-O4O-NETURE-SUPPLIER-APPROVAL-AND-QUALITY-CONSOLE-CANONICALIZATION-AUDIT-V1.md)

---

## 0. 핵심 질문에 대한 답 (요약)

| # | 질문 | 답 |
|---|------|-----|
| 1 | 비활성화 사유 | 코드/UI 어디에도 **사유 입력·기록 없음**(고정 문자열 `'Supplier deactivated'` 만 product_approvals.reason 에 기록) |
| 2 | 실제 사용 빈도 | **0회**(전체 이력 기준 deactivate 액션 로그 0건) |
| 3 | 일상 vs governance | **예외 governance** — 사용 0 + 고위험 cascade + 복구 UI 부재 |
| 4 | 권한 | backend `neture:admin` 전용(operator 미노출) |
| 5 | 사유·확인·감사 | 확인 모달 1단계(사유 없음) + `neture.admin.supplier_deactivate` 감사 로그 존재 |
| 6 | 도메인 영향 | 상품 승인 revoke + 매장 진열 비활성 + 멤버십 suspend + supplier role 제거 + 조직 비활성 (광범위) |
| 7 | 재활성화 경로 | **없음**(backend·frontend 모두). INACTIVE→ACTIVE 코드 경로 부재 |
| 8 | admin 페이지 비활성화 외 고유 이유 | 없음 — 승인/거절은 operator 와 완전 중복 |

**결론**: 비활성화는 일상 승인 업무가 아니라 **드문 고위험 governance 업무**이며, operator 일상 콘솔에 흡수하면 안 된다(Option A 기각). Option B(admin governance 분리).

---

## 1. 현재 비활성화 구현 (§6)

| 항목 | 현재 구현 |
|------|-----------|
| 화면 | `AdminSupplierApprovalPage` (`/admin/admin-suppliers`) |
| Route | `POST /api/v1/neture/admin/suppliers/:id/deactivate` |
| 사용자 역할 | `requireAuth` + `requireNetureScope('neture:admin')` — **admin 전용** (operator 컨트롤러 미노출) |
| 대상 상태 | `ACTIVE` 만 (`status !== ACTIVE → INVALID_STATUS`) |
| API helper | `adminSupplierApi.deactivateSupplier(id)` → payload 없음 |
| 사유 필수 여부 | **없음** — 사유 입력 필드 자체가 없음 |
| 확인 절차 | 확인 모달 1단계 "이 공급자를 비활성화하시겠습니까?" (`deactivateConfirmId`) |
| 감사 로그 | ✅ `action_logs` action_key=`neture.admin.supplier_deactivate` (meta={supplierId}) |
| 재활성화 기능 | **없음** (UI·API·service 전무) |
| 노출 조건 | `RowActionMenu` 에서 `status==='ACTIVE'` 행에만 `variant:'danger'` 로 표시 |

- 코드 근거: 컨트롤러 [admin.controller.ts:148-171](../../apps/api-server/src/modules/neture/controllers/admin.controller.ts#L148-L171), 서비스 [supplier.service.ts:246-300](../../apps/api-server/src/modules/neture/services/supplier.service.ts#L246-L300), 프론트 [AdminSupplierApprovalPage.tsx:125-132·253·380-398](../../services/web-neture/src/pages/admin/AdminSupplierApprovalPage.tsx#L125-L132).

---

## 2. 상태 전이 불변식 (§7)

`SupplierStatus = { PENDING, ACTIVE, REJECTED, INACTIVE }`

| 전이 | 판정 | 근거 |
|------|------|------|
| PENDING → ACTIVE | **SUPPORTED** (approve, admin+operator) | `approveSupplier`: status가 PENDING 일 때만 |
| PENDING → REJECTED | **SUPPORTED** (reject, admin+operator) | `rejectSupplier`: PENDING 일 때만 |
| ACTIVE → INACTIVE | **ADMIN_ONLY** (deactivate) | `deactivateSupplier`: ACTIVE 일 때만, neture:admin |
| INACTIVE → ACTIVE | **UNSUPPORTED** | 재활성화 코드 경로 없음. approve는 PENDING 전제라 INACTIVE 에 미적용 |
| REJECTED → PENDING | **UNSUPPORTED** | 되돌리는 코드 없음 |
| REJECTED → ACTIVE | **UNSUPPORTED** | approve는 PENDING 전제 |

- `SupplierStatus.ACTIVE` 대입 지점은 코드 전체에서 **line 124(approve, PENDING→ACTIVE) 단 1곳** → INACTIVE 를 되살리는 경로가 구조적으로 부재.
- REJECTED vs INACTIVE: UI 라벨 구분됨("거절됨" vs "비활성", 배지 색상 상이). 그러나 KPI 카드는 둘을 합산(`inactiveCount = INACTIVE || REJECTED`) — 표시상 혼합.
- **핵심 불변식 결함**: 비활성화는 **일방향 문(one-way door)**. 잘못 실행하면 UI 로 되돌릴 수 없음.

---

## 3. 역할별 권한 (§10)

| 역할 | 승인 | 거절 | 비활성화 | 재활성화 | 감사 조회 |
|------|:--:|:--:|:--:|:--:|:--:|
| 일반 supplier | ✕ | ✕ | ✕ | ✕ | ✕ |
| partner / seller | ✕ | ✕ | ✕ | ✕ | ✕ |
| neture operator | ✅ | ✅ | ✕ | ✕ | ✕ |
| neture admin | ✅ | ✅ | ✅ | ✕(기능 없음) | (로그 기록만) |
| platform super_admin | scope 통과 시 ✅ | ✅ | ✅ | ✕ | — |

- 판정 기준 = **backend guard**(프론트 버튼 노출 아님). 승인/거절 = operator+admin, 비활성화 = admin 전용.
- supplier 가 자기 상태를 변경할 수 있는 경로 **없음** → §19 P0 해당 없음.

---

## 4. 비활성화 사유 (§8)

- 판정: **REASON_NOT_SUPPORTED.**
- UI 에 사유 입력 필드 없음. API payload 없음. service 는 `product_approvals.reason` 에 **고정 문자열 `'Supplier deactivated'`** 만 기록.
- action_logs meta 에도 사유 없음(`{supplierId}` 만).
- 실제 사유 유형(계약 종료/정책 위반/공급자 요청/테스트 정리 등)은 **어디에도 구조화되지 않음.**
- 본 IR 은 새 사유 정책을 만들지 않는다 → 후속 WO 필수 항목으로만 기록.

---

## 5. INACTIVE 영향 범위 (§9)

`deactivateSupplier` 가 트랜잭션적으로 수행하는 cascade:

| 영역 | INACTIVE 시 동작 | 근거 |
|------|------------------|------|
| 공급자 상태 | ACTIVE→INACTIVE | supplier.service.ts:255 |
| 상품 승인 | 해당 공급자 모든 offer 의 `product_approvals.approval_status='approved'→'revoked'` | :258-270 |
| 매장 진열 | 해당 offer 의 `organization_product_listings.is_active=false` | :273-280 |
| 멤버십(로그인/서비스 접근) | `service_memberships.status='suspended'` | :282-289 |
| supplier 권한 | `role_assignments` 에서 `supplier` role 제거 | :290 |
| 조직 | 조직 `isActive=false` | :293-294 setOrgActive |
| **진행 중 주문** | **미처리** — cascade 가 order/shipment 를 건드리지 않음 | (코드에 order 갱신 없음) |
| **정산** | **미처리** — settlement 미갱신 | (코드에 settlement 갱신 없음) |

- 구분: **계정 접근 차단(멤버십 suspend + role 제거) + 기존 노출 자산 숨김(listing 비활성 + 승인 revoke) 둘 다 발생**.
- 미처리 리스크: 진행 중 주문·정산은 cascade 대상이 아니어서, ACTIVE 거래가 있는 공급자를 비활성화하면 **주문/정산은 남고 접근만 끊기는 불일치**가 생길 수 있음(프로덕션 현재 INACTIVE 0 이라 실사례 없음).
- 런타임 주의: 멤버십 suspend/role 제거의 로그인 차단 효과는 **코드 흐름 기준 추론**이며 본 감사에서 브라우저 런타임 검증은 수행하지 않음.

---

## 6. 재활성화 계약 (§7·§21)

- **재활성화 계약 부재(확정).** INACTIVE→ACTIVE 경로가 backend service·controller·frontend 어디에도 없음.
- approve 는 PENDING 전제라 INACTIVE 공급자에 사용 불가. 되돌리려면 **수동 SQL** 밖에 없음 — 정상 절차로 채택 불가(CLAUDE.md §0 write 승인 원칙).
- → §21 의 "재활성화 가능 여부 확인 불가"는 **해당 없음**(확인 완료: 불가능). 단 이 부재 자체가 P1 결함이자 후속 WO 필수 범위.

---

## 7. 감사 로그 (§8)

- 테이블 `action_logs` (service_key/user_id/action_key/meta/created_at …).
- 승인/거절/비활성화 각각 `neture.{admin|operator}.supplier_{approve|reject|deactivate}` 기록(fire-and-forget `.catch(()=>{})`).
- 비활성화 감사 로그는 **존재하나 실제 기록 0건**(사용 0). 사유 필드 없음.

---

## 8. 프로덕션 상태 집계 (§11, read-only)

채널: 기존 실행 중 cloud-sql-proxy(127.0.0.1:15433) + psql, 계정 `o4o_api`, DB `o4o_platform`. **SELECT 전용, PII/사유 원문 미조회.**

| 지표 | 값 |
|------|---:|
| neture_suppliers ACTIVE | 2 |
| ─ PENDING | 1 |
| ─ REJECTED | 0 |
| ─ INACTIVE | **0** |
| 현재 INACTIVE 공급자 | **0** |
| 비활성화 이력(action_logs deactivate) 30d / 90d / 전체 | **0 / 0 / 0** |
| 비활성화 후 재활성화 수 | 0 (기능 부재) |

---

## 9. 최근 사용 (§12)

| 액션(action_key) | 전체 건수 | 마지막 |
|------------------|---:|------|
| neture.operator.supplier_approve | 2 | 2026-07-23 |
| neture.admin.supplier_approve | 1 | 2026-05-28 |
| neture.*.supplier_reject | 0 | — |
| **neture.admin.supplier_deactivate** | **0** | — |

- 승인 채널 = **operator 가 실사용 최신**(admin approve 는 5월 이후 없음) → 선행 IR 의 "operator = 승인 canonical" 데이터로 재확인.
- 비활성화 판정: **NO_OBSERVED_USAGE**(전체 이력 0). 로그 0 ≠ 절대 미사용이나, INACTIVE 공급자 0 과 결합되어 강한 신호.

---

## 10. 운영 위험 평가 (§13)

**평가: HIGH.**

| 트리거(§13 최소 HIGH 조건) | 해당 |
|------|:--:|
| 진행 주문 처리 영향 | △ (cascade 미처리 → 불일치 가능) |
| 정산 접근 영향 | △ (멤버십 suspend 로 접근 차단, settlement 미갱신) |
| 기존 거래 중단(listing 비활성·승인 revoke) | ✅ |
| 복구 UI 없음 | ✅ |
| 비활성화 사유 기록 없음 | ✅ |
| 단일 클릭 즉시 실행 | ✕ (확인 모달 1단계 존재) |

- 3개 이상 HIGH 트리거 충족 → **최소 HIGH**. 다만 프로덕션 실행 0·거래 데이터 소량이라 현재 실피해는 없음(잠재 위험).

---

## 11. A / B / C 비교 (§14·§15)

| 기준(우선순위) | A Operator 흡수 | B Admin governance | C UI 제거 |
|---|---|---|---|
| 1. 거래·정산·접근 안전 | ✕ 고위험을 일상 콘솔에 노출 | ✅ 권한 격리 | ✅ 노출 최소 |
| 2. 권한 분리 | ✕ operator는 backend 권한도 없음 | ✅ admin 전용 유지 | ✅ |
| 3. 감사 가능성 | △ | ✅ | △(절차 외부화) |
| 4. 운영 편의 | ✅ 동선 단일 | △ | ✕ |
| 5. 코드 중복 제거 | ✅ admin 페이지 은퇴 | ✅ 승인 중복 제거 | ✅ |
| 사용 빈도 적합성 | ✕ (0회를 일상 UI 로) | ✅ (드문 governance) | △ (0회면 UI 불요론) |
| 재활성화 지원 | ✕ 미해결 | 필요(WO 범위) | 해당 없음 |
| 구현 복잡도 | 중 | 중 | 저 |

- **A 기각**: 비활성화는 operator 가 backend 권한조차 없는 고위험 일방향 액션. 코드 중복 제거만을 이유로 A 선택 금지(§15).
- **C 검토**: 사용 0 근거로는 매력적이나, (1) 정당한 governance 필요(계약 종료 등)가 존재할 수 있고 (2) 감사 로그 인프라가 이미 있어 UI 완전 제거보다 **축소 governance 유지**가 안전. 수동 SQL 을 정상 절차로 만들지 않음(§14 C 주의).
- **B 채택**: operator=승인 canonical, admin=비활성화(+재활성화·사유) **governance 전용 축소 화면**. 승인/거절 중복 제거.

---

## 12. 최종 정책 판정 (§16)

### 판정: **OPTION_B_ADMIN_GOVERNANCE**

- **선택 이유**: 비활성화는 사용 0·고위험·일방향의 **예외 governance** 업무다. admin 전용 backend 권한과 감사 인프라가 이미 있으므로, 일상 승인(operator)과 분리된 **축소 governance 화면**으로 유지하는 것이 안전·감사·권한분리 모두에서 우월하다.
- **기각 이유**: A = 고위험 액션을 operator 일상 콘솔에 노출(권한·안전 위배). C = 정당한 governance 필요와 기존 감사 인프라를 버리고 수동 절차로 외부화(운영 위험·추적성 저하).
- **비활성화 권한 역할**: `neture:admin` 유지(변경 없음).
- **재활성화 정책**: 현재 **부재 → 후속 WO 에서 신설 필수**(INACTIVE→ACTIVE 복구 경로). 그전까지 비활성화는 사실상 emergency-only 로 취급.
- **사유 입력 정책**: 후속 WO 에서 **사유 필수화**(코드값 또는 필수 텍스트) + action_logs meta 기록.
- **감사 로그 정책**: 기존 `neture.admin.supplier_deactivate` 유지 + 사유·revoke 건수 meta 확장.
- **후속 구현 범위**: §18 WO-B.

> 단서: 재활성화·사유 계약이 부재하므로 본 판정은 "B 방향 확정 + 그 화면을 안전하게 만들 신규 계약(재활성화·사유)을 후속 WO 필수 범위로 포함"이다. 이 신규 계약 없이 비활성화 UI 를 그대로 두는 것은 권장하지 않는다.

---

## 13. AdminSupplierApprovalPage 처리 방향 (§17)

**B 선택에 따름:**

- `OperatorSupplierApprovalPage` (`/operator/suppliers`) = 승인/거절 **canonical** 유지.
- `AdminSupplierApprovalPage` (`/admin/admin-suppliers`) = **governance 전용으로 축소**:
  - 승인/거절/중복 목록 제거(operator 로 수렴).
  - ACTIVE↔INACTIVE 관리(비활성화 + **신규 재활성화** + **사유**)만 남김.
  - route·메뉴 명칭을 "공급자 승인"→"공급자 상태 governance" 류로 재정비(승인과 혼동 방지).
- 전체 admin 승인 페이지를 중복 유지하지 않음.

---

## 14. P0 / P1 / P2 (§19)

- **P0 (즉시 중지 대상)**: **없음.** supplier 자기 상태 변경 불가, 비활성화 backend 권한 admin 전용, 우회 없음, 고위험 mutation 에 감사 로그 존재.
- **P1**
  - (P1-a) **비활성화 후 복구 불가** — 재활성화 경로 전무(수동 SQL 만). 일방향 문.
  - (P1-b) **진행 주문·정산 영향 미처리** — cascade 가 order/settlement 를 다루지 않아 불일치 가능.
  - (P1-c) admin/operator 승인 mutation 중복(drift 위험) — 선행 IR 과 동일.
- **P2**
  - (P2-a) 중복 승인 UI(admin 페이지 승인/거절 = operator 와 동일).
  - (P2-b) 비활성화 사유 미기록(자유·코드값 모두 없음).
  - (P2-c) KPI 카드가 INACTIVE 와 REJECTED 를 합산 표시(상태 의미 혼합).

P0 미발견 → 긴급 WO 불요.

---

## 15. 후속 WO (§18)

### `WO-O4O-NETURE-SUPPLIER-APPROVAL-CONSOLE-AND-ADMIN-GOVERNANCE-SEPARATION-V1` (B 결과)

범위:
1. operator 승인 콘솔 = 승인/거절 canonical 고정.
2. admin 화면 = ACTIVE↔INACTIVE governance 전용 축소(승인/거절 중복 제거).
3. **재활성화(INACTIVE→ACTIVE) 경로 신설** — 멤버십 복원·role 재부여·listing/승인 재활성 정책 확정(P1-a 해소).
4. **비활성화 사유 필수화** + action_logs meta 기록(P2-b 해소).
5. **진행 주문·정산 처리 정책** — 비활성화 시 활성 거래 가드/안내(P1-b 해소).
6. route·메뉴 명칭 재정비(승인 vs governance 분리, P2-a/c 해소).

- CSV 품질 콘솔 은퇴는 **별도 WO**로 유지(선행 IR).
- 상태 머신 변경(전이 규칙)은 위 WO 에서 재활성화 신설과 함께 명시적으로 설계.

---

## 16. 불변식 준수 (§20·§23)

- 코드 수정 0 · UI 수정 0 · route 변경 0 · 권한 변경 0 · 비활성화/재활성화 실행 0 · DB write 0 · migration 0 · 상태 머신 변경 0 · 감사 로그 신규 구현 0 · admin 화면 삭제 0 · operator 화면 변경 0.
- 프로덕션 DB = read-only(SELECT) 집계만. 자격증명 미기록.
- 다른 세션의 staged/modified/untracked 파일 미접촉.
- 본 문서만 커밋 대상.
