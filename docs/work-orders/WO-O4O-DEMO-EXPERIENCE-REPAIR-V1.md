# WO-O4O-DEMO-EXPERIENCE-REPAIR-V1

> **상태**: ACTIVE · **작성일**: 2026-10-09 KST
> **근거**: 사용자 지시 — 발견한 문제를 모두 해소하고 해결 방법 제시
> **상위 작업**: [인증 리팩토링](WO-O4O-AUTH-REFACTOR-V1.md)
> **정책**: [인증·가입](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md), [약국 매장 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md), [Demo](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md)

## 목표와 범위

메인 로그인 모달의 두 Demo 버튼으로 실제 업무 공간에 들어가 샘플 기능을 사용할 수 있게 한다. 인증 HTTP 200, 화면 이동, 업무 API 인가, 데이터 체험은 각각 검증한다. 약국장 Demo의 이동 실패·`403 STORE_OWNER_REQUIRED`, 공급자의 상품/자료 0건, 같은 서브도메인의 다른 브라우저 refresh 폐기를 모두 추적한다.

Pharmacy-Hub는 사용자 지정 삭제 대상이므로 인증·Demo 검증에서 제외한다. 별도 약국 서비스 `pharmacy.neture.co.kr`는 유지한다. Pharmacy-Hub 제거는 의존 관계·보존 데이터 확인 후 별도 정리로 처리한다. 카카오·소셜 연결·비밀번호 처리는 상위 인증 WO의 후속 단계이며 이번 Demo 문제 해결 완료와 혼동하지 않는다.

## 실행 순서와 TODO

### 1. 매장 진입 코드 정합

- [x] 최신 `origin/main`에서 API·홈 카드·Demo 모달·handoff 소비처 재조사
- [x] 홈의 약국 매장 후보를 약국 업무 guard와 같은 승인 원장·조직 소유 관계로 판정 — KPA 개인 가입/옛 역할을 추가 요구하지 않음
- [x] UI에서 서버가 반환한 약국을 KPA 개인 membership으로 다시 제거하지 않음
- [x] 약국 매장 카드와 Demo 자동 진입을 기존 Store workspace handoff로 연결; 약사 커뮤니티 등 서비스 handoff는 유지
- [ ] 코드 검증·push·PR·필수 CI·review 확인
- [ ] 사용자 승인 후 main 통합·현재 Delivery 정책에 따른 배포·운영 재검증

### 2. 실제 Demo 데이터 연결 복구

