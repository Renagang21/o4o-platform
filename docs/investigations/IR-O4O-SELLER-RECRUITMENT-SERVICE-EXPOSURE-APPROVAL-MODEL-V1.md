# IR-O4O-SELLER-RECRUITMENT-SERVICE-EXPOSURE-APPROVAL-MODEL-V1

> **유형:** read-only 조사 IR. 코드/entity/migration/API 변경 0.
> **목적:** 판매자 모집 제품의 "서비스 노출 승인" 모델 정의 — `RecruitmentStatus(RECRUITING/CLOSED)`에 노출 승인 의미를 섞을지, 분리할지 판단.
> **결론(요약): RecruitmentStatus 는 모집 운영 상태로 보존하고, 노출 승인 상태는 분리한다. serviceId 가 단일값이므로 B안(NeturePartnerRecruitment 에 exposureStatus + audit 필드)을 권장(가장 린). 멀티서비스 모집이 로드맵에 들어오면 C안(별도 entity)으로 승격. A안(RecruitmentStatus 확장)·D안(OfferServiceApproval 재사용)은 비권장.**
> 선행: WO-...-MENU-REMODEL-V1(4d6e4571b/573f98bbd) — Date: 2026-06-16

> ## ✅ 결정 (확정, 2026-06-16)
> **B안 확정** (사용자 승인). 별도 RecruitmentExposure entity(C안)는 보류 — 현재 1 모집 = 1 serviceId 구조라 과설계.
> - `RecruitmentStatus(RECRUITING/CLOSED)` = 모집 운영 상태 **유지(불변)**.
> - 신규 `exposureStatus(PENDING/APPROVED/REJECTED)` + 감사필드를 `NeturePartnerRecruitment` 에 추가.
> - 기존 RECRUITING 모집 → **APPROVED backfill**(동작 보존). 신규 모집 → **PENDING** 생성.
> - browse(`/partner/recruitments`) → `exposureStatus=APPROVED` **+ serviceKey scope** 적용. apply → 미승인 모집 신청 **방어적 차단**.
> - **후속 backend WO 필수 2건: ① exposureStatus 필드/migration/backfill ② browse serviceKey scope**(둘째가 없으면 노출 승인 의미가 약해짐).
> - 후속 순서: ① `WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1` → ② `WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1` → ③ `WO-O4O-SELLER-RECRUITMENT-EXPOSURE-SUPPLIER-STATUS-V1`.

---

## 1. 현재 Recruitment 모델 (조사 1차)

- entity: [NeturePartnerRecruitment.entity.ts](../../apps/api-server/src/modules/neture/entities/NeturePartnerRecruitment.entity.ts). 필드: productId(=ProductMaster id), productName, sellerId(공급자 user id), sellerName, **serviceId(단일, nullable)**, serviceName, consumerPrice, commissionRate, shopUrl, imageUrl, status. `@Unique(productId, sellerId)` — 제품×공급자 1 모집.
- `RecruitmentStatus = RECRUITING | CLOSED` (네이티브 enum). 생성 기본값 RECRUITING.
- **status 의미 = 모집 운영 상태**(신규 신청 수락 여부). close→CLOSED(신규 신청 차단), reopen→RECRUITING. **노출 승인 의미 없음**(섞여 있지 않음).
- 신청 생성 검증(`createPartnerApplication`): `status !== RECRUITING` 이면 `RECRUITMENT_CLOSED`. 즉 운영 상태만 검증, 노출 승인 검증 없음.
- **노출 승인 상태로 재사용 가능 여부: 불가.** RECRUITING/CLOSED 에 PENDING/REJECTED 를 섞으면 close/reopen 의미가 깨짐(A안 비권장 근거).

## 2. 현재 모집 노출 경로 (조사 2차)

- 신규 모델 목록 API: **`GET /partner/recruitments` — public(no auth), serviceKey 필터 없음, status 필터만 옵션**(`getPartnerRecruitments`). → **모집 생성 즉시 전역 노출**(운영자 승인 게이트 없음).
- 신규 모델 신청 API: `POST /partner/applications`(requireAuth) → `createPartnerApplication` = status RECRUITING 만 검증.
- 신규 모델 browse+apply UI: **`PartnershipRequestListPage`(web-neture `/partners/requests`)** 한 곳. `getRecruitments()`(status 무필터 → CLOSED 포함 전체) + client-side search. **serviceKey 스코프 없음**(현재 모든 서비스 모집이 전역 노출). KPA/GP/KCos 매장 앱엔 아직 browse 화면 없음(applications/mine 상태뷰만 노출됨).
- ⚠️ 구분: **레거시 `recruiting-products`**(`/partner/recruiting-products`, GlycopharmRepository `is_partner_recruiting` 플래그 — RecruitingProductsOverviewPage[operator]/RecruitingProductsPage[partner] 소비)는 **별개 모델**(glycopharm affiliate). 본 IR 대상은 NeturePartnerRecruitment.
- **gate 삽입 후보:** (a) `getPartnerRecruitments` browse 경로 — exposureStatus=APPROVED + serviceKey 스코프 필터, (b) `createPartnerApplication` — 방어적 재검증(미승인 모집 신청 차단). operator console 은 전체(PENDING 포함) 조회 별도 경로 필요.

