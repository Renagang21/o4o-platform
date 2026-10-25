# 내 매장 상담 사용성·AI 데이터 계약 검증

> **상태**: ACTIVE
> **완료 범위**: 사용성 보완·코드/문서 조사·로컬 검증·작업 branch push. 실사용 미확인 범위와 운영 미반영은 아래에서 구분한다.
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **기준 main**: `b7d2cfd86edf4d26d19d1e954fa754f74faf8f7d`
> **branch**: `wo/store-consultation-usability-and-data-contract`
> **작업**: [TODO](../work-orders/TODO-O4O-STORE-CONSULTATION-USABILITY-AND-DATA-CONTRACT-V1.md) · [데이터 범위 검토안](../design/DESIGN-O4O-STORE-CONSULTATION-DATA-SCOPE-V1.md)

## 1. 변경과 유지한 범위

- 안내 음성 요청을 같은 버튼에서 시작/마칠 수 있다. 인식 중에는 안내 준비·공유·읽어주기를 잠그고, 인식 후 직접 확인해 실행한다. 입력 focus를 강제하지 않아 현장 한 화면에서 화면 키보드가 자동으로 열리는 동작을 줄였다. 지원하지 않는 기기에서는 기존 문자 입력을 사용한다.
- AI 문단 선택·선택 문단 번역 실패 후 ‘같은 안내 다시 준비’는 실패한 요청의 작업 종류·상품·질문·언어·선택 문단을 보존한다. 추가 유료 호출을 자동으로 실행하지 않는다. 요청 스냅샷은 화면 메모리에만 두며 매장/언어/모드/상담 세대 변경 때 폐기한다. 다섯 위치 인자를 명명된 요청 옵션으로 정리했다.
- 명시 종료/공유 등의 작업 오류와 heartbeat 오류를 구분했다. 정상 heartbeat가 종료 실패를 성공처럼 지우지 않는다. 접근 거부 401/403 또는 heartbeat의 상담 세대 만료를 확인하면 현재 연결/코드·지연 응답 세대를 해제하고, 기존 부모 화면이 입력·준비 결과·음성을 정리한다. 일시적인 연결 오류에서는 현재 상담과 입력을 유지한다.
- 데이터 검토안은 현재 상담 1행·개인 사용자 이력·사용량 metadata를 구분한다. 새 매장별 영구 이력·비공개 전문 자료·방치 상태 파기·경험 재사용의 합의 항목을 정리했으며 새 저장/권한 정책으로 확정하지 않았다.

Core·공통 UI/이력·DB/migration·API/route·권한 판정·모델/가격/quota·의존성/lockfile·배포 설정 변경은 없다. 현재 게시 자료 선택/번역 범위와 소비자 commerce 금지 경계를 유지한다. 실제 권한 해제를 수행하거나 새 전문 판단 Extension을 완성한 작업이 아니다.

## 2. 로컬 검증

| 검증 | 실행 결과 |
|---|---|
| 설치 | Node 22.18.0 / pnpm 10.25.0, `pnpm install --frozen-lockfile` PASS. 무결성 검증 유지·lockfile 변경 없음 |
| 선행 패키지 | `pnpm --filter 'store-web^...' run build` PASS. 이번 worktree에서 빌드한 의존성 사용 |
| 실패 재현 | 추가 회귀의 최초 실행: 3 files / 34 tests 중 기존 코드 실패 7건·통과 27건. 수정 뒤 동일 34건 PASS |
| 최종 Store 전체 | `pnpm --filter store-web test`: 72 files / 831 tests PASS |
| 최종 상담 집중 | 상담 안내·연결 hook·음성·직원 화면·고객 화면 5 files / 56 tests PASS. 접근 거부 뒤 늦은 정상 heartbeat가 상태를 복원하지 않는 경쟁 검사 포함 |
| Store 타입/빌드 | `pnpm --filter store-web run build` PASS (`tsc -b` + Vite). 기존 대형 chunk 안내는 남음 |
| 수정 파일 lint | 변경 TS/TSX 6개에 ESLint 실행. 오류 0·경고 0 PASS |

최초 빌드에서는 새 테스트의 `Array.at` 사용이 현재 TS lib 대상과 맞지 않아 실패했다. 기존 배열 인덱스 방식으로 수정하고 최종 build·전체/집중 테스트를 다시 통과했다. tsconfig나 의존성을 변경하지 않았다. API 소스 변경이 없어 이번 작업에서 API build/SQL/migration 검사를 재실행하지 않았다. 이전 배포의 API 검증을 이번 실행 결과로 합산하지 않는다.

## 3. 브라우저

Chromium의 새 임시 직원/고객 context에서 실제 직원·고객 화면, 상담 API adapter와 `coreApiClient`를 실행했다. Auth/Store context·API 응답·브라우저 ASR 이벤트는 합성 fixture로 제공했다. loopback origin의 요청만 허용했으며 실제 운영/외부 provider에 연결하지 않았다.

1440×1000 / 1280×800 / 390×844 각각 다음 8묶음, **총 24묶음 PASS**다.

