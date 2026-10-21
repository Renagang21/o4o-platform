# 내 매장 일상 업무 흐름 개선 검증 V1

> **상태**: ACTIVE
> **작성일**: 2026-10-21 · **최종 갱신**: 2026-10-21
> **개발 검증**: LOCAL_VALIDATED · **main/운영 반영**: 미실행
> **범위**: [TODO](../work-orders/TODO-O4O-STORE-DAILY-WORKFLOW-UPGRADE-V1.md)의 ①~③ · AI 이력 계약은 후속

## 구현과 소비처 대조

| 흐름 | 변경과 확인 범위 |
|---|---|
| 상담 반복 조작 | `StoreMultilingualConsultationPage`가 `useConsultationDrafts`로 양방향의 마지막 입력·번역만 화면 메모리에 보관한다. 고객 dialog의 ‘고객이 답하기’는 기존 입력란에 포커스를 둔다. 자동 번역·영구 저장을 추가하지 않았다. 직원 고정 문구·전문인 이용 판정·기존 명시적 번역 API를 유지한다. |
| 상담 초기화 | 새 상담·언어/모드 변경·계정/매장 변경·pagehide·화면 이탈에서 양쪽 초안을 버린다. 방향을 바꾸면 진행 중 번역과 음성을 무효화한다. 같은 방향을 다시 누르는 것은 작업을 취소하지 않는다. |
| 컨텐츠 사용처 | `StoreContentsSelector`의 기존 원본 갱신 사본 사용처에 `ContentUsageSummary`를 연결한다. 부분 집계 0은 ‘집계된 사용처 없음’이며 태블릿 블록·영상 미집계와 POP 근사를 함께 표시한다. 미조회·실패·잘못된 수를 구분하고 자료 선택을 유지한 채 재조회한다. |
| 위치별 수정 | `StoreExecutionPage` → `StoreExecutionActions` → 기존 태블릿/QR 관리 화면. 같은 위치의 여러 기기·QR 중 대상을 직접 선택한다. 기존 capability·공통/서비스 URL을 유지하며 매장/서비스가 다른 history state는 선택·복귀에 사용하지 않는다. |
| 태블릿 | 현재 활성 목록에서 확인한 대상만 기존 화면 교체 창을 한 번 연다. 닫은 창을 재조회 때 자동으로 다시 열지 않는다. 기존 적용·실패·되돌리기·제작 편집 동선을 재사용한다. |
| QR | 현황과 같은 최대 200건 읽기에서 선택한 대상을 확인한 후 기존 배치 패널·출력 선택을 연다. 누락과 조회 실패는 별도로 표시한다. 선택 대상 표시 중에는 전체 선택·종류별 수·출력 가능 수도 같은 범위를 사용한다. ‘전체 QR 보기’로 기존 목록을 다시 연다. |
| 현황 복귀 | `storeOperationEntry`는 내 매장의 해당 mount `/execution` 경로만 복귀 대상으로 허용하며 query/hash/기존 state를 보존한다. 기존 제작 state는 복귀 정보 안에만 두고 목적지에 적용하지 않는다. history state는 권한 근거가 아니며 현재 목록과 기존 서버 권한 판정을 유지한다. |

기존 상담·음성·사용처 조회·화면 적용·QR 배치·출력과 관련 route의 역방향 소비처를 대조했다. 변경은 `services/web-store` 로컬이며 공통 Core·API 계약·DB·의존성·권한·route 등록·workflow 변경은 없다. QR 위치 묶음의 기존 매칭 규칙도 확장하지 않았다.

## 자동 검증

