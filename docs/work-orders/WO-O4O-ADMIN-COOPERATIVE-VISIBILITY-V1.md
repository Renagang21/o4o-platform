# WO-O4O-ADMIN-COOPERATIVE-VISIBILITY-V1

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

- 상태: ACTIVE
- 작성·최종 갱신: 2026-10-19 (KST)
- 기준: main `491be1bb82c5b9788ff97020d0e0430939be11b6`
- 사용자 지시: `admin.neture.co.kr/admin/semi-franchises`에 빠진 약사·약국 협동조합 정비. 후속 답변으로 **연합회만** 확정.

## TODO

- [x] 현재 main·메뉴·공용 화면·서비스 선택·운영자 역할·사업/조합 원장 연결 조사
- [x] 일반 사업·연합회·개별 조합의 차이 확인
- [x] 사용자 답변 반영: 개별 조합 목록·상태·조합원 집계 제외
- [x] 연합회 진입과 기존 Admin·Operator 지정 화면 연결, 지정 현황 표시
- [x] UI·API 권한·SQL·PC/모바일 검증
- [x] commit·push·PR #710 CI·리뷰·main 병합
- [x] 운영 배포·서빙 SHA 확인 및 결과 기록
- [ ] 사용자 Google 관리자 세션으로 연합회 역할 현황 조회·새로고침 검증 — 확인 후 WO 종료

## 조사 결과

- `AdminSemiFranchisePage`의 등록 선택은 pharmacy/carepharm/drugstore 3개이며 pharmcoop을 의도적으로 제외한다.
- 운영자 지정에는 `neture:pharmcoop_admin`과 `neture:pharmcoop_operator`가 이미 있다. 역할만으로 사업이나 조합 행이 생성되지는 않는다.
- 일반 사업은 `semi_franchises`, 개별 조합은 `cooperatives.semi_franchise_id`로 그 사업에 연결한다. 개인 조합원은 별도 `cooperative_memberships`이며 약국 조직 가입과 구분한다.
- 기존 `GET /neture/cooperatives`는 조합과 연결 사업이 모두 활성인 공개 디렉토리다. 관리자 연합회 현황의 근거로 사용하지 않는다. 조사 시 공개 조회는 HTTP 200/활성 조합 0건이었으며 전체 조합 부재를 뜻하지 않는다.
- 일반 사업 생성 API는 `cooperatives`를 생성하지 않는다. 연합회 누락을 `pharmcoop` 일반 사업 한 행 생성으로 대체하지 않는다.

## 구현 범위

기존 관리자 주소에 ‘약국 협력사업 / 약국·약사 협동조합 연합회’ 선택을 추가한다. 기본 화면은 기존 약국 협력사업 설정이다. 연합회 화면은 서비스 열기, 기존 `/operators`의 Admin·Operator 지정 화면 연결, 현재 유효한 연합회 역할 지정 현황만 제공한다. `?register=pharmcoop`도 일반 사업 생성 폼 대신 연합회 화면으로 연다.

`GET /api/v1/neture/admin/cooperative-federation`은 `requireAuth`와 `platform:super_admin` guard를 사용하는 읽기 전용 API다. 연합회 두 역할만 계정·서비스 가입 상태와 함께 조회하며 응답은 `private, no-store`다. 만료·미래·해제된 역할은 제외하고 유효 역할 지정과 메인 이용 자격은 구분해 표시한다. 이름 누락 시 이메일, 둘 다 누락 시 ‘이름 미등록’을 표시한다. 조회 실패는 지정자 없음으로 표시하지 않고 재시도를 제공한다.

사용자 확정 범위에 따라 이 API는 개별 조합·사업·조합원 테이블을 조회하지 않는다. 개별 조합 목록·상태·수·가입·승인·신규 등록 UI는 추가하지 않는다. 공용 `operator-core-ui`는 변경하지 않는다.

## 데이터·서비스 경계

운영 데이터 생성·변경·삭제, 역할 자동 부여, migration은 없다. 공개 디렉토리·개별 조합 운영·실제 접근 판정과 기존 역할 지정 계약을 변경하지 않는다. 실제 Google 인증은 사용자 브라우저에서 하며 자격증명 전달을 요구하지 않는다.

## 최종 코드 검증

- admin 전체 Vitest: 직렬 25 files / 420 tests PASS.
- API HTTP 회귀: 6 tests PASS. 실제 role guard, 비로그인 401/서비스 운영자 403/플랫폼 관리자 200, private/no-store, 원시 계정 필드 제외, 단일 SELECT 및 개별 조합·사업·조합원 미조회.
- admin type-check·운영용 build, API TypeScript build PASS. 변경 파일 lint 오류 0/기존 경고 1. 문서 민감정보 검사 PASS.
- 별도 메모리 PostgreSQL(PGlite)에서 실제 최종 SQL PASS: 유효 Admin/Operator, 만료·미래·해제·다른 사업 역할 제외, 이름 대체와 계정 자격, 단일 SELECT/개별 조합·사업·조합원 미조회. 운영 PostgreSQL major 차이는 검증 한계이며 검증 dependency는 저장소 밖 임시 경로에만 설치했다. 검증 데이터는 메모리 DB 종료로 제거했다.
- 실제 production admin App + 합성 API, Chromium 1440px/390px PASS: 탭·직접 URL·새로고침·역할/자격·오류/재시도·지정자 없음·기존 사업 화면 복귀. 개별 조합 관리·쓰기 요청 0, pageerror 0.
- 운영 Google 관리자 세션 검증은 미실시다. 운영 데이터 변경은 없다.

