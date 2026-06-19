# IR-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0.
> **대상:** Neture 판매자 모집(seller recruitment) "모집 대상 서비스" 단일→복수 전환 가능성 + 서비스별 승인 분리 데이터 모델.
> **핵심 결론: 현재 recruitment ↔ service = 단일 `service_id` 컬럼(1 모집 = 1 서비스), 노출 승인도 단일 `exposure_status`. "서비스별 승인 분리"(KPA 승인·GP 반려 독립) 요구를 충족하는 유일 안전안 = 안 A(선택 서비스 수만큼 recruitment row 생성, serviceId 단일 유지).** 안 C(serviceKeys 배열 1 row)는 단일 exposure_status 라 서비스별 승인 분리 불가 → 부적합. 안 B(조인테이블)는 offer_service_approvals 식 재설계라 과대. 안 A 는 현 구조 거의 무변경(UNIQUE 제약 1건 확장 + 프론트 multi-select + 백엔드 serviceKeys[] 루프 생성).
> 선행: WO-O4O-SELLER-RECRUITMENT-EXPOSURE-* (노출 승인) · partner recruitment 계열

---

## 1. 목적

판매자 모집 생성의 "모집 대상 서비스"를 단일→복수로 바꿀 때, 단순 UI 문제가 아니라 데이터 모델·서비스별 승인 분리·다운스트림(신청/allowedSellerIds/알림)에 미치는 영향을 read-only 로 확정하고 안전한 구현안을 정한다.

## 2. 현재 데이터 모델 (단일 serviceId — 결정적)

- 엔티티 `NeturePartnerRecruitment.entity.ts:75-76`: `@Column({name:'service_id'}) serviceId: string` — **스칼라 단일 컬럼**(배열/FK 아님).
- 생성 마이그레이션 `2026020100001-CreatePartnerRecruitmentTables.ts:60`: `service_id varchar isNullable`. UNIQUE `(product_id, seller_id)` (service_id 미포함, line 73).
- 생성 서비스 `partner-contract.service.ts:597`: row 당 `serviceId: serviceKey` 1개 저장.
- → **1 recruitment = 1 service.** 같은 상품을 여러 서비스 모집하려면 row 다중 필요.

## 3. 프론트 현황 (단일 select)

- `RecruitmentCreateModal.tsx:28` `const [serviceKey, setServiceKey] = useState('')` — 단수 state, `<select>`(82-91) 단일.
- `SERVICE_OPTIONS`(14-19): glycopharm/kpa-society(pharmacy:true) / k-cosmetics / neture. 약국 제한은 **백엔드 gate**(의약품·규제 → 약국 서비스만), 프론트는 전체 노출 + 주석으로 위임.
- API `supplier.ts:1419` `supplierRecruitmentApi.create({masterId, serviceKey, ...})` → `POST /neture/partner/recruitments`. payload **serviceKey 단수**.
- 목록/상세(`SupplierRecruitmentsPage.tsx:120`, `SupplierRecruitmentDetailPage.tsx:165`): `serviceId` 단수 표시. 타입 `SupplierRecruitment.serviceId: string`.

## 4. 서비스별 승인 분리 — 현재 불가 (핵심)

- 노출 승인 `NeturePartnerRecruitment.entity.ts:89-104`: `exposure_status`(pending/approved/rejected) + `exposure_reviewed_at/by/note` **단일 세트**. → 한 recruitment 의 승인 상태는 1개.
- 신청 검증 `partner-contract.service.ts:625`: `recruitment.exposureStatus !== APPROVED → RECRUITMENT_NOT_EXPOSED`. 단일 status 전제.
- 노출 승인 proxy `service-recruitment-exposure-proxy.controller.ts:69`: `recruitment.serviceId !== serviceKey → SERVICE_MISMATCH`. service 고정 1개.
- → **현 구조에서 서비스별 독립 승인은 row 단위로만 가능**(한 row = 한 service = 한 status). 사용자 요구("KPA 승인 / GP 대기·반려 독립")는 row 분리로만 충족.

## 5. 다운스트림 의존성 (전부 단일 serviceId 전제)

| 영역 | 위치 | 전제 |
|------|------|------|
| 신청(apply) | `partner-contract.service.ts:614-652` | recruitment 단일 exposureStatus=APPROVED |
| allowedSellerIds | `SupplierProductOffer.entity.ts:88` + `partner-contract.service.ts:818` | **offer 레벨 배열**(recruitment service 무관, 무변경) |
| 알림 targetUrl | `partner-contract.service.ts:37-48,881` | `recruitment.serviceId` 기준 단일 경로 |
| 대시보드 | `NeturePartnerDashboardItem.serviceId` | serviceId 컬럼 보유(무변경) |
| 계약 | `NetureSellerPartnerContract.recruitmentId`(FK) | recruitment_id 참조(무변경) |

