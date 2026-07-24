# CHECK-O4O-KPA-SELLER-RECRUITMENT-OPERATOR-APPROVAL-FLOW-RESTORE-V1

> WO: `WO-O4O-KPA-SELLER-RECRUITMENT-OPERATOR-APPROVAL-FLOW-RESTORE-V1`
> 원칙: 판매자 모집 = **유통 기능(운영자 승인 필요)**, 콘텐츠 무승인 게시와 별개.
> Date: 2026-07-24 · commit `ee4a6f8e1`(메뉴 1파일) · Deploy Web(kpa-society) success · 라이브 계약 smoke PASS

## 0. 결론 — ✅ PASS (유형 C: 기능 완비, KPA 메뉴만 회귀 → 복원)

전수 조사 결과 판매자 모집 노출 승인은 **모델·백엔드·운영자 페이지·공유 UI·공급자 제출·승인만-노출
소비 쿼리가 전부 실재·연결**되어 있었다. 직전 정비(342f7cef1)의 "backend 부재 placeholder" 판단이
오진이었고, KPA `approvals` 그룹에서 메뉴 한 줄만 삭제된 상태였다(GP·KCos는 계속 노출 중). **메뉴 복원 +
오진 주석 정정**으로 완결. 백엔드·모델·migration·소비 쿼리 무변경.

## 1. 기존 구현 범위 (유형 C 근거)

| 축 | 실재 |
|---|---|
| 모델 | `neture_partner_recruitments` — 두 축 분리: `status`(recruiting/closed=운영) + **`exposure_status`(pending/approved/rejected=노출 승인)** + `exposure_reviewed_at/_by/_note` 감사. migration `20260616100000` 로 이미 존재(기존 행은 approved 백필, 신규는 pending 기본) |
| 공급자 제출 | `POST /neture/partner/recruitments` → `createPartnerRecruitment` 이 **`exposureStatus=PENDING` 기본**(partner-contract.service.ts:618). create 자체가 승인 대기 등록(별도 submit 단계 없음). PRIVATE 유통 오퍼만 대상 |
| 운영자 승인 | KPA proxy `/api/v1/kpa/operator/recruitment-exposure`(kpa.routes.ts:265, `requireKpaScope('kpa:operator')`, serviceKey='kpa-society' 고정) → `setRecruitmentExposure`(SERVICE_MISMATCH 가드·idempotent·감사 기록, 소유권 무변경) |
| 운영자 UI | `RecruitmentExposureApprovalPage`(라우트 OperatorRoutes.tsx:169 이미 live) → 공유 `RecruitmentExposureConsole`(pending/approved/rejected 필터+승인/반려 큐, placeholder 아님) |
| 반려·재제출 | 반려 사유 `exposure_review_note` 저장. 공급자 화면 `SupplierRecruitmentsPage` 가 exposure 상태·사유 노출 |
| 소비(노출) | public browse `GET /neture/partner/recruitments` 가 **`exposureStatus=APPROVED` 강제**(미승인/반려 절대 미노출, controller:85). apply 도 `RECRUITMENT_NOT_EXPOSED` 방어 |

## 2. 운영자 승인 미연결 원인

`operatorMenuGroups.ts` `UNIFIED_MENU.approvals` 에서 `{ '판매자 모집 노출 승인', /operator/recruitment-exposure }`
한 줄이 삭제되고 "backend 부재 준비중" 주석으로 대체됨. **라우트·페이지·백엔드는 그대로 살아있어** 직접 URL로는
접근 가능했고, 사이드바 진입점만 사라진 상태. GP(`operatorMenuGroups.ts:44`)·KCos(`:39`)는 동일 메뉴 유지 → KPA 단독 회귀.

## 3. 재사용/변경

- **재사용(무변경)**: 모델·enum·migration·proxy 컨트롤러·setRecruitmentExposure·RecruitmentExposureApprovalPage·
  RecruitmentExposureConsole·공급자 제출/반려/재제출·browse APPROVED 강제 쿼리 — 전부 기존 그대로.
- **변경**: `services/web-kpa-society/src/config/operatorMenuGroups.ts` 1파일 — 메뉴 한 줄 복원 + 오진 주석 정정.
- **신규 승인/서비스 선택/모델/migration: 0.**

## 4. 중지 조건 — 8개 전부 미해당

