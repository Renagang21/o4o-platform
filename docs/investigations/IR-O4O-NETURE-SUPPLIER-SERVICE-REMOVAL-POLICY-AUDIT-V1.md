# IR-O4O-NETURE-SUPPLIER-SERVICE-REMOVAL-POLICY-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0. (후보 D `...-DISTRIBUTION-MANAGEMENT-FLOW-V1`의 첫 조사 항목)
> **대상:** SERVICE 공급 대상(serviceKey) **제거 시** offer_service_approvals / catalog 노출 / listing 거동 + 안전한 제거 정책 설계.
> **핵심 결론: catalog 노출은 `offer.service_keys` 배열이 아니라 `offer_service_approvals`의 approved row 기준이다. 따라서 "service_keys에서만 제거하고 approval row는 이력 보존"하면 노출이 안 빠진다(approved row가 남아 계속 노출). 깨끗한 제거에는 approval row 상태를 approved에서 빼야 함 — 현재 status는 pending/approved/rejected뿐('cancelled' 없음). 또한 현재 updateProduct에 serviceKeys 파라미터가 없어 제거 경로 자체가 부재(orphan 위험). 권장: 'cancelled' status 추가 + removeServiceKeys 트랜잭션(service_keys 제거 + approval→cancelled + listing 비활성 + offer 파생 재동기화).**
> 선행: CHECK-O4O-SERVICE-OFFER-HUB-EXPOSURE-APPROVAL-GATE-FIX-V1(노출 게이트 정책축) · IR-...-PRODUCT-INFO-AND-DISTRIBUTION-UX-AUDIT-V1 — 2026-06-19

---

## 1. serviceKeys ↔ offer_service_approvals 관계

- `SupplierProductOffer.service_keys`(text[], default `{}`): 공급자가 선택한 서비스 목록.
- `OfferServiceApproval`(offer_service_approvals): `(offer_id, service_key)` **unique**, `approval_status`(pending/approved/rejected), decided_by/at, reason. offer당 service_key별 1 row. FK CASCADE(offer 삭제 시 row 삭제).
- **승인 SSOT = offer_service_approvals**(WO-NETURE-APPROVAL-SYSTEM-NORMALIZATION-V1). offer.approval_status는 파생.

## 2. 현재 추가(ADD) 흐름

- `createSupplierOffer`: serviceKeys 입력(neture/glucoseview 필터) → `offer.service_keys` 저장 + `createPendingApprovals`(eligible key만).
- `submitForApproval`: 저장된 service_keys 기준 `createPendingApprovals` → (offer_id, service_key) **pending row 생성**. ON CONFLICT: **rejected→pending 리셋**, pending/approved는 skip.
- `updateSupplierOffer`(PATCH): **serviceKeys 파라미터 없음**(확인). → 생성 후 service_keys 변경 경로 부재. drawer는 ProductForm + auto submitForApproval로 추가만 우회(제거는 미지원).

## 3. 현재 제거(REMOVE) 흐름 — **부재 + orphan 위험**

- **service_key 제거/approval row 비활성 코드 없음**(removeServiceKey/deleteApproval/deactivate 검색 0).
- 즉 service_keys에서 키를 빼는 정식 경로도 없고, 뺀다 해도 **offer_service_approvals의 approved row가 그대로 남음**(unique 제약으로 재생성도 막힘).
- → 제거 기능을 만들면서 approval row를 손대지 않으면 **orphan approved row** 발생.

## 4. ★ catalog 노출은 service_keys가 아니라 approval rows 기준 (결정적)

HUB catalog 게이트(`pharmacy-products.controller` /catalog, CHECK-...-EXPOSURE-GATE):
```sql
AND ( spo.distribution_type='PUBLIC'
  OR EXISTS (SELECT 1 FROM offer_service_approvals osa
             WHERE osa.offer_id=spo.id AND osa.service_key=$N AND osa.approval_status='approved') )
```
- **`spo.service_keys` 배열은 게이트에서 읽지 않음.** 노출 판정은 **approved approval row** 존재 여부.
- auto-listing(`auto-listing.utils`)도 `JOIN offer_service_approvals ... approval_status='approved'`로 생성 — service_keys 배열 미참조.

→ **결론: service_keys에서만 제거하고 approval row를 approved로 보존하면 → 해당 서비스 catalog에 계속 노출된다.** 노출을 멈추려면 **approval row를 approved에서 빼야** 함.

## 5. status 모델 — 'cancelled' 부재

- offer_service_approvals.approval_status: **pending / approved / rejected** 만 사용. 'cancelled'/'withdrawn'/'inactive' **없음**.
- 전이: pending→approved/rejected, rejected→pending(재제출). **revoke/cancel 전이 없음.**

## 6. 사용자 제안 정책 대비 점검 (갭)

