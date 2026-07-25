# CHECK-O4O-KPA-SELLER-RECRUITMENT-APPLICATION-SUPPLIER-REVIEW-AND-STORE-STATUS-E2E-V1

> WO: `WO-O4O-KPA-SELLER-RECRUITMENT-APPLICATION-SUPPLIER-REVIEW-AND-STORE-STATUS-E2E-V1`
> 성격: 매장 참여 신청 → 공급자 승인·반려 → 매장 현황 반영 흐름 조사·연결. **유형 A(전체 완성)**.
> **신규 테이블·상태·승인 API·migration 0.** 코드 변경 = 매장 현황 처리일 표시 1건.
> Date: 2026-07-24 · commit `fe51bc6ee`(1파일) · Deploy Web success · API+브라우저 smoke PASS

## 0. 결론 — ✅ PASS (유형 A: 구조적 단절 없음, 상태표시 결함 1건 수정)

전수 조사 결과 마지막 leg(공급자 신청 관리 + 매장 결과 표시 + 승인→파트너 관계 생성)가 **전부 실재·연결**.
유일한 상태표시 결함(매장 현황이 신청일만 표시, 처리일 미표시 — WO §8 명시 항목)만 수정. 승인·반려·관계
생성 로직 무접촉. 데이터 0건 → 빈 상태·권한·상태전이 계약 검증.

## 1. 기존 신청 모델·상태·API

- 테이블 `neture_partner_applications`: id/recruitment_id/**partner_id(=신청자 userId)**/partner_name/status/
  applied_at/**decided_at**/**decided_by**/**reason**/created_at/updated_at. `@Unique(recruitmentId, partnerId)`.
  status enum **pending/approved/rejected/cancelled**. 감사 컬럼(decided_at/by/reason) 완비. migration 불필요.
- 엔드포인트(전부 `/neture` prefix): `GET /partner/recruitments/:id/applications`(공급자, requireActiveSupplier) ·
  `GET /partner/applications/mine`(매장, requireAuth) · `POST .../:id/approve|reject|cancel|terminate`.

## 2. 공급자 신청 관리 — 실재(유형 C 아님)

- `web-neture SupplierRecruitmentDetailPage`(모집 상세 = '참여 신청 관리' 홈): 메뉴 '모집 현황'
  (SupplierSpaceLayout) → `/supplier/recruitments` → 행 클릭 → 상세. `supplierRecruitmentApi`
  (getApplications/approveApplication/rejectApplication(reason)/terminate). pending 행에 승인/반려 버튼
  (reject는 사유 prompt), 반려 사유 inline 표시. **실 엔드포인트 이미 배선**.
- backend `approvePartnerApplication`/`rejectPartnerApplication`: `status===PENDING` + `recruitment.sellerId===
  sellerId`(모집 소유자) 검증 후 단일 update(트랜잭션). reject는 `reason`(선택, 미입력 시 '' 저장).

## 3. 매장 신청 현황 — status+반려사유 이미 렌더(유형 B 아님)

- `web-kpa-society StoreRecruitmentApplicationsPage` → `coreApiClient GET /neture/partner/applications/mine`
  → 공통 `StoreRecruitmentApplicationsView`(store-ui-core). `resolveState`: pending→심사 대기 / approved→승인됨 /
  approved+terminated→참여 해지됨 / **rejected→반려됨 + 반려 사유** / cancelled→신청 취소. 자기 취소 버튼(pending).
- mine 응답이 status·reason·decidedAt 전부 carry.

## 4. 발견된 단절 원인 + 수정

- **유일 결함**: 매장 현황이 신청일(appliedAt)만 표시, **처리일(decidedAt) 미표시**(WO §8 목록 표시 항목).
  payload에 decidedAt 이미 존재.
- **수정**: `StoreRecruitmentApplicationsView.tsx` 신청일 라인에 `decidedAt` 조건부 표시(additive, null이면 미표시).
  공통 컴포넌트라 KPA/GP/KCos 공통 이득. 승인·반려·관계 생성 로직 무변경.

## 5. 소유권·service scope 가드

