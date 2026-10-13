# CHECK-O4O-AUTH-REMAINING-PLAN-V1

> 확인일: 2026-10-13 KST · [상위 TODO](../work-orders/WO-O4O-AUTH-REFACTOR-V1.md)
> 같은 미완료 WO의 연속 Phase · 사용자 종료 범위: branch push까지만
> 조사 기준: `e999db2b9e`; 조회한 origin/main: `b3f792578a`

## 문제와 이번 조치

상위 TODO의 로그인 순환·개정 정책 화면·Demo 데이터 연결 항목이 하위 WO의 완료 기록과 달랐다.
현재 TODO만 근거에 맞춰 갱신하고 과거 날짜별 실패·미실행 기록은 보존했다. 이번 변경은 문서-only다.
최신 main의 추가 변경은 전체관리자 운영자 안내와 PH/개인정보 트랙의 코드·기록이며 이번 문서 경로와 겹치지 않는다.
push-only 단계에서 자동 동기화·main 통합·타 트랙 배포를 수행하지 않는다.

## 완료 근거

| 항목 | 근거와 판정 |
|---|---|
| Identity V3 문구 정합 | [V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md)의 2026-10-07 대체 고지가 과거 미가입 로그인 거부를 대체한다. [현행 정본](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md), `service-catalog.ts`의 gate 비활성, `serviceLoginEligibility.test.ts` 대조. Frozen의 과거 본문 재작성 불필요 |
| 공급자·펀딩 로그인 순환 | 하위 [카카오 WO](../work-orders/WO-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md)의 #423 운영 반영 기록. 최신 `LoginRedirect.test.tsx`의 공개 홈 진입 회귀와 대조 |
| 정책 표시·개정 준비 | #457/#497 구현·배포, 공고 공개 및 계약 검증. [개정 설계](../design/DESIGN-O4O-AUTH-LEGAL-POLICY-REFRESH-V1.md)의 실행 절차와 대조. 새 정책 DB 게시 완료로 해석하지 않음 |
| Demo3 연결·운영 검증 | #521/#524 구현과 승인된 계획 적용, #525 운영 기록. 기존 owner/supplier ID·FK 유지, 같은 매장 직원, 재실행 변경0.8 origin48조건·대표 홈6조건·전체관리자2조건. 전체 미사용 데이터 삭제나 일반 상태 계정 검증으로 확대하지 않음 |

## V04: 일반 계정 상태 검증 준비

`docs/local/TEST-ACCOUNT.txt`는 현재 존재하며 Git에서 제외됐다. 최신 사용자 지시에 따라 제공3개는
공개 Demo 계정이다. 이 파일의 존재와 별개로 일반 상태별 계정 모집단은 아직 확정되지 않았다.
실제 운영자는 사용자 담당이며 과거 관리자 E2E 자격정보를 사용하지 않는다.

| 축 | 먼저 확인할 원장 | 필요한 조건과 기대 동작 |
|---|---|---|
| 공통 계정 | `users`, 현재 이메일 확인/계정 접근 판정 | 정상 확인 계정, 이메일 미확인, 제한 계정을 구분. 제한 계정 안내에서 허용된 본인 me 재조회만 수행; handoff/서비스 신청으로 복구하지 않음 |
| 메인 이용 | 메인 membership와 `mainMembershipProjection` | 이메일 확인된 정상 계정의 과거 pending/rejected는 수동 승인 대기로 만들지 않음. 명시적 suspended/withdrawn을 정상으로 승격하지 않음 |
| 일반 서비스 가입 | 해당 서비스 `service_memberships` | row 없음/pending/active/rejected/suspended/withdrawn. 정상 인증과 업무 자격은 별도이며 다른 서비스의 active/role로 대신 승인하지 않음 |
| 공급자 | canonical supplier 연결과 `neture_suppliers` | row 없음/PENDING/ACTIVE/REJECTED/INACTIVE. 실제 표시값은 none/pending/active/rejected/suspended. 생성되지 않는 supplier withdrawn UI 분기를 실제 탈퇴 사례로 꾸미지 않음 |
| 매장·약국 | 약국 신청/협력사업 승인 원장, 조직 관계, `role_assignments` | owner/member/관계 없음과 사업 자격을 분리. KPA 가입 승인만으로 매장 owner를 만들지 않음. Supplier와 직원에 owner-only 업무 허용하지 않음 |

실행 순서는 다음과 같다.

1. 기존 승인된 운영 WIF 조회 경로로 대상 환경과 원장 상태를 읽고, 일반 비관리·비Demo 계정의 상태 목록을 확정한다. 공개 기록에는 조건 ID와 상태만 남긴다.
2. 비공개 계정 출처와 상태가 맞는지 확인한다. 없는 조건은 미실행으로 기록한다. 임의 DB 상태 변경·일반 계정 생성·삭제를 포함한 새 운영 계획은 정확한 대상과 복구 방법을 준비한 뒤 별도 승인 범위를 확인한다.
3. 유지8 origin(neture.co.kr, supplier.neture.co.kr, community.neture.co.kr, funding.neture.co.kr, pharmacy.neture.co.kr, store.neture.co.kr, study.neture.co.kr, kpa.neture.co.kr) × PC/mobile에서 해당 조건을 실행한다. 원장이 없는 서비스에 같은 상태를 강제로 적용하지 않는다.
4. 로그인 HTTP 결과 → 본인 me → 상태 안내 → 메뉴/직접 주소 → 실제 보호 API → 다른 서비스 영향 → UI logout과 토큰 폐기를 순서대로 확인한다. 공개 서비스/공통 업무공간/대표 계정 진입은 각 실제 소비처에 맞춘다.
5. 각 조건의 출처·기대 결과·실제 상태/HTTP·최초 실패·재실행을 구분해 기록한다. Demo48건이나 합성 fixture 결과로 일반 운영 모집단을 닫지 않는다.