| 제안 | 점검 결과 |
|------|------|
| service_keys에서 제거 | ✅ 가능(단 updateProduct에 파라미터 신설 필요) |
| approval row 삭제하지 않고 **이력 보존** | ⚠️ 보존만 하면 **approved로 남아 catalog 계속 노출** → 노출 제외와 양립 불가 |
| catalog 노출 제외 | ❗ service_keys 제거로는 **안 빠짐**. approval row를 approved에서 빼야(상태 변경/비활성/삭제) |
| 재추가 시 rejected만 pending reset, approved row 재검토 | ⚠️ unique 제약 + 'cancelled' 도입 시 cancelled→pending 재전이 규칙 필요 |

→ **이력 보존 + 노출 제외를 동시에 만족하려면 'cancelled'(또는 inactive) status 신설이 사실상 필수.** 단순 보존/단순 service_keys 제거로는 정합 불가.

## 7. 권장 SERVICE 제거 설계 (D 구현 기준)

**옵션 A (권장) — 'cancelled' status 추가(이력 보존 + 노출 제외 동시 충족):**
1. `removeServiceKeys` 엔드포인트(예: `PATCH /supplier/products/:id/service-keys`, ACTIVE 공급자) — 트랜잭션:
   - service_keys 배열에서 제거.
   - 해당 (offer_id, service_key) approval row **status='cancelled'**(reason='공급자 제거', decided_at=now). row 보존(이력).
   - 관련 organization_product_listings **is_active=false**(stale 판매 채널 차단).
   - offer 파생 재동기화(남은 approved 있으면 APPROVED 유지, 전부 cancelled/rejected면 PENDING).
2. catalog 게이트는 **무변경**(이미 `approval_status='approved'`만 통과 → cancelled 자연 제외).
3. 재추가: cancelled→pending 재전이 허용(createPendingApprovals ON CONFLICT에 cancelled 포함). approved였던 이력은 cancelled로 남아 재심사 대상.
4. migration: approval_status에 'cancelled' 허용(현재 VARCHAR라 enum 제약 없음 — 코드/문서 정렬 + 게이트/카운트 쿼리 'cancelled' 제외 점검).

**옵션 B — row DELETE(하드 제거):** 이력 미보존. unique 제약 회피되나 감사/재검토 추적 불가 → 비권장.

**공통 주의:**
- 노출 정합의 SSOT는 **approval row 상태**임을 D 구현/문구에 명시(service_keys는 "선택 의도", 노출은 approval).
- listings 비활성 누락 시 stale 노출/주문 위험.
- approved였던 서비스 재추가 시 자동 재승인 금지(재심사 = pending).
- 가격은 V1 price_general 단일 유지(서비스별 가격 미지원, 별개).

## 8. D 결정 6항목 답(조사 반영)

1. PUBLIC 전환 즉시 노출: ✅(게이트 PUBLIC 예외) → 변경 시 "즉시 전체 공개" 확인 UI 필요.
2. SERVICE 추가 → pending 생성: ✅ 기존 createPendingApprovals.
3. **SERVICE 제거 정책: 'cancelled' status 추가 권장**(§7 옵션A). 단순 보존 불가(§4).
4. serviceKeys PATCH 정식 API: **필요**(현재 부재, drawer 우회). add/remove 포함 정식화.
5. drawer auto submitForApproval 우회 제거: 정식 API 도입 시 함께 정리 권장.
6. 가격 V1 price_general 단일: ✅ 유지.

## 9. 비범위 (본 IR)

- 실제 removeServiceKeys/엔드포인트/migration/status 추가/게이트 변경 — 미수행(조사만).

## 10. 준수 확인

```
✅ read-only — 코드/DB/API/UI 변경 0
✅ 정적 분석만, 산출물 = 본 문서 1개(path-specific)
```

---

## 결론

SERVICE 제거 정책의 핵심은 **"catalog 노출이 service_keys가 아니라 offer_service_approvals approved row 기준"**이라는 점이다. 따라서 사용자 제안의 "approval row 이력 보존"과 "노출 제외"를 동시에 만족하려면 단순 보존으로는 불가하고, **'cancelled' status 신설 + removeServiceKeys 트랜잭션(service_keys 제거 + approval→cancelled + listing 비활성 + offer 재동기화)**이 안전한 설계다. catalog 게이트는 그대로(approved만)면 cancelled가 자연 제외된다. 현재 serviceKeys 변경 정식 API가 없으므로 D는 **add/remove serviceKeys 정식 API + cancelled status + drawer 우회 정리**를 범위로 한다(backend 포함 중규모, migration 가능).

*read-only · catalog 노출=offer_service_approvals approved 기준(service_keys 아님) · 현재 service_keys 제거 경로 부재 + 제거 시 orphan approved row 위험 · status=pending/approved/rejected('cancelled' 없음) · 사용자 제안 "보존만" 으로는 노출 제외 불가 → 'cancelled' 신설 권장(보존+노출제외 동시) · D 범위=serviceKeys add/remove 정식 API + cancelled + listing 비활성 + offer 재동기화.*
