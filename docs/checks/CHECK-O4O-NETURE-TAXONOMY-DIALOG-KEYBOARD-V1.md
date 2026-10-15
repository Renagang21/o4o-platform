# Neture 분류 dialog 키보드 검증

> **상태**: ACTIVE · **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **연결 WO**: [WO-O4O-NETURE-TAXONOMY-DIALOG-KEYBOARD-V1](../work-orders/WO-O4O-NETURE-TAXONOMY-DIALOG-KEYBOARD-V1.md)

## 변경과 판단

브랜드 대상 선택·병합 확인 및 카테고리 생성·수정을 native modal로 전환했다. 앱 내부 hook의 소비처는 두 관리 페이지다. 초기 입력/취소 초점, 현재 활성 요소를 기준으로 한 Tab/Shift+Tab 경계 순환, Escape, 호출 버튼 복귀를 제공한다. 저장 후 목록이 교체되어 호출 버튼이 없으면 카테고리 제목/브랜드 검색으로 복귀한다. 공통 UI 패키지, API 요청, 권한, route, 의존성, 인프라 변경은 없다.

중첩 native dialog의 top layer에서는 기존 body portal 확인 창이 배경으로 취급되므로 브랜드 확인 창도 함께 전환했다. 글로벌 toast만으로는 실패가 top layer 뒤에 가려질 수 있어 기존 toast와 함께 창 내부 alert를 제공한다. 처리 중 확인 버튼이 비활성화되면 dialog에 초점을 유지하고 Escape로 닫지 않는다. 페이지의 space-y 스타일이 modal margin을 덮지 않도록 modal 중앙 정렬을 명시했다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| frozen offline 설치와 소비 workspace package build | PASS |
| `pnpm --filter @o4o/web-neture build` | TypeScript + Vite PASS |
| 최종 modal 스타일 변경 후 `pnpm --filter @o4o/web-neture exec vite build` | PASS |
| `pnpm exec vitest run --config services/web-neture/vitest.config.mjs` | 102 files / 932 tests PASS |
| dialog focused suite | 8 tests PASS, 최종 selector 수정 후 재확인 |
| dialog test 별도 TypeScript 검사 | PASS; Vite ambient types 포함 |
| 변경 TS/TSX 4개 ESLint | PASS |
| 실제 Chromium, React StrictMode, 1440/390/320 px, 두 페이지 | 6 scenarios PASS |
| staged scope / whitespace / docs sensitive 검사 | PASS |

브라우저 검증은 초기 초점·양방향 Tab 순환·빈 후보 목록·Escape 단계별 닫기·중첩 확인 취소·호출 버튼 복귀·처리 중 초점 유지·실패 alert·재시도 성공·갱신 후 fallback·성공 toast를 포함한다. 요청 payload를 합성 fixture와 비교했으며 페이지 오류와 문서 가로 overflow는 0건이었다. 스크린샷으로 mobile dialog의 버튼·입력과 확인 창을 확인했다. Unit의 jsdom dialog mock은 lifecycle만 모사하며 native containment 판정은 Chromium 결과에 근거한다.

로컬 fixture는 실제 페이지·CSS·UI 및 toast provider를 사용하고 API 요청을 전부 합성 응답으로 대체했다. 실제 로그인, 운영 API/DB 쓰기, 운영 배포 smoke는 수행하지 않았다. 기존 Browserslist 데이터 및 큰 chunk 경고는 비차단이며 의존성 변경은 하지 않았다.

## 개발 인계

기준 main `761fb49e3e`, branch `wo/neture-taxonomy-dialog-keyboard`. 검증 → commit → push → PR 생성이 개발 종료점이다. CI 및 통합 검토는 PR에서 확인한다. 병합·auto-merge·배포 dispatch는 수행하지 않으며 작업 branch/worktree는 후속 수정용으로 보존한다.

문서 정합: 작업 기록만 추가했다. 현행 정본 변경과 범위 밖 drift 발견은 없다.