1. 같은 자리의 음성 시작/마치기, 인식 중 실행 잠금, 인식 결과 보존·화면 키보드 자동 focus 없음.
2. 실패한 AI 요청의 상품·질문·작업 종류를 그대로 수동 재시도.
3. 실패한 번역의 선택 문단 보존, AI 선택을 추가 실행하지 않음.
4. 한 태블릿 고객 dialog의 표시 전 자료 재확인·선택 언어 표시.
5. 분리된 고객 화면에 확인된 안내 전달. 직원 요청은 선택 매장 header·합성 직원 Bearer를 사용하고 고객 요청에는 직원 Authorization/cookie/조직 header가 없음.
6. 명시 종료 실패 안내가 정상 heartbeat 뒤에도 유지되고 고객 화면은 종료 성공으로 잘못 바뀌지 않음.
7. 종료 성공 후 양쪽 화면 비움, 같은 고객 기기로 새 상담을 열어도 이전 고객의 미전송 입력을 복원하지 않음.
8. 서버 접근 거부 뒤 직원 초안/연결 코드 제거·늦은 음성 결과 무시, 고객 기기 상태 해제.

page error 0·가로 overflow 0. 합성 모바일 고객 dialog·복구 화면을 직접 확인했다. screenshot·harness·로그는 저장소 밖 `/workspace/.o4o-consultation-usability-20261025/`에 둔다. 초기 harness의 외부 node_modules 해석과 접힌 연결 영역의 locator를 수정한 뒤 위 전체 검사를 다시 실행했다. 제품 코드의 assertion을 완화하지 않았다.

이 검사는 실제 음성 인식·번역의 품질, 운영 서버/실제 역할·기기 연결을 검증한 것이 아니다. 한 화면 고객 dialog는 표시 직전 재검증이며 오프라인 강제 회수를 보장하지 않는다.

## 4. 실제 계정·실운영 경계

기존 사용자의 현행 Secret 계정·운영 읽기 전용 로그인 승인 범위를 사용했다. 착수 시 현재/기준 checkout에 계정 파일이 없었으며 이전 사본·seed 계정을 사용하지 않았다. Secret 값은 메모리에서만 사용했다. SETUP에 따라 상세 로그인/역할 확인은 Git에서 제외된 `docs/local/TEST-ACCOUNTS.local.md`의 확인 상태/기록 표에만 남겼다. 이 파일은 계정값 사본이 아니라 Secret 연결의 결과 기록이며 `git check-ignore -v`로 제외를 확인했다.

운영 확인은 로그인과 접근 가능한 매장/상담 설정 조회로 제한했다. 실제 브라우저 업무, 직원 업무 전체·접근 회수·매장 간 격리는 검증 완료로 표시하지 않는다. 상담 open·pairing·준비/공유·주문·게시 등 운영 업무 데이터를 만들지 않았고 실제 AI 호출/과금도 수행하지 않았다. 일반 로그인/보안 기록은 정본 보존 대상이므로 테스트 정리를 이유로 삭제하지 않았다.

남은 실제 검증은 유효한 직원 세션, 경영자/직원 전체 업무·해제·복수 매장 격리, 현장 기기/마이크·소음·언어별 약사 검수, 실제 provider/모델/한도·응답 품질, 물리 QR·사이니지 재생이다.

## 5. 데이터 계약·문서 정합

- 공통 개인 AI의 `getHistory → getUserLogs`는 `userId` 기준이며 질문/응답 저장 경로가 존재한다. 현재 상담과 연결하지 않았다. 보존 정본의 과거 미사용 설명을 현행 운영 상태로 단정하지 않는다. 운영 row 수·실제 이용·보존 집행은 조회하지 않았으며 공통 AI/개인정보 담당의 후속 정합 대상으로 보고한다.
- 현재 상담 연결의 90초 대기 판정은 자동 DB 파기가 아니다. 매장별 영구 이력, 직원 간 조회 범위, 전문 자료의 권한, 방치 상태의 보존/정리, 경험 신호의 동의/집계는 검토안에서 미결정으로 구분한다. 공통 정책·Core·기존 이력 원장을 임의 변경하지 않는다.
- 기존 상담/상품 설명의 완료 CHECK와 역사적 push-only 기록을 구분했다. canonical index·과거 CHECK/TODO·개인정보 정본은 변경하지 않는다.

## 6. Git 인계

개발 담당 종료점은 commit·named branch push다. PR·main 병합·배포·운영 migration은 이번 범위가 아니다. PR 미생성으로 PR CI는 미실행이며 운영 반영으로 보고하지 않는다.

코드/검토안 commit `03b9a127d410818a408e4afe6e572c47d625cb73`을 위 branch에 push했다. push 직전 최신 origin/main `b7d2cfd86e` 일치·예상 staged 9개 파일·공백/민감정보·문서 상대 링크 13개를 확인했다. GitHub check-runs와 commit status는 각각 0건이며 CI 성공/실패 판정이 없다. 이 push 종료 기록의 추가 변경은 문서 2개뿐이다.

`WORKTREE_DISPOSITION = KEEP`: `/workspace/o4o-wt/store-consultation-usability-and-data-contract`. 후속 통합/리뷰 보완을 위해 유지한다. 다른 worktree·기준 checkout의 파일/branch/작업 상태는 변경하지 않았다. 최종 push SHA·원격 일치·미커밋 상태는 종료 인계에서 확정한다.

문서 정합: 사용자 이력 코드 연결과 보존 정본의 과거 미사용 서술 차이 1건 보고 / 데이터 범위 검토안 DRAFT·이번 TODO/CHECK 작성 / 정본 정책 변경·SUPERSEDED·canonical index 변경 없음.
