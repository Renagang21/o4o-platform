# 내 매장 네 목적지 화면 재배치 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거**: 사용자 승인 — 네 목적지 배치안을 적용하고 미구현 기능 노출 보류, 기존 기능은 주요·상세 진입으로 정돈

## 기준과 범위

기준 `origin/main`은 `352df65dd`다. 새 전용 branch/worktree는 `wo/store-workspace-screen-placement`이며 기존 작업 트리는 수정·삭제·재사용하지 않았다.
관련 기준은 [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §9,
[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md),
[B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[공통 모듈 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)다.
승인된 화면 배치와 후속 AI 범위는 [기존 설계 초안의 승인 반영 절](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md)에 정렬했다.

공통 `/store`와 서비스 지정 `/work/kpa-society/store`에서 같은 서비스 내부 셸·페이지를 사용한다.
서버 API·route·권한·DB·공통 Core·공통 패키지·의존성·lockfile·배포 설정은 변경하지 않았다.

## 변경과 기능 분류

| 분류 | 변경 |
|---|---|
| 주요 | 홈은 업무 시작·확인할 일·핵심 현황, 상품·거래는 내 상품·공급/주문, 안내 만들기는 안내 준비·내 안내·자료 찾기, 매장 운영은 현황·적용/출력·요청·이용 현황 |
| 상세 | 블로그·상품 설명·QR·태블릿·사이니지·POP 편집기, 모집·신청, 게시 설정·스케줄·TV 재생·외부 채널 업무는 접힌 상세 진입으로 보존 |
| 노출 보류 | 실제 상담 기능이 없는 한국어·다국어 상담 예고 카드 제거. 기존 상담 요청은 유지 |
| 중복 정리 | 목적지 첫 화면에서 상단 하위 메뉴와 본문 카드의 반복을 제거. 상세 화면은 목적지 복귀·접힌 전체 업무로 연결 |

`workspaceGroups`는 이미 권한 필터를 통과한 기존 항목을 합성한다. 그룹 항목이 없으면 빈 그룹은 렌더하지 않는다.
전체 항목 보존·중복 없음·필터된 기능 재노출 없음은 회귀 검사로 확인했다.
상세 편집과 실제 배치·기기 동작을 합치지 않았으며 기존 `workspace` query와 제작·활용 전환의 전달 자료/query/hash를 유지한다.

홈은 통계 조회 중에도 업무 시작 링크를 즉시 제공한다. 최근 QR 활동은 선택해 펼칠 때만 조회하여 초기 요청 1개를 줄였다.
요약 실패는 0건으로 바꾸지 않으며, 선택 조회의 오류/재시도는 홈 요약과 독립적이다.
매장 전환 시 펼친 활동·이전 요청 상태는 매장별 세션으로 초기화된다.
매장 선택은 기존 selector를 사용하고 선택 후 같은 경로 계열의 매장 홈으로 복귀한다.
통합된 작업 이력이나 AI 연결을 새로 만들지 않았고 지원하지 않는 '이어할 일'을 표시하지 않았다.

## Shared Module Change Verification

### Changed shared module

- 서비스 내부 모듈: `config/storeWorkspace.ts`, `StoreWorkspaceShell`, `StoreWorkflowNavigation`.
- 직접 소비처: `StoreWorkspacePage`, `StoreHomePage`, `StoreWorkDashboard`를 사용하는 공통·서비스 지정 매장 layout.
- 간접 소비처: 제공 자료 layout, QR·태블릿·사이니지·POP의 기존 제작/활용 탐색.
- `workspaceItems`의 기존 필터 계약을 유지했다. 패키지 `store-ui-core`의 동명 셸·config는 수정하지 않았다.
- symbol/import·경로·사용자 표시명·파일 경로를 검색했다. literal consumer 검사 도구는 source 경로를 읽는 계약 0건이었으며 runtime/test import 소비처는 별도 검색으로 확인했다.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | 검증 | 결과 |
|---|---|---|---|---|
| 공통 Store `/store` | 사용 | 네 목적지와 홈 배치 | 전체 tests·build·PC/모바일 합성 브라우저 | PASS |
| KPA 지정 `/work/kpa-society/store` | 사용 | 같은 화면, 기존 service 경로 유지 | 경로·query·전달 state 회귀 및 PC/모바일 | PASS |
| Store 제공 자료 layout | 간접 사용 | 같은 네 목적지 셸, 기존 자료 경로 | import/route 조사·전체 tests·build | PASS |
| Neture·My Home | 서비스 내부 모듈 직접 미사용 | 기존 인증 handoff 호출 유지 | 소비처 조사·handoff 회귀 검사 | PASS |
| admin·operator·forum·공통 packages | 직접 미사용 | 코드 변경 없음 | import·문자열 소비처 조사 | 해당 없음 |
| K-Cosmetics·PharmacyHub | 퇴역 | 재생성·새 mount 없음 | route/소비처 조사 | 해당 없음 |

### Route / role / capability check

기존 기능 route를 제거하거나 새 route를 만들지 않았다. 상위 capability 필터와 직원의 구성원 메뉴 제외는 기존 layout 책임을 유지한다.
브라우저 직원 메뉴 검증은 필터된 합성 config의 표시 검증이며 실계정 권한·서버 격리 검증이 아니다.
외부 채널의 은퇴한 주문 메뉴 필터도 그대로 유지한다. 메뉴 정리를 이유로 주문 계약·consumer commerce 기능을 변경하지 않았다.

## 실행 검증

Node `22.18.0`, pnpm `10.25.0`; 환경 활성화 후 실행했다.

| 검사 | 결과 |
|---|---|
| frozen lockfile·무결성 검증 설치 | PASS |
| `pnpm run build:packages` | PASS |
| `pnpm exec vitest run --config services/web-store/vitest.config.mjs --maxWorkers=2` | PASS — 37 files / 497 tests |
| `pnpm --filter store-web build` | PASS — TypeScript + Vite, 기존 chunk 크기 경고 |
| 변경 TS/TSX 9개 집중 ESLint | PASS — 오류·경고 0 |
| `git diff --check`, 문서 민감정보 검사 | PASS |

초기 전체 검사에서 접힌 details 자식의 노출을 JSDOM이 실제 브라우저와 다르게 계산한 assertion 2개가 실패했다.
접힘 상태를 검증하도록 고치고 실제 Chromium에서 링크의 표시/숨김과 펼침을 별도 검증한 뒤 위 전체 검사로 재판정했다.

## 합성 브라우저 검증

실제 셸·홈·목적지·상품 목록·콘텐츠 selector·QR·태블릿·사이니지 컴포넌트의 production bundle을 사용했다.
인증·매장 문맥과 HTTP 응답은 합성했다. Chromium `1440×1000`, `390×844`에서
공통·서비스 지정 경로 각각 다음 9개 흐름, **총 36개 PASS**다.

1. 홈 조회 중 업무 시작 가능·조회 실패/재시도·핵심 현황.
2. 최근 QR 활동의 지연 조회·실패/독립 재시도.
3. 상품·공급/주문 그룹과 중복 하위 탐색 제거.
4. 접힌 기존 편집기와 실제 상품 화면 진입.
5. 자료 시작에서 실제 기존 콘텐츠 selector 진입.
6. 실제 QR 화면과 제작/활용 mode 전환.
7. 기존 태블릿·사이니지 화면 진입.
8. 필터된 직원 보조 메뉴·매장 selector 복귀 경로.
9. 매장 전환 후 이전 활동 제거와 새 매장 scope 조회.

각 viewport/경로에서 page error 0, 예상하지 않은 요청 0, HTTP write 0, 점검 화면 문서 가로 넘침 0이다.
캡처·실행 로그는 로컬 검증 산출물로 보존하고 저장소에는 포함하지 않았다.

## 인계와 미확인

실계정 로그인·운영 데이터 변경·실제 QR 출력/스캔·실제 기기 연결/재생·운영 배포는 수행하지 않았다.
새 AI 연결·자동 학습·새 통합 작업 이력은 후속 범위다. 저장·게시·실제 적용 동작의 새 계약도 만들지 않았다.
종료점은 commit·push·PR와 CI 상태 인계이며 main 병합·자동 병합·배포는 통합 담당 범위다.
미병합 branch와 후속 검증이 필요하므로 작업 트리 판정은 KEEP이다.

문서 정합: 기존 화면 설계 초안에 사용자 승인 배치를 추가하고 이번 CHECK를 작성했다. 정본 색인·상위 사업/권한 계약은 변경하지 않았다.
