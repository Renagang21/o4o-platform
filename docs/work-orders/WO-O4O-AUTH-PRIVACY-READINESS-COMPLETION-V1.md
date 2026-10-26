# 인증·개인정보 처리 준비 보완

> **상태**: ACTIVE
> **작성일**: 2026-10-26
> **근거**: 사용자 조사 후 판단·한 묶음 구현·main 병합 전까지 진행 지시
> **기준 main**: `7166005df54231e00999673fecdf83e596e1bb3a`

## 범위와 승인 경계

`CORE_CHANGE_REQUIRED`: 기존 인증·계정 완전 제거 계약의 조사 결과를 근거로 사용자가 구현을 지시했다. 이번 범위는 forward migration 파일·격리 PostgreSQL 적용/검증, 공통 인증 제한·삭제 준비 검사·개인 파일 조건부 삭제 보완, 문서 정합화, commit/push·PR CI/검토까지다. main 병합·auto-merge·배포·운영 DDL·실계정/GCS 삭제·정책 게시·파기 활성화는 수행하지 않는다. AI runtime/테이블/호출은 변경하지 않는다.

현재 cloud checkout은 격리되어 있으므로 onboarding 지침에 따라 기존 checkout을 사용하고 추가 worktree를 만들지 않는다. 이전 작업 branch와 원격 기록은 보존하고 `wo/auth-privacy-readiness-completion`을 최신 main에서 만들었다.

## 완료 계약

- [x] PostgreSQL 원자 인증 카운터: 인스턴스 공유, 목적별 bucket·기존 횟수/창·성공 응답 처리·429/Retry-After 보존. 원문 식별자 비저장. DB 장애/미적용은 503이며 메모리 우회 없음.
- [x] AI 외 누락 3테이블과 새 counter table의 writer fence를 forward migration으로 등록. 기존 prefix·정책·다른 도메인 보존.
- [x] readiness와 final scan이 동일한 enabled trigger/function 기준을 사용. 불완전 schema는 계정 비활성화/operation 생성 전에 거부.
- [x] avatar의 삭제 재시도에서도 현재 소유/purpose·content generation·metadata generation을 확인. 미분류 첨부·사업/타인 자료는 계속 검토 상태이며 자동 삭제 범위를 늘리지 않음.
- [x] 7일 restore fence만으로 30일 export를 안전하다고 판단하지 않도록 현재 최소 삭제 증빙과 복원 후보를 비교하는 읽기 전용 도구·검증 추가. 실제 복원/삭제 승인 기능 아님.
- [x] 실제 격리 PostgreSQL·다중 인스턴스/동시성·장애·migration 지문/down-up·기존 인증/삭제/공통 소비처·build 검증.
- [ ] 과거 기록은 보존하고 현행 정책의 구현 설명만 실제 범위로 정합화. 최종 CHECK·commit/push·PR 최신 HEAD 검증 후 main 병합 전 종료.

## Shared Module Change Verification

인증 공통 middleware의 email/Google/Kakao·가입·메일·token·아이디 찾기 소비처와 Admin/공통 사용자 DELETE API를 확인한다. 로그인 성공의 기존 실패 초기화 금지, Google bucket 분리, 기존 역할/세션/정책 gate와 개인정보 최소화·사업 자료 보존 계약을 유지한다. 다른 API/AI/general rate limit·메뉴·역할·serviceKey는 변경하지 않는다.

## 외부 검증 경계

GCS 실제 ownership tag·version/soft-delete·cache·IAM·backup/export 보존 및 복원 훈련, 실제 일반 계정/OAuth는 사용자 운영 검증이다. 미분류 도메인이 남으면 capability는 비활성으로 유지한다. 새 readiness 통과를 운영 파기 활성화 승인으로 표시하지 않는다.

개발 검증은 [CHECK](../checks/CHECK-O4O-AUTH-PRIVACY-READINESS-COMPLETION-V1.md)에 기록한다. main 병합/운영 실행을 개발 완료 수치에 포함하지 않는다.

## 통합 검증 진행

최신 main #831을 정상 merge했고 PR #835에서 CI/검토를 진행한다. 전용 fixture 도구의 fresh prepare·3 suites/51 tests와 canonical 지문 복구를 확인했다. main 병합·auto-merge·운영 반영은 미실행이다.
