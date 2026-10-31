# CHECK-O4O-STORE-VIDEO-PLAYBACK-COMPLETION-V1

- 작성일: 2026-10-31
- 상태: LOCAL_VERIFIED — PR CI·Codex 검증 진행, main 병합 전
- 기준 main: `0ab734a68c599e63e00c6f4d972243b77df03416`
- 범위: [TODO](../work-orders/TODO-O4O-STORE-VIDEO-PLAYBACK-COMPLETION-V1.md), 기존 매장 영상 저장·목록 재생·태블릿 ScreenSet 연결

## 구현 결과

- `VideoPlayback`과 `useMediaSequence`로 native video / YouTube SDK / Vimeo iframe의 종료 이벤트를 처리한다. 영상 길이 대신 종료 후 다음 항목으로 진행하고 마지막에서 처음으로 돌아간다. 한 항목 목록도 재생기를 다시 시작한다. 이미지 자료만 표시 시간 타이머를 사용한다.
- 로드·버퍼 대기 실패는 드러내고 다음 재생 가능한 자료로 넘어간다. 전 항목 실패면 중지하고 명시적 재시도를 제공한다. 자동재생 권한이 막히면 사용자 재생 버튼을 표시한다. Vimeo 이벤트는 공식 origin과 현재 iframe window를 함께 확인한다.
- 공통 MediaPicker의 기존 image 모드는 유지하고 video 모드를 선택적으로 제공한다. 업로드는 기존 공용 라이브러리 동의 후 실행한다. MP4/WebM 30MiB까지 기존 multipart 경로로 보관하며 큰 파일은 YouTube 저장을 안내한다. 영상 제작 제공업체·presigned 예시 endpoint는 사용하지 않는다.
- 보관 파일은 기존 `media_assets`에서 선택한다. 서버가 접근·관리 파일·타입·URL을 확인하고 기존 `signage_media`에 멱등 등록한다. 기존 snapshot/playlist 작성·게시·기기 적용 경계는 유지한다. 일반 편집으로 파일 URL·파일 출처를 위조해 바꾸지 못한다.
- 삭제와 참조 생성이 동일 자산 row lock을 사용한다. 기존 Signage Media / immutable signage snapshot / ScreenSet 참조가 있으면 보관 파일을 삭제하지 않는다. 스키마·migration·연결 enum·새 미디어 원장을 추가하지 않았다.
- Tablet ScreenSet은 기존 `idle_media.config.items` 배열에 영상 선택·주소 추가·순서 변경·제거를 저장한다. hero/idle 모두 같은 종료 기반 순환 재생을 사용한다.
- 지정 YouTube 채널 Studio 업로드 링크와 개별 영상 주소 등록을 연결했다. 채널 URL·위장 제공업체 URL은 재생 주소로 등록하지 않는다. **YouTube 자동 업로드/OAuth는 기존 구현이 없어 추가하지 않았다. 업로드는 사용자가 YouTube에서 수행한다.**
- 목록 재조회는 시작/수동 재적용 때만 수행한다. 반복 중 서버 목록 polling·자동 교체를 추가하지 않았다.

## 검증 증거

| 검증 | 결과 |
|---|---|
| 의존성 설치 | `pnpm install --frozen-lockfile --offline` PASS |
| 공통 의존 패키지 빌드 | `pnpm run build:packages` PASS |
| Store 전체 회귀 | 87 suites / 914 tests PASS; 이후 추가한 목록 저장·재열기 포함 대상 8 suites / 102 tests PASS |
| API 주변 회귀 | signage / store-tablet / screen-set / media-library / stored-video: 20 suites, 329 PASS, 선택적 DB 등 12 SKIP |
| 격리 PostgreSQL 실제 검증 | `MEDIA_V2_TEST_PORT=55439`로 관련 6 suites / 97 tests PASS. 기존 migration을 일회용 로컬 DB에 적용; 실제 row lock 및 참조/삭제 경합 확인 |
| Chromium 실제 코덱 | `node scripts/checks/store-video-playback.browser.mjs` PASS. 1365px/390px, 합성 WebM 실제 ended A→B→A, 개별 loop 없음, 보관 영상 선택 |
| 외부 SDK 계약 | 합성 YouTube SDK ended/중복/cleanup, Vimeo origin+window 검증, autoplay 제한·로드 오류 테스트 PASS |
| 공통 소비처 | literal consumer 조사 + Store/Neture/약국업무/API/Admin 타입 검사. 실제 번들 결과는 아래 PR 검증에 기록 |
| 코드·문서 가드 | 변경 경로 eslint 오류 0, diff whitespace 및 문서 민감정보 검사 수행 |

DB 검증은 이 작업 전용 Docker PostgreSQL에서만 수행하며 운영 DB·실계정·실사용자 파일을 사용하지 않는다. 브라우저 테스트는 로컬 합성 영상과 API fixture만 사용한다. YouTube/Vimeo 실서비스 품질·채널 권한·실제 업로드를 검증한 것으로 간주하지 않는다.

## 문서 정합

재생 경로 정본의 “첫 URL만 재생 / 다중 순서 재생은 현행 요구 아님”과 “YouTube/Vimeo만 허용” 내용을 현재 사용자 결정으로 교체했다. 콘텐츠 제작 원칙에는 명시적 Media Library 보관과 기존 VIDEO Job 임시 결과 48시간 TTL의 차이를 반영했다. 과거 WO/CHECK는 당시 기록으로 유지한다.

## 남은 현장 점검 / 인계

- 실제 약국 TV·태블릿의 장시간 재생, 전원/브라우저 복구·네트워크 상태·YouTube 퍼가기/영상 공개 권한은 사용자 결정대로 개발 완료 후 현장 점검 대상이다.
- main 병합·배포·외부 계정 업로드·운영 변경은 이 개발 작업에서 수행하지 않는다.
- PR/HEAD·CI·Codex와 소비 서비스 최종 빌드 결과를 확인하고 병합 직전 상태로 인계한다.