| # | 조건 | 판정 |
|---|---|---|
| 1 | 모델이 다른 의미 기능과 공용 | ❌ serviceKey(service_id) scoped, per-service proxy 격리 |
| 2 | 이미 다른 운영자 화면에서 승인 중 | ❌ KPA proxy serviceKey 고정 — KPA 모집만. GP/KCos 각자 독립 |
| 3 | 승인 후 소비처 전무 | ❌ browse API 완비+APPROVED 강제(소비 "화면" 별도는 후속) |
| 4 | 기존 active 전환 시 운영 중단 | ❌ 데이터 0건 |
| 5 | KPA 외 공통 영향 | ❌ operatorMenuGroups는 kpa-society 전용, 백엔드 무변경 |
| 6 | 승인 컬럼 없어 migration 필요 | ❌ 컬럼·migration 이미 존재 |
| 7 | 동시 작업 파일 충돌 | ❌ recruitment 미커밋 변경 0 |
| 8 | 승인이 계약·정산·법적 기록 연결 | ❌ setRecruitmentExposure는 노출 상태만 변경, partner-contract apply(계약)와 분리 |

## 5. 검증

### 정적
- 공급자 create route/제출(=create pending)/pending 저장/운영자 메뉴/목록 route/승인·반려 API/반려사유 저장/
  승인 전 노출 0(APPROVED 강제)/승인 후 노출/KPA 외 영향 0/콘텐츠·태블렛·사이니지 승인 신규 0 — 전부 확인.
- typecheck(web-kpa-society) 0 · vite build 성공.

### 라이브 계약 smoke (프로덕션 API, 백엔드 무변경)
- 운영자 큐 `GET /kpa/operator/recruitment-exposure?exposureStatus=pending|approved` → **200**.
- 비로그인 → **401**. 존재하지 않는 id approve → **404 RECRUITMENT_NOT_FOUND**(가드).
- public browse `?serviceKey=kpa-society` → 200, **미승인 유출 0**(APPROVED 강제).

### 브라우저 smoke (kpa-society, 운영자)
- 사이드바 `승인` 그룹에 **'판매자 모집 노출 승인' 복원**. `/operator/recruitment-exposure` 로드 →
  실제 승인 콘솔("노출 대기/승인/반려", placeholder 아님) 렌더 · 페이지 API GET **200** · 페이지 404 0.

### full 데이터 E2E — NOT_RUN_NO_FIXTURE (사용자 결정: 계약 검증으로 종료)
- 공급자 create→approve→browse 노출 실증은 프로덕션 SMOKE 모집 픽스처 필요(데이터 0건, renagang21 PRIVATE
  offer 0건). 프로덕션 write·부수 데이터(과거 우발적 master 생성 이력)를 피해 **라이브 계약+코드 검증으로 대체**.
  백엔드 흐름은 선행 WO(WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1 등)에서 이미 구현·배포됨.

## 6. 기존 데이터 처리

- `neture_partner_recruitments` 총 0행. 상태 전환·백필·migration 불필요. **프로덕션 write 0.**

## 7. 콘텐츠 무승인 정책 무영향 / KPA 외 영향

- 공급자 일반 콘텐츠·태블렛·사이니지·QR/POP/동영상 무승인 게시 흐름 **무접촉**(이번 변경=메뉴 1줄).
- GP·K-Cosmetics·Neture 메뉴 무변경. 백엔드 무변경.

## 8. 후속(비차단) — WO §11 조건부 권장

- **운영자 대시보드 pending KPI/Action Queue**: 현재 KpaOperatorDashboard 는 members/forum/content/
  product-applications/event-offers KPI만 wire. recruitment-exposure pending 타일은 net-new 백엔드 count
  KPI가 필요 → 별도 WO 권장(데이터 발생 후 실효).
- **운영자 알림(신규 pending 제출)**: net-new 알림 타입. WO §11 "Action Queue로 충분하면 불필요 알림 금지" 정책상
  보류. 공급자향 알림(승인/반려)은 기존 recruitment.application_* 타입 존재.
- **판매자·매장 소비 화면**: browse API 완비, 소비 UI 위임은 별도 WO.

## 9. 커밋

- 코드 `ee4a6f8e1`(operatorMenuGroups.ts) · 본 CHECK.
