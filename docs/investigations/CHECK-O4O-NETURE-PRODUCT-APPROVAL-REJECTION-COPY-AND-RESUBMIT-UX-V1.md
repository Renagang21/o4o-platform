# CHECK-O4O-NETURE-PRODUCT-APPROVAL-REJECTION-COPY-AND-RESUBMIT-UX-V1

> **유형:** Implementation Check Report (P1 UX)
> **작성일:** 2026-06-18
> **WO:** `WO-O4O-NETURE-PRODUCT-APPROVAL-REJECTION-COPY-AND-RESUBMIT-UX-V1`
> **선행 IR:** `IR-O4O-NETURE-OPERATOR-PRODUCT-APPROVAL-NEEDS-INFO-AUDIT-V1`
> **선행 P0:** `WO-O4O-NETURE-PRODUCT-APPROVAL-RESUBMIT-AFTER-REJECT-FIX-V1` (commit `a02883d5b`)
> **결과:** ✅ 문구/UX 정비 완료. 상태 체계 불변(pending/approved/rejected). DB/migration/enum 변경 없음. typecheck PASS(api-server + web-neture). Browser smoke = 배포 후 수행.

---

## 1. 변경 파일 목록

| 파일 | 변경 내용 | WO 항목 |
|------|----------|:------:|
| `apps/api-server/src/modules/neture/services/offer-service-approval.service.ts` | `notifySupplier()` 반려 알림 문구를 "보완 후 재요청 가능"으로 개선 + 제목 `거절`→`반려` + `metadata.targetUrl` 추가(schema 무변경) | 5.4 |
| `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx` | 공급자 컨텍스트 한정 **반려 안내 배너**(상단) 추가 — 사유 + fallback + 재요청 안내 | 5.2 / 5.1 |
| `services/web-neture/src/pages/operator/OperatorProductApprovalPage.tsx` | 반려 정책 placeholder + 독립 반려 모달에 보완 요청 문맥 안내 문구 추가 | 5.3 |
| `services/web-neture/src/pages/admin/AdminProductApprovalPage.tsx` | 반려 모달에 보완 요청 문맥 안내 문구 + placeholder 개선 | 5.3 |

**DB migration / enum / schema 변경 없음.** `needs_info`/`needs_update` status 미도입.

---

## 2. 공급자 목록 반려 사유 표시 방식 (5.1)

- 공급자 목록(`SupplierProductsPage.tsx`)의 승인 컬럼은 90px 좁은 셀로, 반려 사유 본문 텍스트를 인라인 표시하면 테이블 레이아웃 회귀 위험이 있다.
- WO 5.1은 "사유를 **본문 또는 확장 영역**에 직접 표시 / tooltip만 유일한 표시 수단이면 안 된다"를 요구한다.
- **설계 결정:** "확장 영역" = 행 클릭 시 열리는 **ProductDetailDrawer**(목록에서 `setDrawerProduct(row)`로 진입, `SupplierProductsPage.tsx:750/903`). drawer 상단에 반려 사유 + 재요청 안내를 **본문으로** 직접 표시(§3). 목록 badge의 tooltip(`*`)은 **보조**로 유지.
- 결과: tooltip이 더 이상 유일한 표시 수단이 아니며(확장 영역=drawer가 비-tooltip 본문 surface), 레이아웃 회귀 없이 요구 충족. → `SupplierProductsPage.tsx` 자체는 무변경.

---

## 3. 제품 상세/편집 drawer 안내 방식 (5.2)

`ProductDetailDrawer.tsx` 스크롤 본문 최상단에 반려 안내 배너 추가:
- **표시 조건:** `!isEditing && !approvalActions`(= 공급자 조회 컨텍스트) + serviceApprovals(neture 제외) 중 `status==='rejected'` 존재.
- **내용:**
  - 제목: "이 제품은 반려되었습니다."
  - 사유 있음: `반려 사유: {reason}` (service별 다건 리스트)
  - 사유 없음(fallback): "반려 사유가 입력되지 않았습니다."
  - 안내: "아래 정보를 확인하고 제품을 보완한 뒤 다시 승인 요청할 수 있습니다."
