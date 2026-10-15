# 내 매장 태블릿 화면 구성·사이니지 미디어 작업 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거**: 사용자 승인 — 내 매장 후속 작업 중 태블릿 진열·화면 구성과 사이니지 미디어 편집·미리보기 정비

## 기준과 범위

착수와 push 전 확인한 `origin/main`은 `c7f2c29eb`다. 전용 branch는
`wo/store-display-media-workflow`이며 기존 작업 트리는 재사용하지 않았다.
이전 다국어 작업 PR #607은 착수 시 미병합이고 해당 branch의 변경을 전제로 삼지 않았다.

관련 정본은 [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[매장 웹 설계](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md),
[태블릿 canonical 재생 경로](../baseline/O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md),
[사이니지 playlist 모델 경계](../baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md),
[소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)다.

진입 route는 `commerce/tablet-displays`, `marketing/signage/videos`와 동일 child route의
서비스 지정 경로다. 태블릿 화면 세트 목록 → 제작기 → 빠른 상품 수정 및 미리보기 소비처와
사이니지 직접 미디어/스냅샷 편집 분기를 함께 조사했다.
`TabletProductListQuickEditor`의 현재 직접 소비처는 `TabletContentLibraryList`다.
기존 URL·권한·매장 문맥을 유지하며 서비스 내부 UI와 API client만 변경했다.
공통 Core·서버 API 계약·DB·의존성·lockfile·배포 설정은 변경하지 않았다.
`store_playlists`와 `signage_playlists`를 통합하거나 dual-write하지 않았고
태블릿의 ScreenSet → `idle_media` 재생 경로를 유지했다.

## 확인한 문제와 변경

- 진열 제품의 설명 후보 조회 실패가 정상 빈 목록으로 취급되어 저장된 `contentId`를 지울 수 있었다.
  실패와 빈 결과를 구분하고 기존 연결을 보존하며 명시적 재시도를 제공한다.
  정상 응답에서 연결 대상이 없어진 경우의 기존 정리 동작은 유지한다.
- 화면 세트 목록은 오류·정상 0건을 구분하고 재시도한다. 매장·서비스 전환 시 세션을 교체한다.
  상세 조회 취소·새 만들기 이후의 늦은 응답은 제작기를 다시 열지 않는다.
  StrictMode 재마운트에서도 자동 편집 진입을 확인했다.
- 서비스 내부 제작기 adapter가 닫힌 세션의 후속 조회/쓰기를 차단하고 동시 쓰기를 막는다.
  최초 header 생성 후 blocks 저장이 실패하면 같은 편집창에서 재시도할 때 기존 header를 갱신한다.
  서버 응답이 유실된 요청의 전역 멱등성을 새로 제공하는 것은 아니다.
- 빠른 상품 수정은 조회 실패 후 빈 선택을 저장하지 못하도록 막고 재시도를 제공한다.
  저장을 직렬화하고 입력·닫기 버튼을 잠그며 실패한 선택·순서·검색을 보존한다.
  대상 변경·unmount·매장 전환 후 이전 완료가 다른 편집창을 닫지 않는다.
  모바일은 상품 목록과 추가 목록을 한 열로 배치한다.
- 고객 화면 미리보기는 공개 설정 조회 실패 시 기본 설정으로 열지 않는다.
  요청 취소 이후의 늦은 응답은 창을 다시 열지 않는다.
- 사이니지 미디어는 읽기 실패·빈 결과를 구분하고 재시도한다. 등록·편집·삭제의 중복 쓰기와
  저장 뒤 늦은 조회가 목록을 덮는 경합을 방지한다. 인증 갱신 재전송은 원래 매장 header·method·body를 유지한다.
  잘못된 목록·저장 응답을 빈 목록이나 성공으로 처리하지 않는다.
- 동영상 편집은 저장 중 입력·닫기를 잠그고 실패한 초안을 보존한다. 닫힌 drawer는 렌더하지 않는다.
  YouTube/Vimeo URL로 명시적 미리보기 버튼을 눌렀을 때만 iframe을 연다.
  URL·대상 변경 시 이전 player를 숨기고 미리보기만으로 저장하지 않는다.
  원래 직접 미디어 갱신과 스냅샷 갱신 분기는 그대로 사용한다.

## 자동 검증

Node `22.18.0`, pnpm `10.25.0`; 환경 활성화 후 다음 검사를 실행했다.

| 검사 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile --verify-store-integrity=true --store-dir /workspace/.pnpm-store` | PASS |
| `pnpm run build:packages` | PASS |
| `pnpm exec vitest run --config services/web-store/vitest.config.mjs --maxWorkers=2` | PASS — 37 files / 479 tests |
| 추가 회귀 검사 | PASS — 화면 세션 24, 실제 페이지 10, 미디어 API scope 9: 총 43 tests |
| `pnpm --filter store-web build` | PASS — TypeScript + Vite, 기존 chunk 크기 경고 |
| 변경 TS/TSX 12개 집중 ESLint | PASS — 오류·경고 0 |
| `git diff --check`, 문서 민감정보 검사 | PASS |

페이지 회귀 검사는 일부 자식 제작기를 대체해 지연 요청·취소·매장 전환을 분리 검증한다.
별도 브라우저 검증에서는 실제 공유 제작기와 실제 서비스 API client를 사용했다.

## 합성 브라우저 검증

Production bundle에 실제 화면 컴포넌트·공유 제작기·스타일을 포함하고 매장 문맥/인증만 합성했다.
실제 API client의 HTTP 요청에는 브라우저가 합성 응답을 반환했다.
Chromium의 데스크톱 `1440×1000`, 모바일 `390×844`에서 아래 7개 흐름씩 **14개 PASS**다.

1. 진열 설명 조회 실패 → 기존 연결 유지·저장 비활성 → 재시도 → 기존 선택 복원.
2. 빠른 상품 수정 조회 실패 → 재시도 → 상품 추가·검색 → 중복 저장 억제 → 실패 초안 보존 → 저장 재시도.
3. 화면 세트 목록 실패 → 재시도 → 실제 제작기에서 생성 → blocks 실패 → 중복 생성 없이 재저장.
4. 실제 목록의 수정 요청 지연 → 불러오기 취소 → 늦은 상세 응답이 제작기를 열지 않음.
5. 사이니지 미디어 목록 실패 → 재시도 → 제목 수정 → 명시적 미리보기, 저장 요청 0건.
6. 미디어 저장 중 취소 잠금·중복 억제 → 실패 초안 보존 → 재시도 성공 후 drawer 닫힘.
7. 합성 매장 전환 시 미디어 초안·미리보기 제거. 매장 전환은 harness의 외부 문맥 변경으로 주입했다.

각 viewport에서 page error 0, 예상하지 않은 요청 0, 점검 화면의 문서 가로 넘침 0을 확인했다.
iframe은 viewport별 2회 합성 player HTML을 반환했으며 외부 provider로 실제 연결하지 않았다.
화면 캡처는 로컬 검증 산출물이며 저장소에는 포함하지 않는다.

## 미확인과 인계

실계정 로그인·운영 데이터 write·실제 태블릿/사이니지 연결·영상 재생·수정 반영·실제 QR 출력/스캔은
수행하지 않았다. 이 기록은 실사용 또는 운영 배포 검증 완료를 뜻하지 않는다.
영상 provider의 재생 허용·비공개 영상·네트워크 오류는 실제 기기 검증에 남아 있다.
직원 초대·승인·접근 해제 및 매장 간 실계정 격리 검증도 기존 인계대로 별도다.

개발 종료점은 commit·push·PR 생성과 CI 상태 인계다. 병합·자동 병합 설정·배포는 통합 담당 범위다.
문서 정합: 이번 검증 CHECK를 추가했다. 정본 변경이나 기존 기록의 상태 변경은 없다.
