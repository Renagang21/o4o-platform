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

- [ ] 최신 main 통합 및 중복/충돌 분류
- [ ] 서비스별 화면 → API → 역할 판정 → 데이터 경계 재조사
- [ ] 회원 목록·상세 조회의 서비스 범위 및 공통 상세·수정 소비처 정비
- [ ] 현재 회원 관리 업무별 admin/operator 권한 비교와 정책 미정 항목 확인
- [ ] 결정된 정책 적용 및 공통 계정과 서비스 가입 변경 분리 검증
- [ ] 서비스별·역할별 회귀, 타입 검사, 영향 빌드/화면 검증
- [ ] PR 설명 최신화, commit/push, 최신 CI·리뷰 확인
- [ ] 회원 관리 완료 후 개별 커뮤니티 운영자 후속 조사 항목 정리

main 병합·배포는 새 PR 결과를 검토한 사용자의 통합 승인 후 진행한다. 새 권한 차이나 운영 DB 변경은 조사만으로 확정하지 않는다.