- 운영자 승인 컨텍스트(`approvalActions` 존재)에서는 미표시 — 공급자 대상 문구가 운영자에게 노출되지 않게 가드.
- 제품 수정/승인 요청 버튼 노출 정책은 **기존 유지**(안내 강화만, 정책 무변경).

> 기존 drawer 하단 service approval 섹션의 `반려 사유: {sa.reason}`(line 1538 부근)은 그대로 유지 — 상단 배너는 prominent 요약·안내, 하단은 service별 상세로 역할 분리.

---

## 4. 운영자/Admin 반려 모달 문구 변경 (5.3)

**Operator (`OperatorProductApprovalPage.tsx`)** — 반려 surface 2곳 모두:
- 액션 정책 `reasonPlaceholder`: `반려 사유를 입력하세요 (선택)` → 구체 예시("예: 제품명과 상세 설명이 일치하지 않습니다. 상세 설명을 수정한 뒤 다시 승인 요청해 주세요.")
- 독립 반려 모달: 안내 문구 추가("공급자가 확인할 반려/보완 사유를 입력해 주세요. 수정 후 다시 승인 요청할 수 있으므로, 보완할 내용을 구체적으로 작성하는 것이 좋습니다.") + placeholder 동일 개선.

**Admin (`AdminProductApprovalPage.tsx`)** 반려 모달: 동일 안내 문구 + placeholder 개선.

**사유 필수화:** WO §5.3 권장대로 **V1에서는 필수화하지 않음**(문구 개선만). 필수화는 후속 `WO-O4O-NETURE-PRODUCT-APPROVAL-REJECTION-REASON-REQUIRED-V1` 후보로 이연.

---

## 5. 알림 문구 변경 (5.4)

`notifySupplier()` (`offer-service-approval.service.ts`):
- 승인 경로: **무변경**.
- 반려 제목: `상품 승인 거절` → `상품 승인 반려`.
- 반려 메시지:
  - 사유 있음: `[{productName}] 승인 요청이 반려되었습니다. 사유: {reason} 제품 정보를 수정한 뒤 다시 승인 요청할 수 있습니다.`
  - 사유 없음: `[{productName}] 승인 요청이 반려되었습니다. 사유를 확인하고 제품 정보를 보완한 뒤 다시 승인 요청할 수 있습니다.`
- **targetUrl:** `notifications` 테이블 스키마에 별도 link 컬럼이 없어, **`metadata.targetUrl = '/supplier/products'`** 로 포함(비파괴적, route 설계 영향 없음). 라우트 구조 변경은 하지 않음(WO §5.4 가드 준수).

---

## 6. 상태 라벨 유지 / needs_info 미도입 (5.5)

- ✅ `rejected` 라벨(반려/반려됨) 유지. 보조 문구로만 "보완 후 재요청 가능" 전달.
- ✅ 새 status(`needs_info`/`needs_update`/`needs_revision`) 추가 없음.
- ✅ 승인 상태 전이/제품 수정 정책/재제출 backend 로직 변경 없음(P0 범위 불가침).

---

## 7. P0 재제출 플로우 전제 / 검증 상태 (WO §7)

- 선행 P0(`...RESUBMIT-AFTER-REJECT-FIX-V1`, commit `a02883d5b`)는 main에 **푸시 완료**되었으나, **배포 후 live smoke는 아직 미완(open)**.
- 본 P1은 순수 additive UX(문구/안내) 변경으로, P0 backend 로직에 의존하지 않으며 P0 동작을 변경하지 않는다. 따라서 P0 smoke 미완 상태에서 구현 가능(WO §7 — "P0 smoke 미완 시 CHECK에 명기").
- **권고 검증 순서(배포 후):** ① P0 재제출 동작 smoke(반려→수정→재요청→pending) → ② 본 P1 문구/안내 browser 확인. ①이 닫히기 전까지 공급자에게 "재요청 가능" 문구가 보이지만 실제 재요청은 P0 배포 후 보장됨.