→ allowedSellerIds/계약은 offer/recruitment_id 기준이라 row 다중화에 영향 없음. 신청·알림·노출승인은 단일 serviceId row 기준으로 이미 동작 → **안 A 와 정합**.

## 6. 구현안 비교

| 안 | 구조 | 서비스별 승인 분리 | 현 구조 호환 | 판정 |
|----|------|:---:|:---:|------|
| **A** | 선택 서비스 수만큼 recruitment row 생성(serviceId 단일 유지) | ✅ (row별 exposure_status 독립) | ✅ 거의 무변경 | **권장** |
| B | recruitment 1 row + (recruitment_id, service_key) 조인테이블 (offer_service_approvals 식) | ✅ | ❌ 재설계(노출승인/신청/알림 전면 수정) | 과대 |
| C | recruitment 1 row + `service_keys` text[] | ❌ **단일 exposure_status → 서비스별 분리 불가**, targetUrl/신청 검증 충돌 | ⚠️ | **부적합** |

**→ 안 A 확정 권장.** 사용자 필수정책("여러 서비스 모집 + 서비스별 승인 독립 + 한 서비스 반려가 타 서비스 무영향")을 충족하면서 다운스트림 무변경.

## 7. 안 A 구현 시 변경 지점 (후속 WO 범위)

1. **DB(소):** UNIQUE `(product_id, seller_id)` → `(product_id, seller_id, service_id)` 확장 마이그레이션. (같은 상품×판매자라도 서비스별 1 row 허용)
2. **백엔드:** 생성 API 가 `serviceKeys: string[]` 수용 → 루프로 service당 row 생성(기존 `serviceKey` 단수도 호환 유지). 규제/약국 gate 는 각 serviceKey 별 적용(기존 로직 재사용). 부분 성공/중복(ON CONFLICT) 처리.
3. **프론트:** `RecruitmentCreateModal` 단일 select → 복수 선택(checkbox/멀티셀렉트), 최소 1개 강제, payload `serviceKeys`. 규제 상품 시 약국 서비스만 선택 가능하도록 옵션 필터(현재 백엔드 gate 를 프론트도 반영 권장).
4. **프론트 목록/상세:** 같은 상품의 다중 recruitment row 를 **상품 단위로 그룹 표시**(서비스별 승인 상태 뱃지 N개) 고려 — 단순 N행 나열도 가능하나 UX 위해 그룹 권장.
5. 신청/allowedSellerIds/알림/계약 — **무변경**(각 service row 기준 기존 동작).

## 8. 서비스별 승인 분리 보장 (안 A)

- 상품 P 를 KPA+GP 모집 → recruitment row 2개(serviceId=kpa-society / glycopharm), 각 `exposure_status` 독립.
- 운영자 노출 승인: 서비스별 proxy(`service-recruitment-exposure-proxy`)가 해당 service row 만 승인/반려 → **KPA approved / GP rejected 독립 성립**. SERVICE_MISMATCH 가드도 그대로 유효.
- 한 service 반려가 다른 service row 에 영향 없음(별 row). 모집 종료/재개도 row 별 `status` 로 분리.

## 9. 후속 WO + 수용 기준

`WO-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-CREATE-V1` (안 A)
- 수용: ① 모달 복수 서비스 선택 ② 미선택 시 생성 불가 ③ 규제 상품 약국 서비스 제한 유지 ④ KPA+GP 동시 생성(=row 2개) ⑤ 서비스별 노출승인/신청/알림 독립 동작 ⑥ 기존 단일 모집 정상 표시 ⑦ typecheck PASS ⑧ (가능 시) 브라우저 복수 생성 smoke.
- 순서: DB UNIQUE 확장 → 백엔드 serviceKeys[] 루프 생성 → 프론트 multi-select → 목록/상세 그룹 표시 → 검증.

## 10. 비범위 / 준수

- 본 IR 코드/DB/UI 변경 0. 노출 승인 정책 자체·offer 2축 모델·event-offer·allowedSellerIds 의미 변경 없음.
- 동시 세션 WIP(`MarketTrialApprovalDetailPage.tsx` 등) 미접촉.

```
✅ read-only · 산출물 = 본 문서 1개(path-specific)
```

---

*read-only · recruitment↔service=단일 service_id(엔티티:75 / migration:60) · 노출 승인 단일 exposure_status(엔티티:89) → 서비스별 분리는 row 단위만 가능 · 단일 select(RecruitmentCreateModal:28) · 생성 payload serviceKey 단수(supplier.ts:1419) · 권장=안 A(service당 row, UNIQUE(product,seller,service) 확장+serviceKeys[] 루프+multi-select), 안 C(배열 1row)=exposure_status 단일이라 서비스별 승인 분리 불가 부적합, 안 B=과대 · 신청/allowedSellerIds/알림/계약 무변경 · 후속 WO-...-MULTI-SERVICE-CREATE-V1.*
