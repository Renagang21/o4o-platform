# 서비스 운영자·회원 관리 경계 수정 TODO

> **상태**: IMPLEMENTED (PR CI·통합 상태는 PR 최신 HEAD 참조)
> **작성일**: 2026-10-09 · **최종 갱신**: 2026-10-09
> **근거 WO/IR**: 사용자 구현·push 지시 및 [1차 조사](../investigations/IR-O4O-SERVICE-OPERATOR-AND-MEMBERSHIP-FIRST-INVESTIGATION-V1.md)

## 구현 범위

확인된 F1~F3의 권한·서비스 경계 결함을 수정한다. admin/operator의 새 권한 차이,
공통 계정 수정·복구 정책, branch/community의 서비스 전역 operator 신설은 결정 전 현행 유지한다.
새 DB 구조·migration·운영 데이터 변경·배포는 수행하지 않는다.

## TODO

- [x] 현행 지침·조사 결과·관련 소비처 확인
- [x] 인증 경로에서 JWT 역할 대신 최신 활성 DB 역할로 권한 판정
- [x] 회원 유형 수정의 대상 서비스 권한 검증
- [x] 상태·일괄 상태·복구 요청의 다중 서비스 fallback 차단
- [x] 회원 목록·상세의 serviceKey 적용과 다른 서비스 가입 정보·역할 노출 제한
- [x] 공통 상세·수정 화면의 serviceKey 전달 정비
- [x] 역할 해제·강등·다중 서비스·범위 외 수정 회귀 테스트
- [x] 관련 테스트·타입 검사·공통 패키지 빌드·문서 정합 검증
- [x] 변경 범위 점검·커밋·작업 브랜치 push·PR 준비
- [x] PR의 required CI 확인·리뷰 지적 수정 (최종 결과는 PR 최신 HEAD 참조)

## 소비처와 추가 조사 결과

Auth 인증 미들웨어는 전체 authenticated API·optionalAuth·requirePlatformUser에 공통 적용된다.
role_assignments.getRoleNames를 cache 없이 읽어 기존 token의 역할 해제·강등을 반영한다.
역할 DB 조회 실패는 인증 실패로 처리하며 JWT로 fallback하지 않는다.

공통 회원 API는 Neture·Pharmacy-Hub·KPA/공통 상세 UI·Admin 조회가 소비한다.
한 서비스 권한만 가진 기존 호출은 유일 서비스로 안전하게 한정할 수 있다.
다중 서비스 또는 플랫폼 권한에는 명시 serviceKey가 필요하며, 범위 없는 lifecycle 쓰기는 거부한다.
조회의 플랫폼 all=true는 명시된 기존 cross-service 계약을 유지한다.
membership ID 기반 승인·반려는 이미 대상 행이 특정되므로 별도 ID 계약을 유지한다.

## 완료 기준

동일 token으로 역할 회수·강등 후 이전 서비스/등급 접근이 차단된다.
명시 서비스 밖 회원 유형 변경은 쓰기 전에 거부된다.
다중 서비스 권한으로 범위 없는 상태 변경은 거부되고, 단일 서비스 요청은 그 서비스만 변경한다.
상세 조회·공통 UI도 선택한 서비스와 같은 경계를 사용한다.
main 병합은 사용자 별도 승인 후 수행한다.

## 로컬 검증 결과

- 인증·회원 경계 및 서비스 접근 관련 Jest: 13 suites / 220 tests PASS.
- 중앙 운영자 지정·역할 수정, branch/community 지정, 기존 회원 lifecycle 추가 회귀: 10 suites / 134 tests PASS (위 집합과 일부 중복).
- `packages/ui` Vitest: 2 files / 13 tests PASS.
- `operator-core-ui` Vitest: 5 files / 47 tests PASS.
- API·공통 UI·KPA Society·Pharmacy-Hub·Admin 타입 검사 PASS.
- 공통 패키지 전체 빌드 및 Neture production 빌드 PASS.
- unsafe route·TypeORM entity·문서 민감정보 검사, `git diff --check` PASS.

