# CHECK-O4O-NETURE-PRODUCT-APPROVAL-RESUBMIT-AFTER-REJECT-FIX-V1

> **유형:** Implementation Check Report
> **작성일:** 2026-06-18
> **WO:** `WO-O4O-NETURE-PRODUCT-APPROVAL-RESUBMIT-AFTER-REJECT-FIX-V1`
> **선행 IR:** `IR-O4O-NETURE-OPERATOR-PRODUCT-APPROVAL-NEEDS-INFO-AUDIT-V1`
> **결과:** ✅ Backend P0 기능 결함 수정 완료. typecheck PASS(변경 파일 0 error). DB migration 없음. `needs_info` status 미도입. Live smoke = 배포 후 수행(운영 데이터 전이 필요 → 사전 승인/배포 전제).

---

## 1. 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `apps/api-server/src/modules/neture/services/offer-service-approval.service.ts` | `createPendingApprovals`: `ON CONFLICT DO NOTHING` → rejected 행만 `DO UPDATE`로 pending reset. 반환 타입에 `resubmittedServiceKeys` 추가 |
| `apps/api-server/src/modules/neture/services/offer.service.ts` | `submitForApproval`: reset 발생 시 `syncOfferFromServiceApprovals`로 offer 파생 상태(REJECTED→PENDING) 동기화 + reset 키도 `submitted` 집계 |

**DB migration: 없음.** enum/스키마/제약 변경 없음 (기존 `(offer_id, service_key)` UNIQUE 제약을 그대로 활용).

---

## 2. 기존 결함 요약

`offer_service_approvals` 에는 `(offer_id, service_key)` UNIQUE 제약이 있고, `createPendingApprovals` 가 `ON CONFLICT DO NOTHING` 이었다.

```text
승인요청 → 운영자 반려(row=rejected, 그대로 잔존)
→ 공급자 제품 수정(PATCH는 approval 상태 미변경)
→ 공급자 "승인 요청" 재클릭
→ INSERT 충돌 → DO NOTHING → 0건 → skipped: ALREADY_REQUESTED_OR_DECIDED
→ 재검토 불가 (버튼은 보이나 실제 동작 안 함)
```

rejected → pending 으로 되돌리는 코드 경로가 supplier 플로우에 부재했다(상세: IR §3.4 / §7).

---

## 3. Chosen Implementation 방식

**후보 A (ON CONFLICT DO UPDATE, rejected 한정) 채택.**

```sql
INSERT INTO offer_service_approvals (offer_id, service_key, approval_status, created_at, updated_at)
VALUES ...
ON CONFLICT (offer_id, service_key) DO UPDATE SET
  approval_status = 'pending',
  reason = NULL,
  decided_by = NULL,
  decided_at = NULL,
  updated_at = NOW()
WHERE offer_service_approvals.approval_status = 'rejected'   -- 가드: rejected만 reset
RETURNING service_key, (xmax = 0) AS inserted                 -- xmax=0 → 신규 INSERT
```

채택 이유:
- 단일 원자적(atomic) upsert로 insert + rejected reset 처리 → 동시성 안전(사전 SELECT race 없음).
- `WHERE ... = 'rejected'` 가드로 pending/approved 행은 no-op → 중복 요청/승인 취소 차단 유지.
- 기존 반환 구조(`insertedServiceKeys`)를 보존하고 `resubmittedServiceKeys` 만 추가 → 호출부 영향 최소.

**후보 B(사전 조회 후 분기) 미채택:** race window + 코드 길이 증가. 기능 동등하나 A가 더 안전·간결.

> `xmax = 0` 은 upsert에서 insert/update 구분에 쓰이는 표준 기법. **기능 정확성(어떤 키가 pending이 되는가)은 xmax에 의존하지 않으며**, xmax는 inserted vs resubmitted 라벨 집계에만 사용 → 위험 노출 최소.

---

## 4. 상태별 재요청 동작 (구현 결과)

| 기존 상태 | 충돌 처리 | RETURNING | 결과 |
|----------|----------|:---------:|------|
| row 없음 | INSERT | 포함(inserted=t) | pending 신규 생성, `submitted` |
| `pending` | DO UPDATE WHERE false → no-op | 미포함 | 변화 없음, `skipped: ALREADY_REQUESTED_OR_DECIDED` |
| `approved` | DO UPDATE WHERE false → no-op | 미포함 | 변화 없음(승인 유지), `skipped` |
| `rejected` | DO UPDATE → pending reset | 포함(inserted=f) | **pending reset, `submitted`(resubmit)** |

**판매 가능 상태로 바뀌지 않음:** rejected→pending 은 운영자 재검토 대기일 뿐, listings 재활성화/판매 전환 없음(§5 참조).

---

## 5. rejected → pending reset 시 초기화 필드 + offer sync

reset 시 초기화:
```text
approval_status = 'pending'
reason          = NULL
decided_by      = NULL
decided_at      = NULL
updated_at      = NOW()
```

offer 파생 상태 동기화 (`syncOfferFromServiceApprovals`, resubmit 발생 시에만 호출):
- 파생 규칙: `ANY approved → APPROVED` / `else some pending → PENDING` / `else REJECTED`.
- 전부 rejected였던 offer → 1건 reset로 derived=PENDING → `supplier_product_offers.approval_status = 'PENDING'` 갱신. **PENDING 분기는 offer 상태만 갱신, `organization_product_listings` 재활성화/`product_approvals` 변경 없음.**
- 이미 approved 키가 있어 offer가 APPROVED였던 경우 → derived 여전히 APPROVED → `changed=false` → **early-return(부작용 없음)**.

→ **판매 가능 상태는 운영자 approved 이후에만 가능**이라는 불변식 유지 확인.

