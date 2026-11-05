# 디스플레이 재생 단순화 TODO

> **상태**: COMPLETED — 개발·PR 전달 범위
> **작성일**: 2026-11-05 · **최종 갱신**: 2026-11-05
> **근거**: 사용자 요청 — 매장 재생 일정 폐기, 화면별 재생목록 직접 선택, 영상 등록 구분; 종료점 PR까지

## 승인 범위

동영상 보관함 → 재생목록 → 디스플레이 재생. 매장 전용 시간표를 제거하고 해당 화면에서 목록을 선택해 재생한다.
새 탭은 클릭한 기기에서 열리며, 다른 기기는 복사한 주소로 연다. 기기 등록/원격 제어를 새로 만들지 않는다.
재생 시작은 사용자 동작이며 기본 음소거, 전체화면 요청 실패 시 일반 화면 재생을 지원한다.
O4O 영상 등록 / 외부 영상 연결 / 제공 영상 가져오기로 등록 경로를 구분하고 AI는 선택적 보조로 둔다.
main 병합·배포·운영 DB 변경은 하지 않는다. 기존 자료/테이블 삭제와 다른 소비처의 공통 일정·필수 노출 기간은 별개다.

## 조사·범위 보정

- [x] 최신 main·worktree·미커밋 상태·관련 열린 PR 확인
- [x] 관련 PR #945와 이번 요청의 중복/의존 확인, 다른 작업을 보호하는 branch/PR 기준 확정
- [x] 정본·Frozen 모델·매장 playlist 저장/권한 경계 및 공통 소비처 확인
- [x] 매장 전용 schedule 화면·메뉴·API client·hook·server endpoint·테스트 목록 확정
- [x] 공개 재생 주소·게시 상태·forced 노출 기간·다른 schedule 소비처 조사
- [x] 동영상 등록의 파일/보관 영상/외부 URL/제공 영상/AI/OAuth 경로 조사
- [x] 조사 결과와 제거/보존 표를 이 TODO에 보완

## 조사 결과 · 제거/보존 경계

- 기준: origin/main `50fccb6875`, 독립 branch `wo/display-playback-simplification`.
- PR #945는 다른 가입·매장 연결 변경을 포함하고 최신 main과 충돌한다. 가져오기를 취소했으며 그 PR/branch는 수정하지 않는다. 현재 main에 이미 통합된 매장 흐름에서 직접 진행한다.

| 대상 | 처리 | 근거/소비처 |
|---|---|---|
| 매장 시간표 UI·메뉴·useSignageSchedules·signageSchedule client | 제거 | 실제 소비자는 web-store의 관리/선택/재생 화면과 관련 테스트 |
| API routes/signage의 schedule controller/service/repository·DTO·formatter | 제거 | 해당 전용 routes만 소비. `/schedules*`, `/active-content`는 auth 이후 404 |
| digital-signage-core 공통 scheduler/entity·DB 테이블·과거 일정 데이터 | 보존 | 공통 기반/보유 데이터는 이번 기능 폐기와 별개. migration 없음 |
| store-ui-core 시간표 helper | 제거 | 전체 TS/TSX 소비처 조사상 매장 시간표만 사용 |
| store_playlists 및 공개 published reader | 보존 | snapshot/forced 시간창 유지. signage_playlists로 전환하지 않음 |
| 방송 카탈로그 legacy reader | 보존 | 기존 직접 ID 사용은 404 시에만 별도 reader. 권한 실패 우회 금지 |
| Tablet ScreenSet / 필수 영상 노출 기간 | 보존 | 디스플레이 목록 선택과 다른 축 |
| VideoRegistration | 공통 화면 개선 | web-store와 web-neture CommunitySignagePage 두 소비처 모두 검증 |
| 과거 WO/CHECK/archive | 보존 | 당시 실행 이력. 현행 baseline과 현재 TODO에서 정책을 갱신 |

## 구현

- [x] 매장 전용 재생 일정 화면·메뉴·hook·API client와 전용 server 경로 제거/폐기
- [x] 디스플레이 재생: 새 탭 → 게시된 재생목록 선택 → 재생 시작
- [x] 재생 주소의 목록 식별·새로고침 유지·목록 변경·주소 복사
- [x] 복수 창/기기 독립 선택; 전역 localStorage 선택 동기화 금지
- [x] 기본 음소거·사용자 시작·전체화면 실패 복구·전체화면 종료 후 목록 변경
- [x] 개별 영상 오류 다음 이동·전체 실패 재시도·빈 목록·게시 해제/권한 오류 처리
- [x] 영상 등록 O4O 영상 등록 / 외부 영상 연결 분리, 제공 영상 가져오기 유지
- [x] 미사용 매장 전용 코드 정리, 기존 URL을 안전하게 정리
- [x] 현행 문서 수정·불필요 안내 제거; 과거 WO/CHECK는 당시 기록으로 보존

