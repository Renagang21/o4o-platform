# WO-O4O-HOME-MEMBERSHIP-DISCOVERY-V1

> 상태: **COMPLETED** · 완료: 2026-10-20 (KST) · 검증: [CHECK](../checks/CHECK-O4O-HOME-MEMBERSHIP-DISCOVERY-V1.md)

## 문제와 승인 범위

사용자가 전체 서비스 가입용으로 준비했다고 설명한 계정은 **매장 경영자 테스트 로그인 버튼의 공개 STORE_OWNER**였다. 초기에는 같은 계정인지 확인되지 않았으나 사용자 답변으로 식별을 확정했다. 비공개 계정 파일 제공은 더 이상 선행 조건이 아니다.

운영 조회에서는 neture·kpa-society·lecture 서비스 가입과 pharmacy 사업 참여만 active였다. community·funding 가입, CarePharm·메가팜 참여는 누락돼 있었다. 기존 준비 코드의 최소 가입 목록과 실제 원장도 일치하지 않았다. 구체적인 누락 발생 시점이나 삭제 주체까지 확정한 것은 아니다.

사용자는 이 계정과 기존 Demo 약국에 대한 가입·참여 보정 계획을 명시적으로 승인했다. 다른 Demo의 소유권 이전, 관리자·운영자 권한 부여, credential·약관 동의 수정, 신규 사업·조합·분회·공급자 조직 생성은 범위에서 제외했다. 새 실제 계정 생성은 필요하지 않았다.

## TODO — 완료

- [x] 실제 계정과 가입·사업·소속 원장 확인.
- [x] pharmacy 사업 원장만 있는 회원의 중복 미가입 카드 제거.
- [x] 미가입 서비스가 없으면 해당 영역 숨김. 공개 도구·준비 중 서비스 분리.
- [x] 로컬 회귀·타입·빌드·lint 및 운영 실행 제한 검증.
- [x] 복구 자료와 정확한 before-image digest를 사용하는 제한된 실행 경로 준비.
- [x] 승인된 네 가입·참여 행 및 복구 기록 한 행 원자적 적용.
- [x] 서버 이용 자격·운영 브라우저 분류·후속 plan 변경 0 확인.
- [x] 코드 PR #736·실행 경로 교정 PR #741 main 통합, CI 및 필요한 배포 확인.

## 결과

| 대상 | 보정 전 | 보정 후 |
| --- | --- | --- |
| 메인·약국·강의 서비스 | active | 유지 |
| 내 매장·pharmacy 사업 | 기존 Demo 약국·active | 유지 |
| 일반 커뮤니티·펀딩 | 가입 없음 | active 서비스 가입 추가 |
| CarePharm·메가팜 | 사업 존재, Demo 약국 참여 없음 | 기존 Demo 약국의 active 참여 추가 |
| 공급자 | 자격 후보 0·이용 상태 none | 유지, 가입한 것으로 가장하지 않음 |
| 분회 | 활성 소속 후보 0 | 유지, 실제 분회에 임의 연결하지 않음 |
| 협동조합 | 내 가입 0·공개 목록 0 | 유지, 새 조합 생성·가상 가입 없음 |

따라서 이 계정을 **모든 서비스 가입 완료**라고 표시하지 않는다. 공급자·분회·협동조합은 실제 미가입/자격 미준비 항목이므로 ‘다른 서비스 알아보기’에 남는다. 이번에 보정한 네 항목은 가입 목록으로 올라가고 미가입 목록에서 제거됐다. 향후 테스트 전용 공급자·분회·조합 자격을 준비하는 작업은 이번 승인 범위 밖이다. 공개 조합 목록 0은 DB에 조합이 전혀 없다는 단정이 아니다.

## 데이터 안전과 현행 실행 경로

활성 STORE_OWNER registry 단일성, 공통 코드 정본과의 일치, 정상·이메일 확인 계정, 유일한 승인 Demo 약국 owner 관계, 활성 메인 가입 및 두 사업 상태를 확인한다. 기존 pending/suspended/rejected/withdrawn 등 비활성 행은 active로 덮어쓰지 않는다.

기본 plan은 repeatable-read read-only다. apply는 정확한 digest와 serializable transaction을 사용하며, 누락된 community/funding service_memberships와 CarePharm/megapharm semi_franchise_memberships만 INSERT한다. 기존 행을 수정하지 않고 before-image와 추가 행 ID를 기존 비공개 canonical_demo_repair_snapshots에 같은 transaction으로 저장한다. 실패 시 전부 rollback하며 사후 검증 후 commit한다. 복구 시에는 snapshot과 이후 종속 참조를 검토한 보상 transaction을 사용하며 무조건 삭제하지 않는다.

초기 별도 workflow의 plan(run 39428287852)은 WIF attribute condition에서 거부돼 DB proxy·SQL 전 인증 단계에서 끝났다. IAM을 확대하지 않고 기존 신뢰 경로로 교정했다. 기존 경로의 읽기 전용 census(run 39429261764)도 성공했다.

현행 실행은 `pharmacyhub-qr-cutover.yml`의 mode `demo-participation-plan` 또는 `demo-participation-apply`와 `demo_accounts=true` 조합이다. 입력 개수 25개와 기존 WIF identity·production environment·공유 유지보수 lock을 유지한다. 다른 작업·QR 경로와 조합할 수 없으며 owner/main 제한, apply의 DEPLOY_FREEZE=false·CI Gate 성공·정확한 digest 검증을 통과해야 한다. 기존 일반 Demo plan/apply 동작은 유지한다.

## 운영 근거

- PR #736: main `e8061c8096` · PR CI 39426499362 · main CI 39428275674 성공.
- Neture Delivery 39429814238 성공, production `DEPLOYED · deploy: neture`.
- PR #741: main `1adb485fd2` · PR CI 39429145857 · main CI 39430845847 성공.
- 실행 경로 교정 Delivery 39432434701 성공, `NO_DEPLOY`(앱 변경 없음).
- 운영 plan 39430935546: 참여 행 4개 추가, 공급자/분회 후보 0.
- 운영 apply 39432654235: verified=true, 참여 4행 + 복구 1행, 총 writes=5.
- 사후 plan 39433015053: 네 대상 모두 preserve, participationWrites=0.

## 검증과 문서 정합

40개 홈 회귀, 11개 독립 PostgreSQL 15 검증, 최종 실행 제한 회귀 5개 및 타입·빌드·lint가 통과했다. 실제 계정의 신규 API 로그인으로 가입/사업 이용 자격과 운영 화면 1440/390/320px 분류를 확인했다. 브라우저 로그인 버튼 자체의 전체 클릭 흐름·다른 서브도메인의 전체 업무·AI/주문 실행은 PASS로 주장하지 않는다.

서비스 탐색·Demo 정본에 승인된 정책을 반영했고 실제 적용 결과는 이 WO와 CHECK에 정리했다. 인증·인가 계약, role, credential, 동의, 다른 계정 및 상품·주문·콘텐츠 소유권은 변경하지 않았다. 로컬 독립 DB와 볼륨은 정리했다. 반복 실행·복구 시 참조할 문서이므로 archive로 이동하지 않는다.
