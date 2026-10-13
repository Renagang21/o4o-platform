# O4O 통합 개인정보 후속 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-12 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: WO-O4O-FRONTEND-INTEGRATED-STABILIZATION-V1 §9~§11 · 사용자 새 환경 재개 지시
> **범위**: 기존 통합 WO의 연속 phase. 완료된 UI/인증/My Home을 재구현하지 않는다.

## 1. 조사 전 초안

1. 최신 origin/main, AGENTS.md, SETUP.md, 정본 색인과 인계 문서 및 실제 환경을 확인한다.
2. 두 단계 계정 완전 제거의 Core 변경 WO를 준비한다. 두 삭제 API의 권한/소비처, FK/비FK 개인정보, 인증/세션, 개인 DB/파일, 사업/타인 자료 및 최소 법정 기록을 조사한다.
3. 삭제 순서, 실패/재시도, 동시성, 세션 무효화, 성공 응답의 구체 계약을 작성하고 합성 데이터로 검증한다. Core/API/DDL 구현과 운영 실행 승인을 분리한다.
4. 커뮤니티 변경 이력의 분류, 법정 2년 요건, 예외 종료, 최소 기록 분리, 달력 기간 경계와 파기 방식을 구체화한다. 기본 1년 확정만으로 자동 job을 활성화하지 않는다.
5. 기존 인증/법률 담당 본문을 대조한다. 공고 2026-10-12, 시행 예정 2026-11-13 및 30일 요건을 확인하고 시행 전 DB 게시/재동의를 실행하지 않는다.
6. 승인 범위의 구현/검증 → push → 정상 PR/main 병합 → 필요한 배포 → 마지막 사용자 테스트를 진행한다.

## 2. 재질문하지 않는 결정과 제외 범위

- 개인정보 최소화, 서비스 Operator 사용중지 → Admin 전체 계정·일반 개인정보 완전 제거. 가입/수행자 이력만으로 전체 프로필을 보존하는 guard는 철회됐다.
- 법정 최소 기록만 분리 보관. 커뮤니티 변경 이력은 각 생성 후 달력 1년, 법정 2년 대상은 2년이며 재가입/복구로 기산점을 초기화하지 않는다.
- 비로그인 커뮤니티 열람은 운영자의 명시적 공개만 허용한다.
- 분회 전용 개발/UI/기능/배포는 제외한다. 공통 변경의 분회 참조 영향은 확인하되 분회 원장에 커뮤니티 1년을 복사하지 않는다.
- 이전 환경 식별/삭제는 별도 담당. 실계정 삭제로 검증하지 않는다. 실제 Google/Kakao와 사용자 본인 데이터 검증은 마지막에 사용자가 수행한다.

## 3. 조사 후 보완 및 실행 증거

- [x] 읽기 전용 fetch로 시작 기준 `63653694b3bc35b4d127541fafb76f021df1bf68` 확인. 인계 SHA로 고정한 것이 아니며 통합 전 최신 main을 다시 확인한다.
- [x] 기존 checkout의 tracked/untracked 변경 0 확인 후 후속 전용 작업공간을 준비했다. 로컬 파일/프로세스는 실제 존재 여부를 확인한다.
- [x] #501 인증 배포 잔여 해소와 #498/#500 My Home 소유 트랙 완료 기록 확인. 일반 실계정/OAuth 완료로 대체하지 않는다.
- [x] 두 삭제 경로·권한/활성 UI/raw-source 소비처, 로컬44테이블60 FK와415개 신원/JSON 후보, 개인정보/사업 자료/GCS 경계 조사 및 [구체 Core WO](WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1.md) 준비. 후보 전수 분류/운영 census 완료는 아님.
- [x] 달력/제안 완료 계약11개 tests와 실제 로컬 FK rollback fixture 검증. API/worker/GCS/실제 세션·동시성 구현 검증과 구분.
- [x] 공통 개인정보/서비스별 공개 초안의 누락 조문·시행 조건 대조. 기존 공고에 이번 정책이 이미 포함됐다고 표시하지 않음.
- [x] 위 WO §1의 구체 Core/API/DDL 코드 준비·격리 합성 검증 사용자 승인. 기본 개인정보 최소화·1년 정책 재확정은 요청하지 않음.
- [x] 두 API 통합·pending/token/fence·명시적 파일 retry·독립 최소 증빙·Admin 완료 상태 및 합성 검증 구현. 운영 활성화 전 전수 domain/file classification·producer/orphan·GCS/lock 검증 잔여는 WO §10.2 참조.
- [x] Core 구현 PR #505 정상 main 통합(최종 PR CI·Codex 통과). 실제 범위/한계는 WO §10을 따른다.
- [x] 보호 grant·전체 인증 namespace·legacy hash retirement/준비 상태 후속 PR #507 정상 main 통합 및 post-merge CI PASS. 집중67 tests와 새24단계 정상 runner 검증 완료.
- [x] 2026-10-13 운영 실행 승인 확인 및 기존23/24·API/Admin 반영 재확인. 현재25단계 history ready와 runtime target88d45b8208 확인; 중복 적용/재배포0. 설정/코드 기준 삭제 기능 OFF, 실제 관리자 capability 응답은 마지막 본인 Google 검증에서 확인한다.
- [ ] 전수 domain/file inventory·producer/orphan·GCS/backup·lock 검증·법정1/2년 근거·공개 본문/시행·승인된 실제 집행. 운영 준비 완료는 활성화 승인이 아니다.
- [ ] 마지막 사용자 테스트 결과 → 발견 문제 수정/회귀/통합/배포 → 종료 판정.

