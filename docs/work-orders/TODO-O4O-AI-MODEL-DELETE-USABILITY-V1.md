# AI 모델 삭제 제한 정비 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-22 (Asia/Seoul)
> **근거**: 사용자 보고 — AI 모델 목록의 삭제 버튼 비활성화

## 목표·경계

삭제 제한이 실제 설정과 일치하도록 정비한다. 사용 중인 모델을 강제 삭제하거나 기능을 중지하지 않는다. 기존 인증·revision CAS·transaction lock·삭제 표식·과거 사용량 보존을 유지한다. 운영 설정·DB·유료 API 호출은 실행하지 않는다.

- [x] T01 최신 main 전용 worktree에서 UI/API/실행 소비처와 관련 문서 조사
- [x] T02 고정 기본 목록과 실제 기본/선택/정책 참조를 구분하고 제한 해제 조건 확정
- [x] T03 사용처 변경 이후 삭제 가능하도록 참조 판정과 사용자 안내 구현
- [x] T04 정책/fallback 보호·삭제 후 설정 해제 방지·재조회·desktop/mobile 검증
- [x] T05 문서 보완·경로별 commit·push 및 미검증 범위 보고

## 조사

기준 main `3917a9522d`. `ModelControlService.references`는 관리자 선택이나 실제 정책과 별개로 9개 코드 모델 및 환경 모델을 항상 보호한다. UI는 보호된 모델의 삭제 버튼을 비활성화하고 hover title만 제공한다. 따라서 사용처를 새 모델로 지정해도 이전 기본 모델을 삭제할 수 없고 무엇을 바꿔야 하는지도 알 수 없다.

실행 소비처는 공통 질의, 편집/파일/검색, 업무 계획·강화/이미지, 상품·번역, KPA, LMS, Copilot/운영 행동, 관리자 블록, TTS로 대조한다. 이전 HUB는 현행 관리 대상으로 복구하지 않는다. 별도 정책·fallback·환경 설정의 참조는 자동 삭제/변경하지 않는다.

## 추가 사용자 결정·실행 기준

사용처별로 모델을 지정하고 해당 사용처 전체에 적용한다. 전체 서비스에 한 모델을 강제하지 않는다. 관리자 지정이 있으면 기존 코드·클라이언트 요청·캐시된 정책의 모델보다 우선하며 다음 새 호출부터 반영한다. 이미 진행 중인 호출과 생성 결과는 바꾸지 않는다.

- 기존 모델 삭제 버튼은 사용처/정책 확인 대화상자를 연다. 해당 사용처를 다른 모델로 저장한 뒤 참조가 모두 해제되면 같은 대화상자에서 삭제한다.
- 실제 기본 소비처가 없는 이전 목록 항목은 보호에서 제외한다. 기본 소비처가 있으면 관리자 지정이 없는 해당 사용처만 참조로 표시한다. 공통 기본 실행 경로·서버 환경·미연결 범위/연결 설정은 계속 보호한다.
- 공통 질의 정책을 쓰는 사용처와 상품/번역 scope는 모두 관리자 지정으로 대체된 뒤에만 이전 정책 모델 참조를 해제한다. 정책 row나 이력은 자동 수정하지 않는다.
- 관리자가 상품/번역 모델을 지정하면 이전 scope 정책의 fallback을 더 이상 실행하지 않는다. 같은 모델의 retry·기존 활성/한도·가격/정산 검사는 유지한다. 별도 fallback을 새로 지정하는 UI는 이번 범위가 아니다.
- 매장 콘텐츠 번역과 약국 상담 번역의 모델 지정은 분리한다. 기존 `policy.CONTENT_TRANSLATION` 지정은 읽기 시 양쪽으로 같은 값을 이어받고, 다음 정상 저장에서 기존 JSON에 반영한다. GET·schema/migration·과거 사용량은 변경하지 않는다. 두 사용처는 기존 과금 scope를 계속 공유한다.
- 삭제한 기본/정책 모델이 다시 필요한 지정 해제는 거부한다. 새 모델 지정은 다른 사용처에 영향을 주지 않는다.

## 검증·종료 기록