---

## 6. submitForApproval 응답 영향

- reset(resubmit)된 service_key가 있는 offer → `result.submitted++` (WO §8 옵션 A: reset도 submitted로 집계 — 화면 영향 최소화).
- `resubmittedServiceKeys` 는 내부적으로 분리 수집되나, V1에서는 `submitted` 카운트에 합산. 별도 `resubmitted` 카운트 노출은 P1(UX) WO로 이연.
- pending/approved만 있는 offer → 기존과 동일하게 `skipped: ALREADY_REQUESTED_OR_DECIDED`.
- 응답 객체 형태(`{ submitted, skipped, errors }`) 불변 → 프론트 영향 없음.

---

## 7. 회귀 영향 점검

| 항목 | 결과 |
|------|------|
| 신규 제품 승인 요청 (`createOffer` line 1013 호출) | 신규 offer엔 충돌 행 없음 → INSERT 동작 동일, 영향 없음 |
| 이미 pending 중복 요청 | WHERE 가드로 no-op, skip 유지 |
| 이미 approved 재요청 | WHERE 가드로 no-op, 승인 유지 |
| 운영자 approve/reject | 미변경(별도 메서드) |
| `createPendingApprovals` 반환 타입 변경 | 호출부 2곳 — line 1013(반환 무시), line 493(신 필드 사용). 모두 정합 |
| 제품 등록 submit gate / 품목군 gate | 미변경 |

---

## 8. needs_info 미도입 / DB 무변경 확인

- ✅ `needs_info` status 추가 없음. 상태 3종(pending/approved/rejected) 유지.
- ✅ enum 확장 없음, DB migration 없음, 스키마/제약 변경 없음.
- ✅ 운영자 보완 요청 버튼/문구 개선 없음(P1로 분리).

---

## 9. 검증 결과

### 9.1 Typecheck
```
npx tsc --noEmit -p tsconfig.build.json
```
- 변경 파일(`offer.service.ts`, `offer-service-approval.service.ts`): **error 0건.**
- 전체 출력 중 유일 에러는 `src/controllers/market-trial/marketTrialController.ts(105,9)` — **본 변경과 무관한 pre-existing 에러**(최종 커밋 `df1f0fd26`, 본 WO 미접촉).

### 9.2 Live smoke — 배포 후 수행 (이연 사유 명시)
본 수정은 백엔드 로직 변경이며, 실제 전이(`반려→수정→재요청→pending`) 확인은 **(1) 배포된 빌드 (2) 운영 데이터 상태 전이**가 필요하다. 프로덕션 DB는 방화벽 차단 + 운영 데이터 변경은 사전 승인 대상이므로, 배포 후 smoke 전용 제품으로 아래 절차를 수행한다.

```text
1. 공급자(Neture)로 제품 승인 요청
2. 운영자로 해당 제품 반려(사유 입력)
3. 공급자로 제품 수정
4. 공급자로 승인 요청 재실행
5. 기대: 해당 service_key가 offer_service_approvals 에서 pending 으로 전환
        + supplier_product_offers.approval_status = PENDING
        + 운영자 승인 큐(/operator/product-approvals)에 '승인대기'로 재노출
        + organization_product_listings 는 비활성 유지(판매 가능 X)
6. 회귀: 이미 pending/approved 제품 재요청 → ALREADY_REQUESTED_OR_DECIDED 유지
```

> read-only SELECT 검증(`gcloud sql` 계열)은 배포 후 Claude Code가 직접 수행 가능(CLAUDE.md §0). 상태 변경(reject/approve)은 운영자 UI 통한 정상 플로우로만 수행.

---

## 10. 중단 기준 점검 (모두 비해당 — 진행 적합)

| 중단 조건 | 해당? |
|----------|:----:|
| offer_service_approvals 외 다른 SSOT로 rejected reset 부족 | No — SSOT는 offer_service_approvals 단일, offer는 파생 |
| rejected→pending 이 legacy `product_approvals` 와 충돌 | No — PENDING 파생 분기는 product_approvals 미변경 |
| sync가 pending 상태를 제대로 표현 못함 | No — PENDING 파생 분기 정상 |
| 상태가 service_key별이 아닌 offer 전체 단위로 강결합 | No — service_key별 row, offer는 파생 |
| migration 없이 안전 수정 어려움 | No — 기존 제약 활용, migration 불필요 |
| 재요청이 알림/목록/권한과 강충돌 | No — 알림 미변경, 목록은 osa 기반 |
| 다른 세션 WIP 충돌 | No — 변경 2파일은 WIP(`RegisterModal.tsx`)와 무관 |

---

## 11. 완료 기준 대비

| 완료 기준 | 상태 |
|----------|:----:|
| 반려 제품 수정 후 재요청 가능 | ✅ (코드 경로 복구) |
| rejected approval row → pending reset | ✅ |
| reason/decided_by/decided_at 초기화 | ✅ |
| pending/approved 중복 요청 차단 유지 | ✅ (WHERE 가드) |
| 신규 승인 요청 기존 동작 유지 | ✅ |
| 판매 가능은 approved 이후에만 | ✅ (listings 미변경) |
| needs_info status 추가 없음 | ✅ |
| DB migration 없음 | ✅ |
| backend typecheck 통과 | ✅ (변경 파일 0 error) |
| CHECK 문서 작성 | ✅ (본 문서) |
| path-specific commit/push | ⏳ 본 문서 직후 수행 |
| live smoke | ⏳ 배포 후 수행(§9.2) |

---

*Backend P0 fix. Frontend 문구/알림 개선(P1)은 `WO-O4O-NETURE-PRODUCT-APPROVAL-REJECTION-COPY-AND-RESUBMIT-UX-V1` 로 분리.*