완료 기준: 필요한 상태가 실제 존재하는 조건을 전부 검증하고, 없는 조건·실패를 명시적으로 남겨 사용자와 판정한다.
현재 판정은 **실행 준비 완료 / 일반 운영 상태 검증 미실행**이다.

## V06: 사용자 담당 실제 인증 결과

PC/mobile별로 신규 Google·카카오 가입, 기존 로그인, 현재 계정 재인증 후 명시적 연결,
취소, 동일 이메일 충돌, 다른 계정에 이미 연결된 provider 충돌을 확인한다.
계정 자동 병합·provider 자동 이동·서비스 승인/권한 합집합이 없어야 한다.
결과 기록에는 조건과 최종 화면/HTTP 코드만 사용하고 code/state/token·실제 개인정보는 받거나 게시하지 않는다.
추가 정보 제출 후 약관 화면 반복 여부도 이 모집단에서 확인한다. 사용자가 맡은 실제 인증은 자동 성공 처리하지 않는다.

## V05: 시행일 이후 정책 적용

실제 공개 공고일은 2026-10-12, 시행 예정일은 **2026-11-13 KST**다. 2026-10-13 현재 게시 시점이 아니다.
시행일에도 공고의 실제 공개·30일 경과·승인 본문/version/소유 scope를 다시 확인한다.
그 후 개정 설계의 등록·게시 절차에 따라 공통 terms/privacy와 대상 서비스 문서를 각각 적용한다.
게시 이후 PC/mobile 신규 가입·기존 회원 재동의·입력 유지/버전 변경·무관 서비스 영향·관리자/Demo 경계를 검증한다.
draft/공고 공개와 published 문서는 별개이며 기존 동의 이력을 허위 backfill하지 않는다.

## 전수 데이터 정리의 남은 범위

Demo3의 연결·멱등성·FK 검증은 완료됐지만 모든 미사용 콘텐츠·상품·주문·계정의 disposition은 확정되지 않았다.
정리 전에 테이블/소유권/참조/복구 자료를 전수 대조하고 재사용·삭제·보류를 명시한 계획을 준비한다.
데이터 삭제 후 불필요 계정을 마지막에 처리한다. PH 별도 트랙의 삭제 완료를 전 플랫폼 삭제 완료로 확대하지 않는다.

## 새로 확인한 과거 E2E 드리프트

`e2e/auth-runtime`과 `.github/workflows/e2e-auth-runtime.yml`은 과거 Google-only 정책을 사용한다.
사용자 화면 password 입력 부재와 현재 복구된 이메일 endpoint의404를 요구하고, KPA 대상도 과거 도메인이다.
workflow에는 frozen 설치 실패 후 non-frozen 재설치와 credential guard의 닫히지 않은 quote도 남아 있다.
이 스위트를 현재 운영 PASS 기준으로 실행하지 않았다. 일반 사용자 password 지원과 전체관리자 Google 전용을 분리해야 한다.

- [ ] 자격정보 없는 surface/API 거절 검증을 현행8 origin·전체관리자·PC/mobile로 정렬. 실제 로그인 성공 증거와 분리.
- [ ] 수동 실행·관리자 자격정보 소비0을 유지하며 frozen 설치와 shell 구문 수정. CI infrastructure 변경은 `AGENTS.md` §5의 별도 범위 확인 후 수행.
- [ ] local 직접 실행과 승인된 workflow 실행을 각각 확인한 뒤 새 결과 기록. 과거 WO/CHECK는 보존.

이번 단계에서는 승인되지 않은 새 CI infrastructure 변경이나 운영 계정 write를 수행하지 않았다.

## 이번 검증

Neture 기존 회귀5 suites57건은 PASS다(제한 계정, 서비스 신청, 미가입 대표 진입, 로그인 순환, 공개 홈 약관 gate).
API 기존 회귀3 suites78건도 Jest로 PASS다(로그인 자격, 공급자 상태 원장, 메인 자격 projection).
최초 Vitest 직접 실행은 Jest globals/TypeORM metadata가 없어 수집 단계에서 실패했다(테스트0).
저장소 API의 Jest runner로 정정했으며 이 최초 실패를 제품 결함이나 PASS로 기록하지 않는다.

실행 명령(저장소 root, API는 해당 앱 디렉터리):

```bash
pnpm exec vitest run --config services/web-neture/vitest.config.mjs services/web-neture/src/components/auth/__tests__/ServiceApplyPanel.restricted-account.test.tsx services/web-neture/src/components/auth/__tests__/ServiceApplyPanel.test.tsx services/web-neture/src/pages/auth/__tests__/ServiceEntryPage.nonmember.test.tsx services/web-neture/src/components/auth/__tests__/LoginRedirect.test.tsx services/web-neture/src/components/auth/__tests__/TermsAcceptanceGate.publicHome.test.tsx
cd apps/api-server
pnpm exec jest --config jest.config.cjs --runInBand --runTestsByPath src/common/auth/__tests__/serviceLoginEligibility.test.ts src/modules/neture/services/__tests__/neture-service-state.test.ts src/services/auth/__tests__/mainMembershipProjection.test.ts --silent
```

추가 테스트나 제품 코드 변경 없이 기존 로컬 회귀135건을 재확인했다. 일반 운영 상태 계정 검증과 구분한다.
문서 상대 링크와 diff·민감정보·stage 범위도 확인한다. 이번 문서4개 민감정보 패턴은0건이다.
DEPLOYMENT=NOT_APPLICABLE. main 통합·배포·DB 변경·새 정책 게시·실제 OAuth 검증은 이번 실행 대상이 아니다.
