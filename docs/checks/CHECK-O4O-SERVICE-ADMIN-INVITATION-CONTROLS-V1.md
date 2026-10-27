# 서비스 Admin 지정·Operator 위임 및 초대 재발송 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-27 (Asia/Seoul)
> **범위**: 사용자 요청의 Demo 검색 제외·확인 메일 재발송·전체관리자 Admin 전용 지정·파트너 Operator 위임
> **기준**: `origin/main` `2b8fc3b23d` · `wo/service-admin-invitation-controls`
> **종료점**: 개발·검증·commit·push. PR 생성·main 병합·배포·운영 데이터 변경 제외.

## 구현 판정

- 중앙 전체관리자의 등록 화면·역할 조회 API는 서비스 Admin만 제공한다. 초대 생성·수락·재발송에서도 같은 제한을 검사한다. 기존 역할 카탈로그를 없애지 않아 활성 Operator와 조회·회수 경로는 보존한다. 이전 중앙 Operator 대기 초대는 취소할 수 있지만 수락·재발송은 거절한다.
- 대상 검색은 이름/이메일 조건을 묶은 뒤 `demo_accounts`의 활성 Demo를 제외한다. 서비스 Admin의 후보 검색에도 같은 기준을 적용한다. Demo 계정·소유 데이터 자체는 삭제하지 않는다. 직접 ID 요청의 기존 Demo 차단도 유지한다.
- 동일 대상·서비스·역할·범위의 대기 초대가 있으면 원래 생성 화면에서도 재발송한다. 대상 ID를 다른 계정으로 바꾸지 않으며 잠금·현재 인가·자격 검사를 유지한다. 1분 제한, 최초 생성 후 7일 만료, 본인 수락 전 역할 미부여를 유지한다. 재발송은 token hash만 교체해 이전 링크를 거절한다. 발송 실패 상태도 보존하여 나중에 다시 보낼 수 있다.
- Partner Admin 역할은 기준 main에 이미 있었다. 빠져 있던 `partner-support` 서비스 위임 범위와 Partner 내부 Operator 초대·회수·대기 초대 재발송/취소 화면을 연결했다. 현재 활성 회원·유효 역할로 Admin 표시를 계산한다. 다른 서비스 Admin이나 Operator에게 위임 권한을 주지 않는다. 분회·개별 조합의 기존 별도 지정 경로는 유지한다.
- 초대 메일용 ephemeral SMTP 경로는 messageId만으로 성공 처리하지 않는다. SMTP 수락 목록 부재·빈 수락·수신 거절은 실패다. 이 경로의 메일 본문·주소·token·transport error는 로그/EmailLog에 남기지 않는다. API는 수락 여부만 익명 운영 로그로 남기고 UI는 수신함 도착을 단정하지 않는다. 일반 업무 메일의 기존 동작은 유지한다.

정책 근거: [현재 관리자 역할](../baseline/O4O-CURRENT-ADMIN-ROLE-POLICY-V1.md), [초대·본인 수락·보존 정책](../baseline/O4O-OPERATOR-INVITATION-CONSENT-AND-RETENTION-V1.md). 두 문서를 이번 사용자 결정에 맞췄다. schema·migration·의존성·lockfile·배포 설정 변경은 없다.

## 실행한 검증

| 검사 | 결과 |
|---|---|
| 설치·공통 패키지 | Node 22.18.0, pnpm 10.25.0, frozen-lockfile 설치·`build:packages` 통과. 초기 기본 캐시 경로/누락 offline tarball 문제는 작업 환경의 쓰기 가능한 캐시·정상 registry 설치로 해결. lockfile 불변 |
| API 집중 회귀 | 6 suites / 66 tests 통과. 후보 응답·검색, Admin 전용 신규 초대, 위임 범위, 라우트 인가, SMTP 거절·비기록 포함. 최종 검색 변경 후 16 tests 재확인 |
| 초대 실제 DB | 기존/추가 45 tests 통과 후 이전 중앙 Operator 대기 초대의 수락·재발송 거절 및 취소 1 test 별도 통과. 중복 생성 화면 재발송, 최초 만료 불변, 이전 링크 무효, 발송 실패 후 재시도 포함 |
| 위임 실제 DB | 73 tests 통과. Partner를 포함한 서비스별 Admin 초대·수락·회수와 타 서비스/Operator 권한 거절. 최종 활성 Demo 검색 제외·비활성 registry 보존 1 test 별도 통과 |
| Partner 실제 DB | 15 tests 통과. 활성 Admin/Operator 구분, 회원 정지 즉시 Admin 표시 제거, 기존 커뮤니티 권한 회귀 |
| 관리자 UI | 4 files / 21 tests 통과. Admin 전용 선택, 미가입 이메일 초대, 사업별 canonical 역할, 초대 상태·재발송. 최종 초대 패널 집중 재검사 |
| Partner UI | 7 files / 92 tests 통과. 최종 패널 lifecycle 변경 후 3 tests 재확인 |
| 타입·빌드 | API `tsc --noEmit`, 관리자 타입 검사·production build, Partner 타입 검사·production build 통과 |
| 브라우저 | 실제 관리자·Partner 컴포넌트와 합성 API/계정으로 Chromium 1440×1000·390×1000에서 4개 흐름 통과. Admin만 선택, 대상 지정·메일 요청, 재발송·안내 표시 확인. page error 0, Partner 가로 넘침 0. 합성 screenshot 확인 |
| lint | 변경 실행 소스 집중 검사 오류 0. 기존 hook 의존성 2건 및 기존 미사용 scope 1건 warning은 유지. 신규 Partner 패널 warning 0 |