## 검증·종료

- [x] 권한/조직 격리·게시 목록·필수 노출 기간 회귀
- [x] 관련 테스트·type-check·production build
- [x] PC/mobile·두 재생 창·새로고침·주소 복사·실패 복구 실제 Chromium 검증
- [x] TODO 재점검·문서 정합·미확인/기존 실패 구분
- [x] 경로 단위 commit·push, 기존 PR 중복 없이 후속 PR 생성

## 검증 기록 — 2026-11-05

- Node 22.23.4 / pnpm 10.25.0, frozen lockfile 설치. 의존성/lockfile 변경 없음.
- web-store 전체: **94 files / 937 tests PASS**. 최종 사이니지 변경은 개별 오류 건너뛰기, 모든 실패 재시도, store 전환 응답 폐기, 이전 `_schedule` 주소 안내, published/active 목록만 선택, 403에서 public reader 우회 금지를 포함한다.
- store-ui-core 공통 계약: **3 files / 55 tests PASS**. 공통 메뉴/목록의 체크·ActionBar 업무 연결 유지.
- API signage 범위: **13 suites / 241 tests PASS**, 기존 조건부 **1 suite / 5 tests SKIP**. 매장 schedule endpoint auth/404/무쓰기, 조직 격리, stored video, forced 시간창/태블릿 surface를 포함한다.
- web-store(type-check 포함)·web-neture(type-check 포함) production build, API type-check·tsup bundle PASS. 기존 chunk 크기/Browserslist/tsconfig 중복 옵션 경고는 범위 밖이며 설정을 변경하지 않았다.
- 실제 Chromium + 로컬 가상 자료: PC 1440px / mobile 390px, 새 탭 → 체크 → 상단 ActionBar → 재생, 독립 두 창, 새로고침, 주소 복사, 목록 변경, native 전체화면 진입/해제, 전체화면 거절 시 일반 재생, media 404 후 재시도, 목록 조회 실패/복구, 선택적 AI 없는 외부 영상 등록. pageerror 0.
- 재생 중 조작부는 숨기고 작은 `재생 설정 열기`로 접근한다. 목록은 자동으로 바꾸지 않으며 `변경한 목록 다시 적용`으로 명시적으로 다시 읽는다.
- 브라우저 자료/계정·API는 격리 fixture다. 운영 로그인·실제 약국 TV·실제 YouTube/Vimeo 서비스 transport/등록은 검증하지 않았다. 브라우저 실패 복구를 외부 영상 재생 성공으로 기록하지 않는다.
- main 병합·배포·운영 DB 변경·클라우드 환경 게시 없음. 배포 판단은 후속 통합 단계다.

## 문서 정합

- 현재 결정은 playlist 모델 경계 baseline §0-1에 반영했다. 저장 모델 통합 금지는 유지하며 매장 시간표/직접 선택에 한해 사용자 승인으로 기존 재생기 변경 금지를 대체한다.
- KPA signage 구조의 흐름/컴포넌트/API 안내를 갱신하고 공통 메뉴 정본에 현행 정책을 명시했다. 과거 구현 로그·WO/CHECK는 당시 기록으로 유지했다.
- 코드 전체 소비처(services/apps/packages와 raw-source tests)를 확인했다. 은퇴한 schedule client/controller 경로 참조는 남기지 않았다. 기존 schedules URL redirect와 `_schedule` 안내만 호환 처리로 남긴다.
- API 전용 시간표 코드·DTO·formatter와 미사용 UI helper/중복 영상 등록 양식을 제거했다. 공통 scheduler/entity·기존 데이터는 유지했다.

## 검토용 화면

모두 로컬 가상 자료다. 운영 매장/계정 정보는 포함하지 않는다.

- [PC 재생목록 선택](../design/assets/display-playback/desktop-chooser.png)
- [모바일 디스플레이 재생](../design/assets/display-playback/mobile-playback.png)
- [모바일 외부 영상 연결](../design/assets/display-playback/mobile-registration.png)

## PR 전달

- PR: [#948 — 재생 일정 폐기 및 디스플레이별 재생목록 선택](https://github.com/Renagang21/o4o-platform/pull/948)
- branch: `wo/display-playback-simplification`; 구현 commit: `00d5148cc9`.
- 지정된 개발·PR 생성 범위는 완료했다. GitHub CI 결과와 #945 중복 파일 확인·main 통합·배포/현장 TV 검증은 후속 통합 단계다. 이 문서의 COMPLETED는 운영 배포 완료를 의미하지 않는다.
