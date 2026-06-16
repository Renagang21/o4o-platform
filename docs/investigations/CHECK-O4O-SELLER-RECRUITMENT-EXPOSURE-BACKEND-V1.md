# CHECK-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1

> **작업명:** WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1 (IR dbd2ca435 B안)
> **유형:** backend 모델/migration/API/gate. frontend 무변경.
> **결과: PASS — NeturePartnerRecruitment 에 exposureStatus(PENDING/APPROVED/REJECTED)+감사필드 추가(native enum), 기존 RECRUITING/CLOSED 모집 APPROVED backfill, 신규 모집 PENDING 생성, browse `exposureStatus=APPROVED`+serviceKey scope, apply 미승인 방어 차단(RECRUITMENT_NOT_EXPOSED), operator approve/reject API(neture:operator). RecruitmentStatus 불변. api-server type-check PASS.**
> 선행: IR-...-EXPOSURE-APPROVAL-MODEL-V1(dbd2ca435) · 메뉴 remodel(4d6e4571b) — 2026-06-16

---

## 1. IR 결정 요약

```
RecruitmentStatus(RECRUITING/CLOSED) = 모집 운영 상태 (불변)
exposureStatus(PENDING/APPROVED/REJECTED) = 서비스 노출 승인 상태 (신규)
```
두 축 분리. C안(별도 entity)/A안(Status 확장)/D안(OfferServiceApproval 재사용) 비권장 — B안 확정.

## 2. entity/migration 조사 결과

- `NeturePartnerRecruitment.status` = native enum `neture_partner_recruitment_status_enum`. ApplicationStatus 도 native enum. → exposureStatus 도 **native enum**(WO §11 "RecruitmentStatus 패턴" 준수).
- 감사필드 패턴: `OfferServiceApproval`(decided_by uuid null / decided_at ts null / reason text null) 차용 → `exposure_reviewed_by`/`exposure_reviewed_at`/`exposure_review_note`(FK 없는 단순 컬럼).

## 3. 변경 내용

**entity** [NeturePartnerRecruitment.entity.ts](../../apps/api-server/src/modules/neture/entities/NeturePartnerRecruitment.entity.ts): `enum ExposureStatus` + `exposure_status`(enum, default pending) + `exposure_reviewed_at/by/note`. [entities/index.ts](../../apps/api-server/src/modules/neture/entities/index.ts) export.

**migration** [20260616100000-AddRecruitmentExposureStatus.ts](../../apps/api-server/src/database/migrations/20260616100000-AddRecruitmentExposureStatus.ts):
- CREATE TYPE `neture_partner_recruitment_exposure_status_enum`('pending','approved','rejected').
- ADD COLUMN exposure_status NOT NULL DEFAULT 'pending' + 감사 3컬럼(nullable).
- **backfill**: `UPDATE ... SET exposure_status='approved' WHERE exposure_status='pending'` (migration 시점 기존 행 전부 = 노출되던 모집 → approved). 단일 트랜잭션이라 중간 insert 없음.
- INDEX(exposure_status). down: 인덱스·컬럼·타입 drop.

**createRecruitment**(partner-contract.service.ts): `exposureStatus: ExposureStatus.PENDING` 추가(status=RECRUITING 불변).

**browse**(`getPartnerRecruitments` + `/partner/recruitments` 컨트롤러): filters 에 serviceKey/exposureStatus 추가, 반환에 exposureStatus 포함. **public 라우트가 `exposureStatus=APPROVED` 강제**(serviceKey 누락 시에도 미승인 모집 절대 미노출) + serviceKey query scope.

**apply**(`createPartnerApplication`): `exposureStatus !== APPROVED` → `RECRUITMENT_NOT_EXPOSED`(컨트롤러 400 "아직 서비스 노출 승인이 완료되지 않은 모집입니다.").

**operator API** [operator-recruitment-exposure.controller.ts](../../apps/api-server/src/modules/neture/controllers/operator-recruitment-exposure.controller.ts) (neture.routes `/operator` 마운트, requireAuth+requireNetureScope('neture:operator')):
- `GET /operator/recruitment-exposure?serviceKey=&exposureStatus=&status=` — 큐 목록(감사필드 포함).
- `PATCH /operator/recruitment-exposure/:id/approve|reject` body `{ note? }` — `setRecruitmentExposure`(approve→APPROVED / reject→REJECTED + reviewedAt/By/note, 이미 같은 상태 idempotent, RECRUITMENT_NOT_FOUND 404). RecruitmentStatus 미변경.

