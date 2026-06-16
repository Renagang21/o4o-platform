# IR-O4O-SELLER-RECRUITMENT-APPROVAL-CANCEL-CONTRACT-TERMINATION-AUDIT-V1

> **유형**: Investigation (read-only) — 승인된 판매자의 참여 해지(승인 취소/계약 해지) 사전 조사. 코드/DB/route/UI **무변경**.
> **결론(요약): 기존 `terminateContract` 는 contractStatus 만 바꾸고 C 브리지(allowedSellerIds/OPL)를 되돌리지 않음 → 해지해도 판매자가 계속 조달 가능(핵심 GAP).** 참여 해지를 실효화하려면 ① **allowedSellerIds 제거**(안전, 주문 자동 차단) + ② **seller_recruitment OPL 비활성화**(안전, 이력 무손상) + ③ contract TERMINATED 가 함께 일어나야 함. **RBAC 'partner' role 은 글로벌(유저당 1개 active) → 단건 해지로 회수 시 같은 판매자의 다른 활성 계약까지 깨짐 → v1 에서 회수 비권장(또는 "다른 active 계약 0" 가드).** application status enum 은 pending/approved/rejected 뿐 → 참여 해지 상태는 **contract.contractStatus 로 파생**(enum migration 회피 권장). **승인 취소 vs 계약 해지는 단일 "참여 해지(participation termination)"로 통합** 권장(공급자 UI 용어 = "참여 해지").
> 선행: `WO-...-C-BRIDGE-BACKEND-V1`(8e5402e81) · `WO-...-REOPEN-ACTION-V1`(758c79d83) — 2026-06-16

---

## 1. 승인 처리 현재 구조 (재확인)

`approvePartnerApplication`(partner-contract.service.ts:348~):
- (txn) `application.status=APPROVED` + `NetureSellerPartnerContract`(ACTIVE) 생성 + 대시보드 아이템.
- (txn 밖) ServiceMembership active + RBAC `assignRole('partner')`.
- (txn 밖, best-effort) `bridgeRecruitmentToOrderable`(504~): offer 해소 → 의약품 gate → **allowed_seller_ids += partner userId**(array_append, idempotent) → **OPL INSERT**(source_type='seller_recruitment', is_active=true, ON CONFLICT DO NOTHING).
- idempotency: 재승인 status≠PENDING 차단.

## 2. application status 모델

- `ApplicationStatus` = `pending`/`approved`/`rejected` **3개뿐**. canceled/revoked/terminated 없음. 상태 이력 테이블 없음. decidedAt/decidedBy/reason 보유.
- **승인 취소 ≠ rejected**(rejected=최초 반려). reject 재사용 시 의미 왜곡.
- → **권장: application enum 변경(migration) 회피.** 참여 해지 상태는 **contract.contractStatus=TERMINATED 로 파생 표시**(application-review GET 에 contract LEFT JOIN). 필요 시 후속에서 `canceled` 추가(ALTER TYPE ADD VALUE, additive)로 분리 가능하나 v1 불요.

## 3. 계약 구조 — 기존 terminateContract 존재 (핵심)

`NetureSellerPartnerContract`: sellerId/partnerId/recruitmentId/applicationId · `contractStatus`(ACTIVE/TERMINATED/EXPIRED) · terminatedBy(SELLER/PARTNER) · endedAt.
- **`terminateContract(contractId, actorId, actorType)`(609~) 이미 존재** + 노출: `POST /supplier/contracts/:id/terminate`(requireActiveSupplier) · `POST /partner/contracts/:id/terminate`(requireActivePartner). 목록 `GET /supplier|partner/contracts`.
- **그러나 terminate 는 `contractStatus=TERMINATED` + endedAt 만 설정.** allowedSellerIds/OPL/RBAC/application **미변경** → **해지해도 조달 노출/주문 가능 유지(GAP).** (C 브리지가 terminate 보다 나중 WO 라 미반영.)
- 프론트: 공급자 계약 관리 UI 미확인(엔드포인트만). 신청자 심사 화면(application 단위)에서 진입이 자연.

## 4. RBAC 영향 (⚠️ 회수 위험)

- `roleAssignmentService.assignRole('partner')` → `RoleAssignment`(role_assignments). **UNIQUE(userId, role, isActive) → 유저당 active 'partner' 1개(글로벌/서비스 스코프, per-contract 아님).**
- `removeRole`(191~) → isActive=false. **단건 해지로 호출 시 같은 판매자의 다른 활성 계약 권한까지 즉시 박탈.**
- → **v1 권장: RBAC 회수 안 함**('partner' role 은 대시보드 접근권일 뿐 조달 gate 아님 — allowedSellerIds 가 실제 gate). 또는 "해당 판매자의 다른 ACTIVE 계약 0" 가드 후에만 removeRole. **조달 차단은 allowedSellerIds 제거로 충분.**

## 5. allowedSellerIds 제거 (✅ 안전)

- `allowed_seller_ids`(text[], USER id). 제거 = `array_remove(allowed_seller_ids, $partnerUserId)` — idempotent.
- 조달 노출 차단: `getAvailableSupplyProducts`(seller.service.ts:78, PRIVATE → `userId=ANY(allowed_seller_ids)`) + **주문 시 재검증**(`neture-b2b-cart-checkout.service.ts:216` buyerId ∈ allowed_seller_ids) → 제거 시 **discovery + 신규 주문 모두 차단**.
- 다중 모집 오염 없음: `recruitment UNIQUE(productId, sellerId)` → 한 offer 에 같은 partner 가 다른 모집으로 중복 추가 불가 → `array_remove` 가 타 계약 권한 오제거 안 함.

