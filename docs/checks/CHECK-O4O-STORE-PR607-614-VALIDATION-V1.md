# 내 매장 PR #607·#614 통합 전 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거**: 사용자 승인 — 두 PR의 최신 CI·리뷰 확인, 변경 원인의 실패 수정, 임시 통합 branch 검증과 인계

## 기준과 작업 격리

- 기준 main: `c9b72ee2a` (PR #605 병합 이후).
- PR #607: `e08b65f89ead58c440eca70f7f4a96141da60466`.
- PR #614: `7a9f327e756c069c5824e3303a3809ae381302ff`.
- 새 전용 branch/worktree: `wo/store-pr607-614-validation`.
- 위 두 원격 PR head를 순서대로 이 branch에 병합했다. 충돌은 없었다.
  원본 PR branch·기존 작업 트리를 수정하거나 재사용하지 않았다.
  이 branch는 두 PR의 코드를 모두 포함하는 검토용 통합 후보이며 main 병합은 수행하지 않았다.

정본은 [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md),
[B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md),
[사이니지 playlist 모델 경계](../baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md),
[태블릿 canonical 재생 경로](../baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md)를 따른다.
공통 Core·서버 API 계약·DB·의존성·lockfile·운영 설정은 변경하지 않았다.

## 리뷰 판정과 수정

PR #607의 원래 인계 head 이후 SonarCloud 신뢰성 지적 수정 및 공개 액션 관련 후속 수정이
원격에 추가되어 있었다. 과거 Sonar 실패를 현재 head의 실패로 재사용하지 않았다.
현재 코드와 회귀 검사에서 다음 세 리뷰 지적이 반영되었음을 확인했다.

1. 저장된 공개 가능 페이지가 없으면 고객용 링크·QR 비활성.
2. 비 HTML 페이지는 본문 upsert를 금지하면서 상태만 초안으로 변경 가능.
3. 공개 상태 GET 이후 시작한 저장/공개 중단이 그 GET 응답을 무효화함.

원본 PR의 미해결 리뷰 스레드 표시는 코드 반영 여부와 별개다. 이 작업에서 원본 스레드를
임의로 해결 처리하거나 새 리뷰를 요청하는 댓글을 보내지 않았다.

PR #614의 리뷰 지적은 유효했다. 편집 저장 전에 `videoPreviewUrl`을 검사하여
직접 업로드 MP4·이미지·HTML 등의 복사 스냅샷에서 제목만 바꿔도 저장이 차단되었다.
이 통합 후보에서 해당 저장 조건을 제거했다. provider 허용 목록은 선택적 iframe 미리보기에만 사용하며,
기존 직접 미디어 등록의 YouTube/Vimeo 입력 계약은 유지한다.
MP4·이미지·HTML 각각의 실제 페이지 회귀 검사 3개를 추가했다.
원본 #614 자체에는 이 수정이 아직 없으므로 원본의 CI 성공만으로 수정 완료를 판단하지 않는다.

## 자동 검증

Node `22.18.0`, pnpm `10.25.0`; frozen lockfile·무결성 검증으로 설치했다.

| 검사 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile --verify-store-integrity=true --store-dir /workspace/.pnpm-store` | PASS |
| `pnpm run build:packages` | PASS |
| `pnpm exec vitest run --config services/web-store/vitest.config.mjs --maxWorkers=2` | PASS — 39 files / 525 tests |
| `pnpm --filter store-web build` | PASS — TypeScript + Vite; 기존 chunk 크기 경고 |
| 두 PR 변경 TS/TSX 22개 집중 ESLint | PASS — 오류·경고 0 |
| `git diff --check`, 문서 민감정보 검사 | PASS |

첫 테스트 실행은 패키지 빌드 완료 전에 시작해 `@o4o/account-ui`, `@o4o/ui` 진입점을 찾지 못한
6개 파일이 있었다. 패키지 빌드 완료 후 전체 테스트를 다시 실행한 위 결과로 판정했다.

## 합성 브라우저 검증

두 PR 및 회귀 수정을 함께 포함한 하나의 production bundle을 사용했다.
실제 서비스 화면·공유 제작기·API client·스타일을 사용하고 매장/인증 문맥과 HTTP 응답만 합성했다.
Chromium `1440×1000`, `390×844`에서 viewport별 아래 18개 흐름, **총 36개 PASS**다.

- 다국어 8개: 제공 자료 연결 제품 조회 실패/복구; 검색·페이지·선택과 가져오기 실패/중복 억제;
  대체 언어와 연결 제품 진입; 실제 편집기에서 언어별 초안 보존·저장;
  고객용 공개 안내·QR 실패/재시도·URL 복사·팝업; 비 HTML 공개 중단;
  지연 공개 GET 후 완료된 공개 중단 유지; 매장 전환 시 이전 초안·공개 출력 제거.
- 태블릿/사이니지 10개: 진열 설명 조회 실패 시 연결 보존/재시도; 빠른 상품 수정 실패/복구;
  화면 세트 생성 후 blocks 실패 재시도 시 기존 header 재사용; 상세 지연 요청 취소;
  미디어 조회 복구와 명시적 초안 미리보기; 중복 저장·닫기 잠금과 실패 초안 보존;
  매장 전환 시 초안/player 제거; MP4·이미지·HTML 스냅샷 각각의 제목 수정 저장.

각 검사에서 page error·예상하지 않은 HTTP 요청은 0이다. 점검 화면의 문서 가로 넘침도 0이다.
영상 iframe은 viewport별 2회 합성 player HTML을 반환했다. 실제 외부 provider 연결·재생 검증이 아니다.
합성 API만 사용했으므로 운영 업무 데이터 생성·수정·삭제는 없다.

## CI와 인계 범위

착수 시 #614의 해당 head는 CI Gate·SonarCloud 모두 SUCCESS였다.
#607의 해당 head CI는 진행 중이었다. 최종 원격 CI 상태는 PR 인계 시 조회한 결과를 별도로 따른다.
원본의 CI 성공과 새 통합 후보 head의 CI 성공을 구분한다.
실제 main rules는 PR·CI Gate 필수, human approval 0, 스레드 해결 강제 없음으로 read-only 확인했다.
기술 gate 확인을 병합 승인으로 해석하지 않았다.

main 병합·자동 병합·배포·실계정 로그인·운영 데이터 변경·실제 기기 재생·실제 QR 출력/스캔은 수행하지 않았다.
두 원본 PR과 이 통합 후보의 적용 순서는 통합 담당자가 결정해야 한다.
기존 작업 트리는 모두 보존한다. 새 작업 트리도 미병합 검증 후보와 후속 수정에 필요하여 KEEP이다.

문서 정합: 새 통합 검증 CHECK를 추가했다. 과거 CHECK는 당시 기록으로 보존하고 정본·색인 상태는 바꾸지 않았다.