## main 통합

- PR [#710](https://github.com/Renagang21/o4o-platform/pull/710), merge `ff59bc43d19136db0eca806c8ed17766028a0319`.
- 범위 축소 commit `87e1dabe113df5517145774d37a2dd2087332ee4`: PR CI `39254640912` PASS, Codex 지적 없음.
- 다른 작업 PR #709가 먼저 병합되어 최신 main `4212290d8ce9f8e4fca3217350a0441cd354d6fe`를 같은 branch에 merge했다. 이번 8개 파일의 내용은 동일하고 main 대비 Store 파일 변경은 없다.
- 통합 HEAD `2057b52bcfaa9d4a1ab12a3587cde1f412d510f8`: PR CI `39256223434` PASS, CodeQL·Sonar PASS, 해당 HEAD Codex 지적 및 미해결 스레드 없음.
- Store Delivery `39257011394`의 `DEPLOYED · deploy: store` 확인 후 이번 PR을 순차 병합했다. 운영 데이터·역할·migration 변경 없음.
- 병합 commit CI `39257847505` PASS. 운영 배포 결과는 아래와 같다.

## 운영 배포·확인

- Delivery [39259373722](https://github.com/Renagang21/o4o-platform/actions/runs/39259373722) SUCCESS. 최종 production status: `DEPLOYED · deploy: api,admin`.
- API 먼저 배포·검증한 후 관리자 배포를 수행했다. `Final serving SHA → DEPLOYED / FAILED` 단계에서 API·관리자의 목표 SHA `ff59bc43d19136db0eca806c8ed17766028a0319` 서빙을 확인했다. 다른 web 서비스는 이 배포 대상이 아니다.
- 운영 `/admin/semi-franchises` 및 `?section=cooperatives` HTTP 200. 실제 배포 JS에서 연합회 탭·운영자 지정 링크·새 API 경로 확인.
- API `/health` HTTP 200. 비로그인 연합회 API 요청은 HTTP 401로 차단된다. 이 응답만으로 인증 후 DB 조회 성공을 주장하지 않는다.
- 실제 Google 관리자 세션으로 역할 현황을 조회하는 운영 브라우저 검증은 남아 있다. 사용자 인증값 제공이나 운영 데이터 정비를 요구·수행하지 않았다. 새 migration은 없다.

## 다른 작업과의 경계·Git 정리

- 이번 배포 중 다른 공간의 PR #713이 main `40c8f9d6e030de142730a9da1e95b6f07e1e97db`에 별도로 병합됐다. 이번 Delivery는 이미 고정한 `ff59bc43d1`을 배포했으며 PR #713을 배포하거나 promote하지 않았다.
- 코드 branch `wo/admin-cooperative-visibility`는 main의 조상이며 `git log origin/main..wo/admin-cooperative-visibility`가 비어 있다. 경로 diff 0은 squash 병합 시의 대체 확인이므로, 이후 main의 동일 파일 변경을 보존 사유로 사용한 이전 판정을 정정했다. 코드 branch를 사용하는 worktree·남은 전용 commit이 없음을 확인하고 로컬·원격 branch를 표준 절차로 삭제했다. Google 세션 검증은 배포된 화면에서 진행하며 이 코드 branch를 필요로 하지 않는다. 관리형 checkout은 보존한다.
- 검증용 로컬 preview 서버는 종료했다. 격리 SQL 검증 데이터는 메모리 DB 종료로 제거했다.
- 검증·배포 기록은 문서 전용 PR #714로 통합한다. 별도 공간의 PR #713은 Promote `39261558005`에서 API 배포를 마쳤고, 후속 main `51f772caa8`은 Delivery `39263847909`에서 `NO_DEPLOY`로 종료됐다. 이 기록 PR에서 별도 migration이나 재배포를 수행하지 않는다.
- 문서 정합: 사용자 확정 범위인 연합회만 기록했다. 범위 내 추가 불일치 없음. 과거 작업 문서나 canonical 판정은 변경하지 않았다.

## 남은 운영 인증 검증

- 현재 유일한 관리형 checkout의 `docs/local/TEST-ACCOUNTS.local.md`는 없다. 환경의 비관리자 테스트 계정 연결을 Google 관리자 인증 대신 사용하지 않는다.
- 사용자가 자신의 Google 관리자 세션으로 연합회 화면 진입 → 실제 역할 현황 표시 → 새로고침 후 유지 여부를 확인해야 한다. 사용자 인증값 전달·임의 권한 부여는 요구하지 않는다.
- 이 확인이 끝나기 전까지 WO는 `ACTIVE`로 유지한다. 구현·배포 완료와 인증 후 운영 DB 조회 검증을 구분하며, 미실시 검증을 통과로 기록하지 않는다.