- Node `22.18.0` · pnpm `10.25.0`, frozen lockfile·무결성 검증 유지 설치.
- `pnpm --workspace-concurrency=2 --filter 'store-web^...' run build` — 의존 패키지 빌드 통과.
- `pnpm --filter store-web test` — **62개 파일·754개 테스트 PASS**.
- `pnpm --filter store-web build` — TypeScript와 Vite production build PASS. 기존 큰 chunk 안내가 남아 있으며 분할 설정은 수정하지 않았다.
- 새 QR 회귀 파일까지 `pnpm --filter store-web type-check` PASS. 변경 TS/TSX 16개 집중 ESLint: 오류·경고 0.
- 회귀 보강: 양방향 초안·직접 답변·전체 초기화·늦은 번역 차단, 부분 사용처 0·재조회 선택 보존, 동일 위치 다중 대상·query/hash/state 복귀, 다른 매장/경로 거절, 누락 대상·실패 구분·재조회, QR 전체 선택 범위·닫은 패널 재열림 방지·지연 목록 격리.

## 브라우저 검증

현재 작업 worktree의 실제 페이지·dialog·표·기존 관리 패널에 합성 API를 연결했다. 별도 합성 Store/Auth context와 독립 Chromium 프로필을 사용했다. 실제 계정·서버 업무 데이터·유료 번역을 사용하지 않았다.

PC `1440×1000`, 모바일 `390×844` 각각 `/store`와 `/work/kpa-society/store`에서 다음 8개 흐름을 확인했다: **32개 PASS**, page error·미처리 API·페이지 가로 넘침 0.

| 흐름 | 결과 |
|---|---|
| 양방향 입력·번역 보존 → 고객 화면 → 답변 입력 포커스·명시적 번역 | 4/4 |
| 언어·새 상담 초기화·방향 전환 중 지연 번역 차단 | 4/4 |
| 사용처 실패 재시도·부분 집계 0·미집계/근사·선택 보존 | 4/4 |
| 동일 위치 다중 기기 선택 → 선택 기기만 교체·실패 재시도 → 현황 복귀 | 4/4 |
| 선택 QR 배치 패널·해당 QR만 전체 선택 → 입력 보존 재시도·저장 → 전체 목록·복귀 | 4/4 |
| 선택 태블릿 누락 → 재조회 → 같은 대상 창 열기 | 4/4 |
| 선택 QR 누락 → 재조회·같은 대상 열기 → 매장 전환 시 대상·복귀 격리 | 4/4 |
| 위치 목록 지연 중 매장 전환 → 이전 대상 자동 선택 차단 | 4/4 |

브라우저 검증 중 선택 QR 보기의 ‘전체 선택’이 숨겨진 다른 QR도 포함하는 문제를 찾아 표시·집계·일괄 선택을 같은 대상으로 맞췄다. 이 동작은 저장소 회귀 테스트에도 추가했다.

로컬 재현 자료: `/workspace/.o4o-daily-workflow-browser-20261021/`의 `main.tsx`, `vite.config.mjs`, `check.mjs`, `results.json`, PC/모바일 스크린샷. 자동 검사 로그: `/workspace/.o4o-daily-workflow-20261021/`. 합성 자료이며 저장소에는 추가하지 않는다.

## 인계와 미검증

전용 branch `wo/store-daily-workflow-upgrade`, 시작 main `c9d9760aba`. push 전 재조회한 main `5c6150a6b0`까지의 변경은 약국 관리자 설정 검증 문서 2개이며 작업 경로와 겹치지 않는다. 개발 branch에 자동 통합하지 않았다.

PR·PR CI·main 병합·배포는 수행하지 않는다. 로컬 통과를 CI·운영 반영 완료로 보지 않는다. 통합 담당은 제출 HEAD를 기준으로 필수 CI·리뷰 후 병합·배포한다. `WORKTREE_DISPOSITION = KEEP` — 통합 검토와 후속 수정용.

실제 계정의 근무자 권한/접근 해제, 운영 상담·번역, 실제 마이크/음성, QR 인쇄·스캔, 태블릿/사이니지 연결·재생·현장 반영은 검증하지 않았다. 매장별 AI 이력·직원 접근 해제 기준은 Core 계약과 맞추는 별도 후속 작업이다.

문서 정합: 기존 기록/정본 판정 변경 0건 · SUPERSEDED 0건 · 링크 수정 0건 · TODO 완료 및 본 CHECK 추가. 통합·운영 상태는 개발 검증과 분리해 기록했다.
