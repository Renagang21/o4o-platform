# WO-O4O-HOME-MEMBERSHIP-DISCOVERY-V1

상태: 화면 수정·로컬 검증 완료 / 계정 식별·운영 조회 완료 / 데이터 보정 승인 완료·안전 실행 경로 구현 완료·운영 plan/apply 대기
기준: origin/main 5b2f6bd9ee · branch wo/home-membership-discovery

## 문제와 범위

사용자는 모든 서비스에 코드로 가입시킨 테스트 계정에서도 ‘다른 서비스 알아보기’가 보인다고 보고했다. 서비스 접근 권한과 실제 가입 원장을 구별하며, 임의 전체 가입 처리나 인가 우회로 감추지 않는다.

## TODO

- [x] 대표 홈의 가입 판정과 현재 테스트 계정 설정 경로 조사.
- [x] pharmacy 사업 원장만 있는 회원의 약국 카드를 미가입 목록에서 제외.
- [x] 미가입 서비스가 없으면 해당 영역 숨김. 가입 대상이 아닌 공개 도구·준비 중 서비스는 별도 노출.
- [x] 전체 가입·혼합 가입·원장 기준·조회 실패 회귀 테스트.
- [x] 사용자 문제 계정 식별 및 서버 가입 원장 대조. 사용자 답변: 매장 경영자 테스트 로그인 버튼 계정.
- [ ] 필요한 데이터 보정 대상·범위·복구안을 확정한 뒤 명시적 승인 하에 보정하고 실계정 확인.

## 계정 조사와 정정

현행 SETUP.md가 지정한 `docs/local/TEST-ACCOUNTS.local.md`는 전용 worktree와 기준 checkout 모두 없다. 공개 Demo 계정은 사용자 문제 계정으로 대체하지 않는다.

초기 조사에서 코드 정본의 공개 매장 경영자 Demo를 일반 로그인 API로 조회했으나, 그 계정이 사용자 문제 계정인지 확인되지 않았다. 따라서 이를 사용자 계정의 실측으로 보고하지 않는다. 공개 계정의 가입 목록은 neture·kpa-society·lecture active, 별도 사업은 pharmacy active이며 나머지 모든 서비스 가입의 근거가 되지 않는다. 기존 Demo 준비 코드도 계정별 최소 서비스만 지정한다. 이 결과로 사용자 계정 데이터 누락이나 화면 결함 중 하나를 단정하지 않는다.

운영 DB·가입 상태·role·credential 변경은 수행하지 않았다. 정확한 계정이 확인되기 전 추가 운영 로그인·권한 부여를 하지 않는다. 정상 가입을 거친 새 계정 생성은 이 문제 해결의 선행 조건이 아니다.

## 문서 정합

서비스 탐색 정본에 미가입 영역의 빈 상태·공개 도구 분리·pharmacy 원장 반영을 명시했다. 인증·인가·서비스 가입 계약과 Demo seed는 변경하지 않는다.


## 사용자 확인 후 확정한 운영 조회 (2026-10-20 UTC)

사용자가 문제 계정을 공개 매장 경영자 테스트 로그인 버튼 계정으로 명시했다. 따라서 앞서의 공개 Demo 조회가 문제 계정에 해당함이 확인됐다. 비공개 계정 파일을 요청한 차단 조건은 해소됐으며 그 파일 제공을 다시 요구하지 않는다. 로그인은 공통 코드 정본으로만 수행했고 자격정보·쿠키·원시 사용자 ID는 기록하지 않았다.

| 대상 | 운영 API 관찰 | 보정 목표 |
| --- | --- | --- |
| 메인·약국 서비스·강의 | active | 유지 |
| 내 매장·pharmacy 사업 | 기존 테스트 매장 접근 및 pharmacy active | 유지 |
| 일반 커뮤니티·펀딩 | 서비스 가입 없음 | 동일 Demo 사용자에 정상 원장 기준의 가입 상태 보정 |
| CarePharm·메가팜 | 사업 존재, 테스트 약국 가입 없음 | 기존 Demo 약국 조직에 각 사업 참여 원장 보정 |
| 공급자 | 서비스 가입·공급자 이용 상태 없음 | 가입 행만으로 승인된 공급자를 가장하지 않음. Demo 전용 공급자 자격·소유권까지 확인 후 준비 |
| 분회 | 서비스 가입 없음 | Demo 전용 분회 소속 대상과 가입 관계를 확인한 뒤 준비. 임의 실제 분회에 부여 금지 |
| 협동조합 | 현재 공개 조합 목록 0건, 내 가입 0건 | 존재하지 않는 조합 가입을 만들지 않음. 새 조합·사업 생성은 이번 보정에서 제외 |

관찰 출처: 일반 로그인 후 `GET /auth/services`, `GET /neture/home/entry`, `GET /communities`, `GET /neture/pharmacy/semi-franchises`, `GET /neture/cooperatives`. 응답 원문·개인 식별자·인증값은 산출물에 보관하지 않는다. 공개 목록 0건은 DB에 조합이 전혀 없다는 단정이 아니다.

## 승인된 데이터 보정 범위 — 운영 실행 대기