DB 검사는 세션 소유 label의 신규 PostgreSQL 16 컨테이너와 loopback의 전용 DB/무작위 schema만 사용했다. 초대 fixture의 canonical bootstrap·등록 incremental 전체 fingerprint 검증도 통과했다. 운영 DB나 실제 계정·SMTP는 사용하지 않았다. 테스트 종료 후 전용 DB 3개를 삭제하고 각 컨테이너에서 잔존 0을 확인했다. 소유 label을 확인한 세션 컨테이너 2개를 제거하고 임시 Vite 2개·합성 화면 진입 파일도 정리했다. screenshot·로그만 저장소 밖에 보관한다.

초대 전체 검사 최초 실행은 병렬 build 부하에서 기존 5초 제한 1건을 초과했다. 동일 테스트를 코드 변경 없이 20초 제한으로 실행하여 통과했다. 마지막 추가 회귀 1건은 합성 INSERT의 필수 purpose 누락을 고친 뒤 별도 재검증했다. 애플리케이션 DB 제약을 완화하지 않았다. 집중 선택 실행의 다른 테스트 SKIP은 앞선 전체 실행 결과와 구분한다.

## 한계와 통합 인계

수신함 미도착의 운영 원인은 아직 확정하지 않았다. SMTP 수락은 Gmail 등 최종 수신함 도착 보장이 아니다. 운영 SMTP 설정·공급자 반송/스팸 판정·실제 수신함은 배포 후 승인된 운영 경로에서 확인해야 한다. 실제 메일 발송·권한 변경·기존 초대 취소·Demo 삭제를 실행하지 않았다.

공통 서비스 위임의 기존 소비처(Neture·supplier·funding·community·lecture·KPA·협력사업·연합회)와 분회/개별 조합의 별도 경계를 대조했다. mail-core의 ephemeral 소비처는 초대 모듈이며 일반 메일 회귀도 검증했다. 권한 변경은 새 부여 경로에만 적용한다.

종료 직전 `origin/main`은 `79613c0e9b`로 이동했다. 추가된 자동화 데이터 입력 작업 6개 경로는 이번 수정 경로와 겹치지 않는다. 자동 merge/rebase하지 않았다. PR CI·Codex 원격 리뷰·main 통합·배포는 이 개발 작업에서 실행하지 않는다. `DEPLOYMENT = REQUIRED` — 통합 담당자가 API·admin·Partner 반영 및 실사용 검증을 진행한다.

`WORKTREE_DISPOSITION`: 전용 worktree/branch **KEEP** — 병합 전 후속 수정·검토용. 다른 세션 checkout·worktree는 변경하지 않았다.

문서 정합: 사용자 결정에 따른 관리자 역할·초대 정책 2건 갱신. 과거 CHECK·canonical index·Frozen 원문 변경 없음.

## 통합 검토 보완 (2026-10-27)

사용자의 main 병합·배포 지시 후 PR #845를 생성했다. main의 자동화 입력·협력사업 자료 변경을 충돌 없이 결합했다. Codex P2 1건은 신규 지정용 Admin 목록이 조회용 카탈로그에도 적용돼 기존 Operator의 수락 상태를 `대상 아님`으로 표시하던 문제다. 조회·읽기 전용 편집의 전체 역할 카탈로그와 신규 초대 Admin allowlist를 분리했다. 기존 Operator의 수락 완료·기존 권한 유지 표시와 중앙 신규 지정 제외를 포함한 관리자 4 files / 24 tests 및 관리자 production build를 통과했다. 집중 lint 오류/신규 경고 0이다. 이 절은 검토 수정 기록이며 실제 배포 완료를 뜻하지 않는다.