## 3. ProductApproval / OfferServiceApproval 재사용성 (조사 3차)

- 서비스별 승인 SSOT = **`OfferServiceApproval`(offer_service_approvals)**: `offerId`(SupplierProductOffer) × `serviceKey` × `approvalStatus`(pending/approved/rejected) + decidedBy/decidedAt/reason. PUBLIC/SERVICE 유통 오퍼의 **"서비스 주문 가능 등록 승인"** 의미.
- 의미 충돌: 판매자 모집은 **PRIVATE 유통**(createRecruitment 에서 `distribution_type==='PRIVATE'` 강제). OfferServiceApproval 은 "이 오퍼를 서비스에 **주문 가능 상품으로 등록**" 승인이고, 모집 노출 승인은 "이 모집을 서비스 매장/약국에 **노출**" 승인 — 대상(offer vs recruitment)·의미(등록 vs 노출)·유통(SERVICE vs PRIVATE) 모두 다름.
- **재사용 권장: 비권장(D안).** offerId 키라 recruitment 단위 표현 불가, 의미 혼합 시 운영자·공급자 혼란. 단 **상태머신/감사필드 패턴(approvalStatus+decidedBy/At+reason)은 그대로 차용**할 가치 있음.

## 4. 모델 후보 평가 (조사 4차)

| 안 | 내용 | 평가 |
|----|------|------|
| **A** | RecruitmentStatus 에 APPROVAL_PENDING/APPROVED/REJECTED 추가 | ❌ **비권장.** 모집 운영 상태와 노출 승인 상태 혼합 → close/reopen 의미 붕괴. |
| **B** | NeturePartnerRecruitment 에 `exposureStatus`(+ exposureDecidedBy/At/reason) 필드 추가 | ✅ **권장.** 운영/노출 두 축 분리, serviceId 단일값이라 단일 필드로 충분. migration=ADD COLUMN 1회. B안의 일반적 약점("여러 serviceKey")은 **단일서비스 모델이라 무효**. |
| **C** | 별도 `NeturePartnerRecruitmentExposure` entity(recruitmentId × serviceKey) | △ **조건부.** serviceKey별 승인·이력 강점이나, 현재 1모집=1서비스라 **과설계**. 멀티서비스 모집 로드맵 확정 시 승격. |
| **D** | OfferServiceApproval 재사용 | ❌ **비권장.** offerId 키 + SERVICE 등록 의미 → PRIVATE 모집 노출과 충돌. |

**권장: B안.** (상태머신·감사필드는 OfferServiceApproval 패턴 차용.)

## 5. 서비스별 승인 구조 (조사 5차)

- `createRecruitment`: `serviceId = serviceKey`(input 단일값). **1 모집 = 1 serviceId**(nullable). multi-service 모집 **현재 없음/미지원**.
- ∴ serviceKey별 다중 승인 행 **불요** → 단일 exposureStatus(B안)로 충분. 승인자 = 해당 serviceId 운영자 1인.
- 향후 1모집 다중서비스 노출이 필요해지면 → C안 필수(이때 마이그레이션).

## 6. 운영자 UI 후보 (조사 6차)

- 현재 `/operator/recruitment-exposure` = 3서비스 `RecruitmentExposureApprovalPage`(준비중 안내, local page).
- 재사용 패턴: `ProductApplicationManagementPage`(KPA) / `EventOfferApprovalsPage`(KCos) 등 operator DataTable 승인 콘솔. operator RecruitingProductsOverviewPage 는 **레거시 recruiting-products 용**이라 직접 재사용 불가(패턴 참고만).
- 공통화 후보: applications/mine 상태뷰처럼 **operator-core/공통 console 컴포넌트 + 3서비스 thin wrapper**(serviceKey 주입). backend 가 serviceKey 스코프 목록/승인 API 제공 시 깔끔.

## 7. 기존 데이터 호환 (조사 7차)