---

## 8. 검증 결과

### 8.1 Typecheck — PASS
- **api-server** (`tsc --noEmit -p tsconfig.build.json`): 변경 파일 error 0. 유일 에러 `marketTrialController.ts(105,9)` 는 본 WO 무관 pre-existing(commit `df1f0fd26`).
- **web-neture** (`tsc --noEmit`): 변경 3파일 포함 전체 error 0.

### 8.2 Browser smoke — 배포 후 수행
배포 후 다음 확인(운영 데이터 전이는 정상 UI 플로우로만):
```text
[공급자] 반려 제품 drawer 열기 → 상단 반려 안내 배너(사유/fallback/재요청 안내) 표시
[공급자] 반려 사유 없는 제품 → fallback 문구 표시
[운영자] 반려 모달 → 보완 요청 문맥 안내 + 구체 placeholder 표시
[Admin] 반려 모달 → 동일 안내 표시
[알림] 반려 시 in_app 알림 문구에 "수정 후 다시 승인 요청" 포함 + metadata.targetUrl
[회귀] 승인/반려 동작·pending/approved UI·제품등록 gate·품목군 gate 무변경
```

---

## 9. 회귀 영향 점검

| 항목 | 결과 |
|------|------|
| 승인/반려 동작 | 무변경(문구만) |
| P0 재제출 플로우 | 무접촉(backend 로직 미변경) |
| pending/approved UI | 무변경 |
| 제품 등록 submit gate / 품목군 gate | 무변경 |
| 알림 insert 구조(컬럼/타입) | 무변경(metadata 값만 확장) |
| drawer 운영자 승인 모드 | 배너 가드(`!approvalActions`)로 영향 없음 |
| DB/migration | 없음 |

---

## 10. 중단 기준 점검 (모두 비해당)

| 중단 조건 | 해당? |
|----------|:----:|
| 공급자 화면에 reason 데이터 미전달 | No — `serviceApprovals[].reason` 이미 전달 |
| reason 표시 위해 API 응답 구조 대변경 필요 | No — 기존 필드 사용 |
| 알림 targetUrl 변경이 route 설계와 충돌 | No — metadata에만 포함, schema/route 무변경 |
| P0 미배포 검증 | 기록함(§7) — additive 변경으로 진행 적합 |
| 운영자/Admin이 서로 다른 approval API로 범위 확대 | No — 각 화면 문구만 수정, API 미변경 |
| 다른 세션 WIP 충돌 | No — 변경 4파일은 타 WIP와 무관 |

---

## 11. 완료 기준 대비

| 완료 기준 | 상태 |
|----------|:----:|
| 공급자 화면 반려 사유 명확 노출 | ✅ (drawer 상단 배너) |
| 공급자 화면 재요청 가능 안내 | ✅ |
| 운영자 반려 모달 문구 보완 문맥 개선 | ✅ |
| 반려 알림 문구 재요청 가능성 안내 | ✅ |
| needs_info status 추가 없음 | ✅ |
| DB/migration 없음 | ✅ |
| 반려 후 재제출 P0 회귀 없음 | ✅ (무접촉) |
| backend typecheck 통과 | ✅ |
| web-neture typecheck 통과 | ✅ |
| CHECK 문서 작성 | ✅ (본 문서) |
| path-specific commit/push | ⏳ 본 문서 직후 |
| browser smoke | ⏳ 배포 후(§8.2) |

---

## 12. 후속 후보

- `WO-O4O-NETURE-PRODUCT-APPROVAL-REJECTION-REASON-REQUIRED-V1` — 운영자 반려 사유 입력 필수화(V2).
- `WO-O4O-NETURE-OPERATOR-PRODUCT-APPROVAL-NEEDS-INFO-V2` — 최종 반려 vs 보완 요청 데이터 이원화(실제 운영 요구 확인 시에만).

---

*P1 UX. 상태 체계 불변 · 운영 복잡도 무증가. "반려" 단어 유지 + "보완 후 재요청 가능" 메시지를 화면·알림에서 명확화.*
