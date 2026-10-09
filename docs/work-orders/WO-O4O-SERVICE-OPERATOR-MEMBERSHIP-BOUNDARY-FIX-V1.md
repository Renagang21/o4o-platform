# 서비스 운영자·회원 관리 경계 수정 TODO

> **상태**: ACTIVE
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
- [ ] 변경 범위 점검·커밋·작업 브랜치 push·PR 준비

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