- 승인/반려: `recruitment.sellerId === 현재 supplier` 검증(다른 공급자 처리 차단) + `status===PENDING`(반복 처리 차단).
- 공급자 목록: 자기 모집 신청만(`sellerId` 불일치 시 404). 매장 mine: requireAuth(본인 신청만).
- 중복 방지: `@Unique(recruitmentId, partnerId)`. 종료 모집 신규 신청 차단: create 시 RECRUITING+APPROVED 강제.

## 6. 승인 후 파트너 관계 — 유형 E(생성함)

- `approvePartnerApplication`이 `neture_seller_partner_contracts`(seller/partner/recruitment/application/
  commission/ACTIVE) insert + 대시보드 항목 + membership/RBAC `partner` role + C-bridge
  (`supplier_product_offers.allowed_seller_ids += partner`, `organization_product_listings` insert
  source_type='seller_recruitment'). **승인=완전한 관계 생성**(status flip 아님). **이번 WO 무접촉**(기존 완성).

## 7. 알림

- 신청자향 `recruitment.application_approved|rejected|participation_terminated` 타입 존재·**발화됨**
  (approve/reject/terminate 시 best-effort, targetUrl=신청자 서비스 status route). 공급자향 '신규 신청' 알림 없음.
- **신규 알림 미생성**(WO §11 "Action Queue/목록으로 충분하면 불필요 알림 금지"). 공급자는 모집 현황에서 확인.

## 8. 프로덕션 신청 데이터

- `neture_partner_applications` 0행(pending/approved/rejected/cancelled 전무). orphan·타서비스 혼입 없음(0건).
  **인위적 생성 없음**(WO §12·§16). 프로덕션 write 0.

## 9. 검증

### 정적
- 승인/반려 소유권·PENDING·반복차단 가드 · 자기 모집만 · service scope · 반려사유 표시 · 감사정보 매장 미노출 ·
  migration 0 · typecheck(store-ui-core/web-kpa-society/web-glycopharm) 0 · KPA build 0.

### 라이브 API smoke (프로덕션, backend 무변경)
- store mine 200(빈) · 비로그인 401 · 공급자 approve/reject 존재하지 않는 id 404 가드 · (renagang21=supplier 겸직이라
  approve 시 guard 통과 후 404 — 정상).

### 브라우저 smoke (kpa-society, 매장 renagang21)
- 신청·승인 현황 진입·**빈 상태** · 판매자 모집 browse **무회귀** · API 404 0 · console/pageerror 0.

### full E2E — NOT_RUN_NO_FIXTURE
- 신청→승인/반려→매장 반영 실증은 APPROVED·RECRUITING 모집 + 신청 fixture 필요(모집 0·offer 0·신청 0).
  직접 INSERT·offer 생성 없이(WO §16) 상태전이 가드는 코드 + 라이브 404로 검증. decidedAt 표시는 additive·tsc/build 검증.

## 10. KPA 외 영향

- 변경 파일 = store-ui-core 공통 View 1개(additive). GP tsc 0 확인. 승인·반려 로직·엔드포인트 무변경 → Neture 무회귀.

## 11. 후속 / 보류 (중지 조건 부분 해당)

- **중지 #3(부분)**: 신청 row에 `organization_id` 미영속(partner_id=userId만, org는 read-time `organization_members
  LIMIT 1` 파생). 사용자 단위 소유권·중복방지는 안전하나 매장 조직 단위 식별은 부재(다조직 사용자 시 임의 org).
  영속화는 컬럼 추가 migration 필요(WO §13 금지) → **별도 WO 후보로 보고**.
- **중지 #1(정보성)**: 승인이 파트너 계약(commission 관계) 생성과 원자 결합 — 기존 유형 E 완성 기능, 정산·전자계약은
  아님. 이번 WO 무접촉.
- 계약·정산: `neture_seller_partner_contracts` 이후 실 정산/전자계약은 별도 도메인(미구현) → 후속 WO.

## 12. 커밋

- 코드 `fe51bc6ee`(StoreRecruitmentApplicationsView.tsx) · 본 CHECK.