- NeturePartnerRecruitment 행 존재 가능(생성 WO 이후 seed/실데이터). 현재 전역 즉시 노출 동작.
- **backfill 권장: 기존 RECRUITING 모집 → exposureStatus=APPROVED**(기존 동작 보존, 갑작스런 숨김 방지). 신규 생성 → exposureStatus=PENDING(운영자 승인 후 노출).
- feature 전환 위험: PENDING 기본 + browse APPROVED 필터를 동시 배포해야 신규가 자동 숨김. backfill 누락 시 기존 모집도 숨겨질 위험 → **migration 에서 ADD COLUMN DEFAULT + 기존행 APPROVED backfill 동시 수행**.

## 8. 의약품 / service audience gate 영향 (조사 8차)

- `createRecruitment` 에 **이미 DRUG service audience gate 적용**(`offer.is_regulated` → `getPharmacyAudienceResolver()(serviceKey)` 아니면 `DRUG_SERVICE_NOT_PHARMACY_AUDIENCE` 차단). 즉 비약국 서비스에 의약품 모집은 **생성 단계에서 차단**됨.
- 운영자 노출 승인: 이미 생성 gate 를 통과한 모집만 존재하므로 **하드 재검증 불요**. 단 operator 화면에 규제 여부/대상 서비스 컨텍스트 표시 권장(승인 판단 근거). 노출 승인이 gate 를 우회/완화하지 않도록 주의.

## 9. 권장 모델 (결론)

```
RecruitmentStatus(RECRUITING/CLOSED) = 모집 운영 상태 (유지, 불변)
exposureStatus(PENDING/APPROVED/REJECTED) = 서비스 노출 승인 상태 (신규, B안)
  + exposureDecidedBy / exposureDecidedAt / exposureReason (감사)
```

- 생성: exposureStatus=PENDING. 기존 RECRUITING 행: APPROVED backfill.
- browse(`getPartnerRecruitments` 소비자 경로): exposureStatus=APPROVED **AND** serviceKey 스코프 필터(현재 누락된 serviceKey 스코프도 함께 도입).
- apply(`createPartnerApplication`): exposureStatus !== APPROVED → 차단(방어).
- operator console: 해당 serviceId 모집의 PENDING/APPROVED/REJECTED 목록 + approve/reject(reason).
- 두 축 독립: CLOSED 모집도 exposureStatus 는 별개로 유지(재개 시 일관).

## 10. 후속 구현 WO 제안

- **WO-...-EXPOSURE-BACKEND-V1**: NeturePartnerRecruitment 에 exposureStatus + audit 필드(B안) / migration(ADD COLUMN + 기존 RECRUITING APPROVED backfill) / createRecruitment PENDING 기본 / `getPartnerRecruitments` 에 serviceKey + exposureStatus 필터(소비자) & operator 전용 전체조회 / createPartnerApplication 방어 / operator approve·reject API(serviceKey 소유 검증).
- **WO-...-EXPOSURE-OPERATOR-UI-V1**: `/operator/recruitment-exposure` 준비중 → 실제 console(목록/상세/승인/반려), operator-core 공통 + 3서비스 thin wrapper.
- **WO-...-EXPOSURE-SUPPLIER-STATUS-V1**: 공급자 모집 현황(`SupplierRecruitmentsPage`/상세)에 노출 승인 상태·반려 사유 표시.
- 범위가 작으면 backend + operator UI 를 1 WO 로 병합 가능.
- **제외 유지**: 공급자 신청자 승인/반려·C bridge·allowedSellerIds·OPL·가격·RBAC·RecruitmentStatus 변경.

## 11. 위험 요소

- browse serviceKey 스코프 미도입 시 노출 승인만으로는 "타 서비스 모집이 보이는" 문제 잔존 → 노출 승인과 serviceKey 스코프 **함께** 도입 필요.
- backfill 누락 → 기존 모집 일괄 숨김. migration 원자성 필수.
- 준비중 메뉴를 장기 방치하면 운영자 혼란 → backend WO 와 UI WO 시차 최소화.
- PartnershipRequestListPage 가 status 무필터로 CLOSED 까지 노출 중(별도 정리 후보, 본 모델과 무관하나 같이 점검 권장).

## 12. 결론

`RECRUITING/CLOSED`는 모집 운영 상태로 두고 **노출 승인 상태를 분리**한다. 단일 serviceId 모델이므로 **B안(exposureStatus 필드 + 감사필드)** 이 가장 린하고 의미 정합적이다. 멀티서비스 모집이 확정되면 C안으로 승격. A/D안은 비권장. 노출 승인은 serviceKey 스코프 browse 도입과 함께 진행해야 효과가 있으며, DRUG gate 는 생성 단계에 이미 있어 재검증은 불요(컨텍스트 표시만).

---

*Date: 2026-06-16 · read-only IR(코드 변경 0). 권장=B안(NeturePartnerRecruitment.exposureStatus 분리). 후속: EXPOSURE-BACKEND → OPERATOR-UI → SUPPLIER-STATUS. 사용자 확인 전 미커밋.*