## 4. 마지막 사용자 테스트

운영자 공급자 관리·내 매장 신청 심사, Google/Kakao 실제 인증·명시적 연결·서비스 이동, 최신 My Home 본인 데이터, 약국 회원 홈, 커뮤니티 공개 지정·비로그인 조회·철회를 PC/모바일에서 확인한다. 오류 보고에는 수행 순서와 기대/실제 결과만 남기며 계정·비밀번호·토큰을 공개하지 않는다. 아직 미실행이다.

문서 정합: 과거 배포 HELD/분회 빌드 실패를 현재 미해소 상태로 반복하지 않는다. 당시 기록을 다시 쓰지 않고 최신 완료·후속 범위를 이 연속 TODO에 기록한다.

환경: frozen-lockfile 설치 완료. GitHub API allowlist 적용 후 PR/ruleset 조회 성공; 이전 Forbidden은 현재 blocker가 아니다. 운영 활성화·법률 시행·일반 사용자 테스트는 아직 완료하지 않았다.

최신 운영 준비 근거는 [CHECK의2026-10-13 재확인](../checks/CHECK-O4O-TWO-STAGE-ACCOUNT-ERASURE-V1.md#운영-준비-재확인--2026-10-13)을 따른다. 이전12일 HELD 기록을 현재 미해소로 반복하지 않는다. 새3 Demo 소유 트랙 검증도 일반 상태 계정/본인 OAuth/운영자 최종 테스트를 대신하지 않는다.

## 5. 선택 정비 종료 후 원래 domain/file 조사 재개 — 2026-10-13

코드 복잡성 정비 PR #541은 정상 main 통합·선택6개 배포까지 완료됐다. 사용자 지시에 따라
추가 대규모 정비/서비스 간 공통화는 미루고 기존 ACTIVE Core WO를 이어간다.

- [x] 현재 prefix25의 공식 격리 bootstrap/assertion 및 source hash를 기준으로
 307관계/3,944columns/44관계60 users FK metadata inventory 수집. 계정 행/파일 값 조회0.
- [x] 기존 private owner27관계와 owner field 대조; 추가 domain273관계/신원·문자열·JSON 후보2,595개/파일 후보222개 분리.
 후보 수를 개인정보/실제 파일 수 또는 전수 처리 완료로 표시하지 않는다.
- [x] 실제 producer의 gcs:// 및 camelCase fileUrl 누락으로 인한 잘못된 completed를 합성 회귀로 재현하고 기존 review_required 계약으로 보완.
- [x] 기존 transaction 인가 함수 재사용. 초입 non-locking 검사·transaction lock/시점·target 보호 유지.
- [ ] 사업/타인/domain handler, 개인 file/producer/orphan·실제 GCS/backup·lock, 법정 근거/본문·시행과 마지막 사용자 검증 후속.

구체 결과와 다음 큰 묶음은 [inventory IR](../investigations/IR-O4O-ACCOUNT-ERASURE-DOMAIN-FILE-INVENTORY-V1.md)를 따른다.
이 조사나 코드 보완으로 삭제 기능 flags/자동 job/정책 본문/재동의를 활성화하지 않는다.

최신 main #549의 신규26단계를 반영해 local 공식 runner/collector를 재확인했다.
현재308관계3965columns/기존private27/추가domain274/후보2608이며 FK60개는 그대로다.
새 AI reservation의 비FK user_id/JSON·trigger0을 activation 전 domain/writer 잔여로 포함했다.
이 source/격리 검증으로 운영26 적용을 승인하거나 실행하지 않는다. 상세 지문·소유 트랙 승인 경계는 IR §2.1 참조.
