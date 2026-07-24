# CHECK-O4O-KPA-SELLER-RECRUITMENT-STORE-CONSUMER-BROWSE-UI-V1

> WO: `WO-O4O-KPA-SELLER-RECRUITMENT-STORE-CONSUMER-BROWSE-UI-V1`
> 성격: 승인된 판매자 모집을 **KPA 매장 경영자가 조회·참여**하는 소비 UI 연결(유통 기능).
> **신규 테이블·상태·승인 API·migration 0.** 공급자 제출·운영자 승인·KPI 무변경.
> Date: 2026-07-24 · commit `1bf63e5ef`(5파일) · Deploy API+Web success · API+브라우저 smoke PASS

## 0. 결론 — ✅ PASS (유형 D)

browse 목록 API·참여 API가 이미 실재(유형 D). 상세 API만 부재 → 목록+modal 상세(list-only). KPA 매장
소비 proxy(승인·모집중·kpa-society backend 고정) + 매장 browse 페이지(목록·검색·상세 modal·참여 신청·
이미 신청 표시·빈 상태) + 사이드바 '판매자 모집' 메뉴를 연결. 프로덕션 데이터 0건 → 빈 상태·계약 검증.

## 1. 조사 결과 (유형 판정)

- **browse API 실재**: `GET /neture/partner/recruitments`(public) — exposureStatus=APPROVED 강제, serviceKey 옵션.
  단 status(recruiting/closed) 미강제·period/공급자 필터 없음·public(no-auth). 응답에 **감사 필드 없음**
  (id/productName/manufacturer/consumerPrice/commissionRate/sellerName/shopUrl/imageUrl/status/exposureStatus).
- **상세 API 부재**: `GET /partner/recruitments/:id` 없음 → 목록 데이터로 modal 상세.
- **참여 API 실재**: `POST /neture/partner/applications`(requireAuth) — RECRUITMENT_NOT_EXPOSED/CLOSED/
  DUPLICATE_APPLICATION backend 강제. `neture_partner_applications` 신청 레코드만(계약/정산 결합 없음).
- **유형 D** 확정(browse+참여 존재). clone: web-neture `PartnershipRequestListPage`(UI/apply) + web-kpa-society
  `StoreRecruitmentApplicationsPage`(coreApiClient wiring).

## 2. 선택한 사용자 범위

- **KPA 매장 경영자(kpa:store_owner) 전용**(WO §2 기본값). 일반 회원 공개·비로그인 페이지 없음.
- 참여 대상 semantics: `sellerId/sellerName`=모집 등록 공급자, 신청자=로그인 사용자(requireAuth). KPA는
  이미 store_owner를 신청자로 취급(`StoreRecruitmentApplicationsPage`/'신청·승인 현황' 라이브) → store_owner가 정당 소비자.

## 3. 메뉴·route

- 메뉴: `storeMenuConfig.ts` **KPA_SOCIETY_STORE_CONFIG '약국 상품·거래' 그룹 한정** '판매자 모집'
  (발주 내역↔신청·승인 현황 사이). GP/KCos 블록 미추가(proxy가 kpa-society 고정 → 그쪽은 backend 없음).
- route: `App.tsx` `commerce/seller-recruitments`(부모 store guard 상속 — sibling 동일 패턴).

## 4. 목록·상세 구현

- 목록: 검색(제품명/제조사/공급자)·이미지·제품명·제조사·소비자가·수수료%·공급자·참여 버튼. 로딩/오류/빈 상태.
- 상세: **modal**(목록 데이터 재사용, 별도 상세 API 없음) — 제품명·이미지·제조사·공급자·소비자가·수수료·몰URL.
  운영자 검토 메모·반려 사유·감사 컬럼 미노출(browse 응답에 애초 없음).
- 참여: 목록/상세에서 신청 → 성공 시 '신청 완료' 표시. DUPLICATE/CLOSED/NOT_EXPOSED 토스트 분기.

## 5. 승인-only·service scope 강제 방식 (WO §10 — 프론트 필터 의존 금지)

- **KPA 소비 proxy** `GET /api/v1/kpa/store/seller-recruitments`(신규, `store-seller-recruitment-browse.controller.ts`):
  `createRequireStoreOwner(dataSource, 'kpa')` 가드 + `getPartnerRecruitments({ serviceKey:'kpa-society',
  exposureStatus:APPROVED, status:RECRUITING })` **backend 고정**. 클라이언트 입력 무시. 감사 필드 미포함 재사용.
- 직접 ID로 pending/rejected/타서비스/종료 모집 조회 불가(목록 자체가 3조건 AND). 참여도 `createPartnerApplication`이
  APPROVED+RECRUITING 재검증(직접 apply 방어).

## 6. 참여 액션

- **연결함(유형 D)**: 기존 `POST /neture/partner/applications` 재사용(허위 버튼 아님). 신청 후 상태는 기존
  '신청·승인 현황' 화면에 노출. 중복/종료/미승인 backend 강제 재확인.

## 7. 프로덕션 데이터 / 빈 상태

- `neture_partner_recruitments` 0행. **인위적 모집/offer 생성 없음**(WO §11·§13 준수). 빈 상태 문구:
  "현재 참여 가능한 판매자 모집이 없습니다. 새로운 모집이 승인되면 이 화면에서 확인할 수 있습니다." (운영자 대기와 무혼동). write 0.

## 8. KPA 외 영향

- proxy·페이지·route는 KPA 전용. `storeMenuConfig` 는 KPA 블록만 수정(GP/KCos config 미변경). store-ui-core
  tsc 0. `getPartnerRecruitments`는 기존 재사용(변경 0) → Neture 등 무회귀.

## 9. 검증

### 정적
- KPA scope·APPROVED·recruiting backend 고정 · pending/rejected 직접접근 차단 · 타서비스 미노출 · 감사메모 미노출 ·
  store_owner 가드 · route 유효 · 빈 상태 · migration 0 · typecheck(api-server/store-ui-core/web-kpa-society) 0 · build 0.

### 라이브 API smoke (프로덕션, 배포 후)
- store_owner browse 200(items 0) · 응답 감사필드 미포함 · 미승인/비-kpa/비-recruiting 유출 0 · **비로그인 401** ·
  store_owner(sohae2100=실제 kpa:store_owner 보유) 200 · apply 존재하지 않는 id 404. (순수 비-store_owner 회원은
  kpa-society active 기준 0건 — guard 로직 role_assignments+membership 이중 필수로 코드 확인.)

### 브라우저 smoke (kpa-society, 매장 경영자 renagang21)
- 사이드바 '약국 상품·거래'에 **판매자 모집** 메뉴 · `/store/commerce/seller-recruitments` 진입 · **빈 상태 문구** ·
  API 404 0 · console/pageerror 0.

## 10. 커밋

- 코드 `1bf63e5ef`(store-seller-recruitment-browse.controller / kpa.routes / SellerRecruitmentsBrowsePage /
  App.tsx / storeMenuConfig) · 본 CHECK.

## 11. 후속 참여·계약 WO 필요 여부

- 참여(application)까지 이번에 연결 완료. 이후 **공급자의 신청 승인→파트너 계약·정산**은 별도 도메인
  (`approvePartnerApplication`/partner-contract) — 기존 공급자 화면에 존재, 이번 범위 밖. 실 approved 모집 데이터
  발생 시 목록·상세·참여 라이브 재검증(데이터 부재로 이번엔 빈 상태만 실증).