중앙 운영자 지정 API는 정상 판정하여 기존 동작을 유지했고 해당 회귀 테스트를 실행했다.
실제 운영 DB·로그인 계정으로 역할별 브라우저 E2E는 실행하지 않았다.
모의 역할 저장소·요청으로 동일 token의 다음 요청 권한을 검증했으며 운영 데이터 변경은 없다.
인증 요청마다 최신 역할 DB 조회가 한 번 추가되므로 운영 DB 지연·부하 영향은 배포 후 관측 대상이다.
Neture 빌드의 기존 Browserslist·chunk 크기 경고는 빌드를 차단하지 않았다.

## Git·배포

작업 브랜치: `wo/service-operator-membership-plan`.
main 병합·배포는 실행하지 않는다. PR required check는 현재 ruleset의 `CI Gate`다.
작업 worktree는 PR 미병합 상태에서 KEEP한다.

PR: [#371](https://github.com/Renagang21/o4o-platform/pull/371).
코드 커밋 `ce84c6ddc6`은 최신 main `0f8535d6b1` 기준으로 작업 브랜치에 push되었다.
로컬 검증은 완료했으며, 최종 PR CI·review 상태는 실행 후 확인한다.

## PR 리뷰 후 추가 수정

자동 리뷰 P1: 상세 내부 수정 모달의 추가 조회에도 `serviceKey`를 전달했다.
중앙 all-services 상세는 모달에서도 명시 `all=true`를 사용한다.
기존 테스트의 모달 mock을 제거하여 실제 상세 → 정보 수정 클릭 → 추가 조회와
서비스 선택 변경을 검증했다(`packages/ui`: 14 tests PASS).

자동 리뷰 P2: `kpa-society`/`k-cosmetics`는 membership canonical key와
역할 카탈로그 prefix가 다르므로 bare role 비교에 SSOT 역매핑 prefix를 전달했다.
목록·상세의 두 소비처 회귀를 추가했다(회원 경계 Jest: 15 tests PASS).
공통 UI/API 타입 검사 및 공통 UI 재빌드 PASS.

원격 최초 실행에서 Admin·영향 서비스 웹 빌드·CodeQL·문서 검사가 PASS했고,
후속 코드 수정 커밋은 최신 HEAD에 대한 필수 CI를 다시 실행한다.
배포 위험 판정은 `LEVEL_3`(인증·권한 변경)이므로 이후 API 배포는 통제 배포 대상이다.
이 문서는 구현·검증 실행 기록이며 최종 CI 상태는 위 PR을 기준으로 확인한다.

## 후속 단계 TODO — 최신 main 기준 (2026-10-09)

사용자 지시: 회원 관리 후속 단계를 전부 순서대로 진행한다. 기존 WO/PR #371의 연속 단계로 같은 전용 worktree·branch를 유지한다.
PR #374로 반영된 역할 회수·운영 scope·쓰기 경계는 유지하고 중복 변경을 제거한다.

- [x] 최신 main 통합 및 중복/충돌 분류
- [x] 서비스별 화면 → API → 역할 판정 → 데이터 경계 재조사
- [x] 회원 목록·상세 조회의 서비스 범위 및 공통 상세·수정 소비처 정비
- [x] 현재 회원 관리 업무별 admin/operator 권한 비교와 사용자 정책 확정
- [x] 결정된 정책 적용 및 공통 계정과 서비스 가입 변경 분리 검증
- [x] 서비스별·역할별 회귀, 타입 검사, 영향 빌드/화면 검증
- [x] PR 설명 최신화, commit/push, 최신 CI·리뷰 추적 (최종 판정은 PR 체크 기준)
- [x] 회원 관리 구현 후 개별 커뮤니티 운영자 후속 조사 지시서 정리

main 병합·배포는 새 PR 결과를 검토한 사용자의 통합 승인 후 진행한다. 새 권한 차이나 운영 DB 변경은 조사만으로 확정하지 않는다.

## 후속 1차 조사·수정 계획

main `240a2dfd42`의 인증·scope·회원 쓰기 보완을 통합했다. 인증 테스트의 추가 community 회수 회귀를 보존했다.
PR의 남은 코드 차이는 목록/상세에서 선택 서비스의 가입 정보·역할만 반환하고, 공통 상세/편집 화면이 같은 serviceKey로 조회하는 부분이다.
KPA·Cosmetics의 canonical membership key와 role prefix 차이는 security-core 역매핑을 사용한다.

| 서비스 | 현재 회원 관리 화면·API | 처리 |
|---|---|---|
| Neture | 공통 목록·상세 + 가입 승인 전용 API | 공통 조회 경계 적용, 전용 승인 공통 계정 쓰기는 정책 결정 대상 |
| Pharmacy-Hub | 공통 회원 목록·상세 + 별도 가입 신청 관리 | 공통 조회 경계 적용, 승인 서비스 공통 계정 쓰기는 정책 결정 대상 |
| KPA Society | 공통 상세 + 전용 회원 목록·정보·상태 변경 | 공통 상세 경계 적용, 전용 정보/상태의 공통 계정 쓰기는 추가 적용 대상 |
| K-Cosmetics | 공통 API·편집 소비처 잔재, workspace 은퇴 | 역할 prefix 매핑 회귀 유지, 은퇴 화면 복구 금지 |
| KPA Branch | 서비스 가입 승인과 분회 membership 관리 분리 | 기존 전용 승인 경계 유지, 승인 서비스 공통 계정 쓰기는 정책 결정 대상 |
| Community | 서비스 admin/operator 개설 심사·개체 운영자 지정, 개체 회원 조회 | main 역할 정책 유지, 서비스 가입 회원 콘솔과 개체 회원 관리 구분 필요 |
| Lecture | 강의·강사·수료 운영 화면, 일반 서비스 회원관리 화면 없음 | 일반 회원 콘솔 소비처 보완 TODO |
| Supplier/Funding | 사업 운영 화면, 자가 가입 비활성, 공통 회원 API 허용 | 운영자 지정으로 생성된 가입 포함 여부·일반 회원 콘솔 보완 TODO |

정상 유지: 중앙만 운영 tier를 지정·회수, 일반 계정 유지형 역할 해제, 선택 서비스의 상태 변경·탈퇴.
수정 완료: 공통 목록·상세의 타 서비스 가입/역할 노출, 실제 편집 모달의 serviceKey 누락.
정책 결정 후 적용: admin/operator 회원 업무 차이, 서비스 승인/재활성화의 users 상태 복구, 서비스 회원 편집의 공통 프로필 수정.

### 결정이 필요한 실제 쓰기 경로

- `MembershipApprovalService.approveMembership`: 서비스 가입 승인 시 users status/isActive도 활성화. Pharmacy-Hub·분회·공통 API가 사용.
- `MembershipApprovalService.reactivateMembership`: 서비스 재활성화 시 deleted 계정 복구, 플랫폼 권한에는 suspended 복구도 허용.
- `MembershipConsoleController`: 상태 단건/일괄 활성화 fallback에서 공통 users UPDATE.
- `neture/services/operator-registration.service.ts`: 전용 가입 승인에서 공통 users UPDATE.
- `kpa/controllers/member.controller.ts`: 승인 시 계정 활성화 및 회원 정보 변경에서 users name/nickname/businessInfo 쓰기.
- 공통 상세의 정보 수정·공통 목록 편집 모달: 이름·연락처·사업자 정보와 서비스 회원 유형을 같은 화면에서 편집.

공통 계정 상태·프로필을 중앙으로 한정할 경우 서버 차단과 함께 서비스 모달을 가입 정보 편집으로 바꿔야 한다.
일부 공통 API만 고치면 전용 Neture/KPA 승인·편집 경로가 남으므로 해당 소비처까지 함께 정비한다.
admin/operator 권한을 구분할 경우 버튼과 API guard를 함께 변경하며 장기 제한 등의 임의 정책을 만들지 않는다.
정책 질문은 사용자에게 전달했으며 답변 전에는 이러한 쓰기 정책을 변경하지 않는다.

### 최신 로컬 검증

- 회원 조회·쓰기·회수 경계 Jest 5 suites / 83 tests PASS. 8개 서비스 role prefix 및 플랫폼 all=true 경계 포함.
- 공통 상세 UI Vitest 2 files / 14 tests, 공통 운영 UI Vitest 5 files / 47 tests PASS.
- 공통 패키지 전체 빌드, API·공통 UI·operator-core-ui 타입 검사 PASS.
- frozen install 재검증, dependency/lockfile 변경 없음.

개별 커뮤니티 운영자 조사는 회원 관리 완료 후 진행한다. 이번 단계에서 콘텐츠·업무 운영으로 확대하지 않는다.


## 후속 정책 확정·구현 (2026-10-09 사용자 답변)

사용자는 operator의 회원 업무를 조회·승인·반려로, 정지·해제·서비스 탈퇴를 admin으로 확정했다.
공통 프로필 수정은 서비스 운영자에게 유지하고 공통 계정 상태 복구만 중앙 계정 관리로 한정했다.
위 조사 당시의 정책 미정 항목은 이 결정으로 대체한다.

- 서버: 회원 lifecycle guard, 활성 회원 반려의 admin 판정, 잠긴 현재 상태 기반 KPA 심사 경계.
- 계정: 공통 승인·복구, Neture 전용 승인, KPA 승인에서 users 활성 상태 쓰기 제거. 프로필 수정 유지.
- 운영 권한: 가입 lifecycle이 중앙 운영 tier를 부여·복구·회수하지 않도록 분리. 비활성 가입의 현재 DB 접근 차단.
- 화면: 공통 목록·상세의 admin lifecycle 버튼 및 서버 정책 정렬, operator 공통 프로필 편집 유지.
- 소비처: Neture·KPA·Pharmacy-Hub 기존 화면 적용. Lecture·Supplier·Funding·Community에 서비스 가입 회원 콘솔 연결.
- 서브도메인: 신규 회원 목록·상세를 해당 호스트 소유 경로에 등록. 기존 사업 운영 대표 진입은 유지.
- 은퇴: K-Cosmetics workspace를 복구하지 않고 공통 API의 canonical key/role prefix 회귀만 유지.
- DB migration·운영 데이터 변경·dependency/lockfile 변경 없음.

권한 완료 기준: operator의 제한 업무 직접 API 요청 차단, 타 서비스 admin 권한 재사용 차단,
승인/복구의 공통 계정 상태 불변, 중앙 회수 역할 미복구, 서비스 탈퇴의 중앙 운영자 지정 보존.
실 사용자·운영 DB E2E는 수행하지 않는다. 로컬 테스트와 synthetic mock API 브라우저 검증을 구분해 보고한다.

### 개별 커뮤니티 운영자 후속 조사 지시서

회원 관리 정비 이후 별도 작업으로 조사한다. 이번 PR은 개별 커뮤니티 운영 기능을 변경하지 않는다.

1. 중앙 service admin/operator 지정과 community_memberships의 개체 operator/admin을 구분한다.
2. 개설 심사 화면·API, 개별 운영자 지정/변경/해제 화면·API, 그 역할의 실제 저장·접근 판정을 연결한다.
3. 서비스 운영자와 개체 운영자의 회원 조회·승인·반려·정지·해제·탈퇴 업무를 실제 제공 기능으로 비교한다.
4. 개체 운영자 해제 후 기존 로그인 접근, 여러 개체 운영, 타 개체 접근, 공통 계정 영향 여부를 확인한다.
5. 정상/결함/중복·레거시/정책 미정으로 분류한 뒤 수정 계획을 작성한다. 정책은 조사만으로 확정하지 않는다.
6. 회원 관리 외 콘텐츠·업무 운영은 별도 범위로 둔다.


### 정책 반영 로컬 검증

- API 회원 관리/승인/권한 Jest: 15 suites, 293 tests PASS; 실제 역할 소유 서비스 판정 3개 회귀 추가 PASS. 별도 Neture integration 1 suite/3 tests는 기존 skip(운영 DB 미접속).
- Neture 전용 가입 승인 회귀 13 tests에서 공통 users 상태 쓰기 0을 검증한다.
- UI: 공통 상세 19, 공통 운영 UI 53, Neture 378, KPA 71, Lecture 2 tests PASS.
- API·operator-core-ui·KPA·Pharmacy-Hub 타입 검사, Neture·Lecture·KPA production build PASS.
- unsafe route 검사 1,163 files / 위반 0. frozen install 및 공통 패키지 빌드 PASS.
- mock API browser: Supplier/Funding/Community/Lecture × admin/operator × desktop 1440/mobile 390 = 16 조합 PASS.
  실제 목록·drawer·상세, operator 프로필 수정, 같은 서비스 admin의 정지/탈퇴 버튼을 확인했다.
- 중앙 서비스 운영자 지정·변경·회수는 main PR #374의 구현/검증을 유지한다.

현재 단계: 구현·로컬 검증·commit/push 완료. 최신 CI 및 미해결 리뷰의 최종 판정은 PR #371 체크를 기준으로 한다.
main 통합·배포와 실제 역할 계정 smoke는 별도 통합 승인 이후 절차다.


최종 권한 점검: 다중 서비스 admin/operator의 일반 역할 변경에서 body serviceKey로
역할 소유 서비스를 위장하는 우회를 차단했다. namespaced role은 그 prefix를, bare role은
실제 카탈로그의 canonical service key를 기준으로 admin 권한을 검증한다.
관련 middleware/role controller 회귀 2 suites / 53 tests 및 API 타입 검사 PASS.


### 최신 main 은퇴 정합 (PR #375 반영)

검증 후 main이 `8fa26f9293`으로 이동하면서 Pharmacy-Hub 웹 앱·전용 API·배포 대상이 은퇴했다.
통합은 같은 WO의 branch에서 수행했고 modify/delete 충돌은 main의 전체 앱 삭제를 유지했다.
이 PR의 Pharmacy-Hub 화면 변경은 최종 diff에서 제거되며 서비스 또는 dependency를 복구하지 않는다.
위 Pharmacy-Hub 타입 검사·화면 조사 기록은 은퇴 전 시점의 검증이다. 공통 API의 역사적 service key
경계 회귀는 유지하며 현재 서비스 화면의 완료 근거로 사용하지 않는다.
Neture·KPA·Lecture·Supplier·Funding·Community 소비처와 공통/API 경계를 최신 main 기준으로 재검증한다.


최신 main 통합 후 검증: API 16 suites / 309 tests, Neture 46 files / 378 tests PASS.
API 타입 검사, Neture·Lecture production build, frozen install PASS.
unsafe routes 1,132 files / 위반 0. 기존 공통 UI·KPA 변경 경로는 main 은퇴 작업과 겹치지 않는다.


추가 경계 검증: operator의 역할 목록 GET은 유지하고 역할 변경만 admin으로 제한한다.
다른 서비스 prefix의 회원 유형 저장은 거부하며, legacy 오염 값이 남아 있어도
승인·복구·정지가 다른 서비스의 role_assignments를 변경하지 않도록 공통 lifecycle 매핑을 제한한다.
운영 데이터 정리는 수행하지 않으며 새 호환 역할이나 변환 테이블을 만들지 않는다.

최종 추가 경계까지 포함한 API 회귀: 16 suites / 314 tests PASS. API 타입 검사 PASS.