1. 대상은 registry의 활성 STORE_OWNER 1계정과 그 계정의 기존 Demo 약국 조직만이다. 같은 코드 정본의 로그인 식별자와 일치하고 owner 관계가 유일할 때만 진행한다.
2. 누락된 활성 서비스 가입과 CarePharm·메가팜 사업 참여를 보정한다. 기존 정지·반려·탈퇴 행을 무조건 active로 덮어쓰지 않는다. 기존 상태가 있으면 사유 확인 전 정지한다.
3. 공급자·분회는 서비스 가입 행을 넣는 것만으로 완료하지 않는다. Demo에 귀속된 합법적 샘플 대상과 관계가 확인되는 경우에만 필요한 자격을 보정하고, 없으면 추가 샘플 준비 대상으로 분리한다. 기존 공급자 Demo의 ownership을 이 계정으로 이동하거나 타 계정·실제 조직에 연결하지 않는다.
4. 일반 사용자, 다른 두 Demo, 관리자·운영자 역할, credential, 약관 동의, 상품·주문·콘텐츠 소유권은 변경하지 않는다. 신규 사업·협동조합·실제 분회 생성과 미승인 개인정보 입력도 제외한다.
5. 실제 DB 조회로 정확한 before-image·예상 쓰기 수·관계 경계·복구 자료를 확보하고 digest가 일치하는 단일 transaction에서만 적용한다. 데이터 복구 기능·행 단위 범위·사후 검증이 준비되기 전 쓰지 않는다. 인가 우회는 추가하지 않는다.
6. 적용 후 새 로그인으로 원장·업무 접근·상단 가입 서비스·하단 제외 여부를 검증한다. 가입 가능한 대상이 없는 협동조합을 임의 가입 처리해 목록을 숨기지 않는다.

`AGENTS.md` §5의 운영 write 확인에 대해 사용자가 “승인”이라고 명시했다(2026-10-20, KST). 이 계획 범위의 재승인을 요구하지 않는다. 검증된 실행 코드를 main에 통합한 뒤 read-only plan → 정확한 digest를 사용한 apply → 사후 조회 순서로 진행한다. main 통합을 데이터 보정 완료로 보고하지 않는다.


## 실행 구현과 검증

- 기존 운영 경로와 같은 main·repository owner·production environment·WIF identity·SQL proxy를 쓰는 전용 `demo-owner-participation.yml`을 추가했다. 기존 다목적 workflow는 이미 dispatch 입력 25개이므로 수정하지 않는다. 새 DB 권한·Secret·IAM·schema는 만들지 않는다.
- 기본은 read-only repeatable-read plan이다. apply는 main CI Gate 성공, DEPLOY_FREEZE=false, 정확한 plan digest가 필요하다. 기존 Demo 운영과 동일 concurrency group으로 직렬화한다.
- 데이터 변경은 고정된 community/funding service_memberships 및 기존 Demo 약국의 CarePharm/megapharm semi_franchise_memberships 중 없는 active 행만 추가한다. 정지·반려·탈퇴·대기는 중단한다. 자격 확인에 앞서 supplier/kpa-branch 가입 행을 만들지 않는다.
- registry 활성 STORE_OWNER 단일성·공통 코드 정본과의 일치·확인된 정상 계정·유일한 승인 약국 owner 관계·활성 메인 회원·사업 활성 상태를 확인한다. 다른 Demo 사용자와 credential·role·동의·소유권은 변경하지 않는다.
- 정확한 before-image와 새 행 ID를 기존 `canonical_demo_repair_snapshots`에 동일 transaction으로 보관한다. 실패 시 전체 rollback, 정상 재실행은 writes=0이다. 복구 자료 원문은 DB 내부에만 남기며 공개 산출물은 digest·집계·작업 종류만 포함한다. 사후 복구는 이 snapshot의 추가 행과 이후 참조를 검토한 보상 transaction으로 수행하고, 종속 데이터가 생겼다면 무조건 삭제하지 않는다.
- 공급자 조직 소유 관계·분회 active 관계도 같은 계정 범위로 조회하여 plan에 후보 수만 기록한다. 신규 사업·조합·분회·공급자 조직을 임의로 생성하지 않는다.
- PostgreSQL 15 독립 fixture 11개 테스트와 실제 workflow gate 3개 테스트 통과. API 타입 검사·변경 파일 lint 통과. fixture는 실제 운영 schema 전체 이식이 아닌, 관련 테이블의 SQL·FK·unique 제약을 재현한 전용 DB다. 실제 운영 결과는 이후 CHECK/PR에 기록한다.


## 운영 인증 경로 교정 (2026-10-20, KST)

PR #736은 main e8061c8096으로 병합됐고, 첫 read-only plan run 39428287852는 WIF의 attribute condition에서 거부됐다. DB proxy·SQL 조회·쓰기 실행 전 인증 단계 실패다. IAM 신뢰 범위를 넓히지 않는다.

기존 허용 workflow `pharmacyhub-qr-cutover.yml`에 mode 선택지 `demo-participation-plan` / `demo-participation-apply`만 추가하여 기존 인증 경로를 사용한다. `demo_accounts=true`를 함께 지정해야 하며 다른 작업·QR 경로와 조합하면 중단한다. 입력 개수는 기존 25개를 유지한다. apply는 기존 main·owner·unfrozen 조건에 더해 CI Gate 성공과 정확한 digest를 요구한다. 일반 Demo 계정 정렬의 기존 plan/apply 동작은 유지한다. 사용 불가능한 신규 workflow는 제거한다. IAM·Secret·schema·실행 계정·서비스 데이터 범위는 변경하지 않는다.

이 교정은 동일 WO의 운영 실행 단계이며 새 worktree/branch `wo/demo-owner-participation-operation`에서 시작했다. 데이터 보정에 대한 사용자 승인은 계속 유효하다. 운영 plan/apply 결과는 아직 대기 중이다.