- [x] 이전 운영 DB 접근 경로·대상 조사 — 기존 Demo CHECK의 Cloud SQL 생성·보완 기록, SETUP의 운영 Auth Proxy, deploy-api의 Cloud SQL/Secret 연결 확인
- [x] 기존 GitHub Actions WIF 인증 경로 현재 성공 확인 — [read-only smoke](https://github.com/Renagang21/o4o-platform/actions/runs/37853330812); DB write/배포 없음
- [ ] 기존 운영 절차를 사용할 현재 DB 실행 경로 확인 — 현재 checkout의 `.env`는 로컬 DB 포트이며 연결 거절, 이 환경의 GCP identity manifest 연결 목록은 비어 있음. WIF 인증 성공만으로 직접 DB 조회 권한/실행을 주장하지 않음
- [ ] read-only census: 두 `demo_accounts` 주체, 활성 조직 소속, 약국 승인 원장, 공급자 원장, 기존 샘플 상품·자료·매장 자산·주문/FK 연결 조사
- [ ] 기존 테스트 데이터를 대상으로 보존·이관·삭제 계획과 변경 전 복구 자료 준비; 실행 전에 정확한 행과 건수 확정
- [ ] 약국장 Demo가 소유한 조직을 승인 원장과 연결; KPA 가입이나 관리자 역할을 부여하여 403을 우회하지 않음
- [ ] 공급자 Demo의 조직/원장과 재사용할 상품·라이브러리 자료 ownership 연결; 자료별 공개·서비스 접근 조건 확인
- [ ] 대상 한정 transaction·반복 실행·무결성 검사 후 적용; 실패 시 이번 변경만 복구
- [ ] 업무 체험 성공 후 미사용 테스트 데이터·불필요 계정 정리

기존 `demo-account-provision.ts`는 과거 고정 조직 prefix와 보호 대상 가정을 포함한다. 현재 데이터 census 전에 그대로 `--apply`하지 않는다. 원장이 없다는 사실과 기존 원장의 상태가 비활성인 경우를 구분하고, 대표 Demo 등록 확인 없이 다른 조직의 승인/소유권을 변경하지 않는다. 이 작업의 데이터 계획은 실제 조회 결과로 확정하며, 추정으로 샘플 데이터를 덮어쓰지 않는다.

운영 접속 정본은 [SETUP의 운영 Proxy 절차](../../SETUP.md#3-개발-시작-매일), 이전 실행 근거는 [Demo 구축 CHECK](../checks/CHECK-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1.md) §2-8·역할 보완 기록이다. 현재 배포 코드는 `.github/workflows/deploy-api.yml`에서 Cloud SQL socket과 `GCP_DB_USERNAME`/`GCP_DB_NAME`, Secret Manager의 `o4o-db-password`로 연결한다. 이는 실제 연결 경로의 근거이며 일반 migration Job을 임의 데이터 복구 명령으로 바꾸는 허가가 아니다. 기존 Proxy 운영 환경 재사용 또는 WIF 경로의 대상 한정 maintenance 실행안을 준비하고, read-only census → 복구 자료 → 확정 대상 적용 순서로 진행한다. 연결값이나 credential 파일 내용을 공개 기록에 복사하지 않는다.

### 3. 브라우저별 세션 종료

- [ ] 상위 인증 WO 단계 2에서 access/refresh/handoff의 세션 식별과 폐기 소비처 조사
- [ ] 일반 logout을 현재 서브도메인의 현재 브라우저 세션 폐기로 교체; 서비스 전체 epoch 폐기를 일반 logout에 사용하지 않음
- [ ] logout한 브라우저의 refresh/handoff 재발급 차단, 같은 서브도메인의 다른 브라우저 및 다른 서브도메인 세션 유지 검증
- [ ] 비밀번호 변경/reset의 전역 보안 폐기는 유지하고 access token 판정·늦은 refresh 응답도 검증

### 4. 운영 완료 판정

- [ ] 배포된 serving SHA 확인 후 **메인 헤더 로그인 모달**에서 두 Demo 버튼 클릭, desktop/mobile 각각 검사
- [ ] 약국장: 이동 오류 없음 → 실제 Store 진입 → 본인 약국 선택/내 매장 → capabilities/info 정상 응답·업무 데이터 표시
- [ ] 공급자: 대시보드 → 상품·라이브러리 → 연결한 샘플 표시와 해당 기능 동작 확인
- [ ] 유지 서비스 로그인 화면의 두 버튼, 정상 logout, 같은/다른 서브도메인 브라우저 분리 회귀
- [ ] 실패 안내·403·빈 목록을 인증 성공으로 덮지 않고 CHECK에 기능별 PASS/FAIL 기록

## 작업공간과 적용 경계

`cloud-environment-onboarding:setup`의 기존 격리 클라우드 checkout 사용 지침에 따라 별도 worktree 없이 최신 `origin/main` (`7202a56b73c1ea0327e987fe5f654730c4816b1b`)에서 `wo/auth-demo-entry-repair`를 생성했다. 기존 운영 검증 문서 PR #363의 branch는 보존하며 이 코드 수정에 재사용하지 않는다.

이번 PR은 1단계 코드 정합과 나머지 실행 계획이다. DB write·schema migration·운영 배포·세션 구현·Pharmacy-Hub 실제 삭제는 수행하지 않는다. 로컬 fixture 성공은 운영 데이터 복구 성공을 증명하지 않는다. main 통합은 사용자 승인 후 PR merge로만 진행한다.

검증 기록: [CHECK-O4O-DEMO-EXPERIENCE-REPAIR-V1](../checks/CHECK-O4O-DEMO-EXPERIENCE-REPAIR-V1.md).