## 4. browse exposureStatus + serviceKey scope

- `exposureStatus=APPROVED` 컨트롤러 강제 → PENDING/REJECTED 미노출(완료기준 #5). serviceKey query → serviceId 일치 필터(완료기준 #6).
- **status=RECRUITING 강제는 미적용(판단)**: 기존 `PartnershipRequestListPage`(유일 browse 소비처, web-neture)가 CLOSED 를 상태 배지로 안내하던 UX 보존. apply 는 이미 CLOSED 차단하므로 노출만으로 위험 없음. (WO §8 권장은 RECRUITING-only이나 완료기준은 "APPROVED만"으로 명시 → APPROVED 게이트만 firm 적용.)

## 5. operator approve/reject API + 권한

- neture:operator 스코프(= neture:operator/neture:admin). `OfferServiceApproval`/`operator-product-approval` 컨벤션 미러.
- ⚠️ **serviceKey 별 권한 enforcement / KPA·GP·KCos 서비스 operator 앱 호출 wiring 은 본 WO 범위 외 → 후속 EXPOSURE-OPERATOR-UI-V1**. 조사 발견: 서비스 operator 페이지(예 KPA ProductApplicationManagementPage)는 자기 service-locked `apiClient`(`/api/v1/{service}`)로 자기 backend 호출. 본 WO 는 neture:operator 큐 surface 제공(neture 컨벤션). UI WO 에서 (a)cross-service client (b)per-service proxy (c)serviceKey ownership 강제를 결정.

## 6. 기존 데이터 backfill 정책

- 기존 RECRUITING + CLOSED 모집 전부 → exposureStatus=APPROVED(동작 보존, 갑작스런 숨김 방지). 신규 → PENDING.

## 7. 제외 범위 (WO 준수)

operator UI / 준비중 페이지 교체 / 공급자 status 화면 / 판매자 신청·취소 UI / C bridge / allowedSellerIds·OPL / 계약·RBAC / 가격 / ProductApproval 재사용 / 별도 RecruitmentExposure entity / multi-service 구조 / 이메일·알림 / package.json·lock. **모두 미수행.** frontend 무변경. DRUG audience gate 는 createRecruitment 생성단계 기존 적용 유지(재검증 불요). 다른 세션 GP frontend WIP 미접촉.

## 8. 검증

- **api-server `type-check`(tsc --noEmit): PASS (exit 0).**
- frontend 무변경 → build 생략.
- **정적**: browse APPROVED 강제(미승인 누출 0), serviceKey scope, apply 방어, operator idempotent, RecruitmentStatus 불변. migration native enum + DEFAULT + backfill + index, down 대칭.
- **배포 후 권장 smoke**(WO §14): 기존 모집 exposureStatus=APPROVED 확인 / 신규=PENDING·browse 미노출·apply 차단 / operator approve→browse 노출·apply 가능 / reject→미노출·차단 / serviceKey scope 서비스별 분리.

## 9. 완료 판정 / 후속

**PASS.** B안 backend 반영 — 두 상태 축 분리, browse/apply gate, operator approve/reject. RecruitmentStatus·정책 불변.

**커밋:** path-specific 9파일(entity 2 + migration 1 + service 2 + controller 2 + routes 1 + CHECK) · `<commit>`.
**후속:** ② EXPOSURE-OPERATOR-UI-V1(준비중→실콘솔, serviceKey 권한·호출 wiring) → ③ EXPOSURE-SUPPLIER-STATUS-V1(공급자 모집 현황에 노출 상태 표시). PartnershipRequestListPage status-무필터(CLOSED 노출) 정리 후보(본 모델과 무관).

---

*Date: 2026-06-16 · PASS · NeturePartnerRecruitment.exposureStatus(B안) + migration/backfill(기존 APPROVED) + createRecruitment PENDING + browse APPROVED·serviceKey scope + apply RECRUITMENT_NOT_EXPOSED 방어 + operator approve/reject(neture:operator). RecruitmentStatus 불변, frontend 무변경. type-check PASS.*