## 6. OPL 처리 (✅ 비활성화 권장)

- C 브리지 OPL: `source_type='seller_recruitment'`, is_active=true, unique(org, service_key, offer_id). source_type 으로 식별 가능.
- **후보 A(유지) / B(is_active=false) / C(삭제).** → **권장 B**: `is_active=false`(매장 store listing 노출 차단, row/이력 보존, 재승인 시 재활성 idempotent). **삭제(C) 비권장**(이력 손상). A 만으로는 매장 listing 잔존.
- 이력 무손상: 기존 주문은 offer/productId 참조, OPL is_active 변경이 과거 주문 조회 미파괴.

## 7. 기존 주문 영향

- 주문 생성은 allowed_seller_ids 재검증(checkout:216) → 제거 후 **신규 주문 자동 차단**. **완료 주문/이력 안전**(독립 참조).
- → **진행 중 주문 때문에 해지를 hard-block 할 필요 없음**(신규만 막힘, 과거 보존). v1: 차단 가드 불요(선택적으로 "최근 주문 존재" 경고만).

## 8. 승인 취소 vs 계약 해지 개념

- 데이터 상 둘 다 **동일 cleanup**(contract TERMINATED + allowedSellerIds 제거 + OPL 비활성화)으로 귀결 → **단일 "참여 해지(participation termination)"로 통합** 권장.
- 공급자 UI 용어: **"참여 해지"**(법적 함의 약함, 안전). "계약 해지"는 contract entity 가 강하나 UX 는 참여 해지가 적절. 운영자 개입 불요(공급자=모집 주체가 직접). 판매자 통보/알림은 후속(선택).

## 9. 후속 구현 WO 제안

```text
WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1 (backend+UX 통합, 범위 작음)
 [backend]
 - approved application → contract(by applicationId) 해소
 - terminateRecruitmentParticipation(applicationId, sellerUserId):
     ① 소유권(contract.sellerId === sellerUserId)
     ② contract.contractStatus = TERMINATED (+endedAt) — 기존 terminateContract 로직 재사용/확장
     ③ offer.allowed_seller_ids 에서 partner userId 제거 (array_remove, idempotent)
     ④ source_type='seller_recruitment' OPL is_active=false (해당 org+offer)
     ⑤ RBAC 회수 안 함 (글로벌 role — v1)
     ⑥ application.status 변경 안 함 (contract 파생 표시)
     - best-effort/소유권 외 안전, idempotent
 - application-review GET 에 contract status LEFT JOIN (참여 상태 파생 표시)
 [UX]
 - 공급자 신청자 상세: approved 행에 "참여 해지" 버튼(confirm) + 해지 후 상태 표시
 - 문구: "참여 해지하면 해당 판매자는 더 이상 이 제품을 주문할 수 없습니다. 기존 주문 이력은 유지됩니다."

제외: RBAC 회수(글로벌 위험) / 계약 해지 법적 처리 / 정산·환불 / 진행중 주문 hard-block / application enum 변경 / 가격.
```

## 10. 위험 요소

```text
[위험 A] RBAC 'partner' 글로벌 → 단건 회수 시 타 계약 파손. v1 회수 금지(또는 active 계약 0 가드).
[위험 B] terminateContract 가 cleanup 미수행 → 기존 엔드포인트만 쓰면 "해지했는데 계속 주문 가능" 잔존. 반드시 allowedSellerIds/OPL cleanup 동반.
[위험 C] application↔contract 매핑 — contract.applicationId 로 해소(존재). 계약 미존재(브리지 실패 등) 시 처리: allowedSellerIds/OPL 만 정리 + 경고.
[위험 D] OPL 삭제(C안) 선택 시 이력 손상 → 비활성화(B) 고수.
[관찰] application status 가 'approved' 로 남아 UI 혼동 가능 → contract 파생 상태 표시로 해소.
```

## 11. 결론

- **참여 해지의 핵심은 "contractStatus 변경"이 아니라 "조달 노출 차단"**(allowedSellerIds 제거)이며, 기존 `terminateContract` 는 이를 빠뜨려 GAP. 후속 WO 는 terminate + allowedSellerIds 제거 + OPL 비활성화를 **한 묶음**으로 한다.
- **RBAC 회수는 글로벌 role 위험으로 v1 제외**(조달 차단은 allowedSellerIds 로 달성). 기존 주문은 자동 차단·이력 보존이라 hard-block 불요.
- 승인 취소/계약 해지는 **단일 "참여 해지"로 통합**, 공급자 신청자 상세에서 approved 행 액션. application enum/migration 불요(contract 파생 표시).
- **권고**: backend+UX 1 WO(`WO-...-PARTICIPATION-TERMINATION-V1`)로 충분(범위 작음). RBAC 회수·정산·통보는 별도 후속. 본 조사 범위는 확인까지 — 코드 무변경.

---

*Date: 2026-06-16 · read-only IR · 코드/DB 무변경 · 기존 terminateContract=contractStatus만(C 브리지 미반영 GAP). 참여 해지=terminate+allowedSellerIds 제거(안전, 주문 자동차단)+OPL is_active=false(안전). RBAC 글로벌→v1 회수 금지. application enum 불요(contract 파생). 단일 "참여 해지" 통합, backend+UX 1 WO 권장.*