검증은 Node 22.18.0·pnpm 10.25.0, 합성 공급자 응답·계정 fixture와 시스템 Chromium을 사용했다. 실제 Google 로그인, 운영 모델 설정 변경, 유료 공급자 호출·청구 검증은 수행하지 않는다. 임시 PostgreSQL은 운영 접속 설정을 읽지 않는 loopback/tmpfs fixture이며 종료 후 삭제·잔존 확인한다.

이 문서는 개발·검증·push 트랙이다. PR·main·운영 배포 상태는 실제 실행 전 완료로 표시하지 않는다. 작업용 branch/worktree는 병합 전까지 보존한다.

| 검증 | 실제 결과 |
| --- | --- |
| API 핵심·HTTP 인가·registry·정책·번역·기존 과금 회귀 | 8 suites, 75 PASS |
| 최신 소비처 목록·PostgreSQL 참조·상담 진입 추가 검증 | 4 suites, 39 PASS. 위 검사와 중복되므로 합산하지 않음; PostgreSQL 5건 포함 |
| 관리자 전체 단위 테스트 | 30 files, 443 PASS |
| desktop1280×800 / mobile390×844 | 모델 CRUD·충돌·선택·재조회·삭제 안내/같은 대화상자 내 사용처 변경→삭제·보호 사유·설정 회귀·인가 16 PASS. 합성 Google auth 상태이며 실제 Google 로그인이 아님 |
| 타입·빌드 | API와 관리자 type-check/정식 build PASS |
| lint·문서 | 변경 TS/TSX eslint error/warning 0, 민감정보·링크·공백 확인 |

처음 HTTP 검사 1회는 sandbox의 listen EPERM으로 중단됐고, 허용된 로컬 포트 환경에서 재실행해 통과했다. 최초 browser 2건은 합성 응답이 동일 모델의 runtime 참조를 usage 참조로 덮어써 실패했다. fixture가 양쪽 참조를 함께 보존하도록 고친 뒤 4건, 최종 설정 회귀 포함 16건 PASS다. 이 실패를 운영 또는 실제 Google 인증 결과로 표시하지 않는다.

격리 PostgreSQL 검증 후 `o4o_aimodel_*` DB count 0을 확인했고 이번 `o4o-ai-delete-pg` tmpfs 컨테이너도 삭제했다. task label로 재조회한 컨테이너 잔존 0. 운영 DB/업무 데이터는 만들거나 변경하지 않았다.

## 현재 제한·후속 통합

실행 공급자/모델의 실제 제공·인증·가격은 확인하지 않았다. Qwen/DeepSeek 신규 adapter, STT, 전문 Vision OCR의 모델 제어·전체 비용/중지 통합, 퇴역 HUB 복구는 포함하지 않는다. 기존 공통 기본·환경·미연결 정책이 계속 참조하는 모델은 삭제를 차단하고 사유를 표시한다. 관리자 모델이 미지정인 사용처는 기존 운영 설정을 유지한다.

새 전체 공통 설정을 도입하지 않았다. 번역 두 사용처는 모델 선택만 독립적이며 한도/정산 scope와 활성 설정은 기존 계약을 공유한다. 지정 모델이 실패할 때의 별도 fallback 선택 기능은 후속이다.

현재 `DEPLOYMENT=REQUIRED`, main 병합·운영 배포 미실행. 기능 commit `c79a2edf63`의 원격 push를 확인했다. 이 종료 문서 보완은 별도 문서 commit으로 남기며 최종 SHA·원격 동일 여부·clean은 Git 인계에서 확인한다. PR 생성/PR CI는 아직 수행하지 않았다. worktree `/workspace/o4o-wt/ai-model-delete-usability`, branch `wo/ai-model-delete-usability`는 통합 전 `KEEP`이다.


## WORKTREE_DISPOSITION

- base: `3917a9522d50936e405db28d59a4ae9febff628f`
- main integration / deployment: 미실행 / REQUIRED
- local verification: 위 실제 실행 기록 통과, 운영 Google/유료 요청 미검증
- task fixture: DB·컨테이너 잔존 0, 기준 checkout 변경 없음
- verdict: KEEP — push 완료 branch를 후속 통합·검토용으로 보존
- 문서 정합: 삭제 제한의 실제 참조·정책 우선순위·번역 모델 분리를 TODO와 정본 후속 개발 절에 반영. 기존 실행 이력과 canonical index 상태는 수정하지 않음.
