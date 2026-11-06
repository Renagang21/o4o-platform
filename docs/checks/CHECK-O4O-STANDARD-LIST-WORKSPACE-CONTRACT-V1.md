# O4O 표준 목록 업무 화면 계약 검증

> 상태: 개발 검증 · PR 인계 (main 병합 · 배포 미수행)
> 작성일: 2026-11-06
> 작업 branch: `wo/standard-list-workspace-contract`
> 개발 기준: `dd83d30d29` 이후 `origin/main` 반영
> 근거: [TODO](../work-orders/TODO-O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1.md), [화면 계약 정본](../architecture/O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1.md)

## 판정 요약

| 영역 | 판정 |
|---|---|
| Core 계약(`ListWorkspace` · `useListSelection` · `ActionBar`) | PASS |
| 사이니지 동영상 · 재생목록 · 디스플레이 재생 | PASS (모의 API 브라우저 검증 + 새 프런트 · 운영 API 읽기 실연결, 아래 표) |
| 기존 비준수 화면 20개 전환 | 타입검사 · 테스트 PASS. 모의 API 브라우저는 일부 화면만 PASS(아래 표). **배치 전환이며 `ListWorkspace` 직접 채택은 사이니지뿐** |
| 재생목록 재생시간 집계 SQL | PASS (로컬 임시 PostgreSQL 17 + 시험 스키마, 아래 표). 운영 DB 실행은 미확인(미해결 1) |
| YouTube · Vimeo 재생, 전환 · 반복, 전체화면 시작 | PASS (데스크톱 Chrome, 재생목록 응답만 가로챈 시험. 실제 TV 미확인) |
| 운영 환경 smoke | **미수행** (이번 코드 미배포. 위 실연결은 로컬 새 프런트 + 운영 API 읽기이며 배포 smoke 가 아니다) |

## 자동 검증

Node 22.23.4 / pnpm 10.25.0 기준.

| 대상 | 타입검사 | 테스트 |
|---|---|---|
| `services/web-store` | `tsc -b` 통과 | 전체 98파일 970 PASS (최종 문구 반영 후 재실행) |
| `services/web-neture` | 통과 | 180파일 1530 PASS |
| `services/web-pharmacy-coop` | 통과 | 11파일 89 PASS |
| `apps/admin-dashboard` | 통과 | 관련 23파일 130 PASS, operator-role-catalog 15 PASS (전체 실행 아님) |
| `apps/api-server` | 통과 | `store-playlist-media-boundary` 9 PASS (전체 실행 아님) |
| `packages/operator-core-ui` | 변경 파일 오류 0 | 35파일 238 PASS |
| `packages/store-ui-core` | 변경 파일 신규 오류 0 | 10파일 156 PASS |
| `packages/shared-space-ui` | 변경 파일 오류 0 | 24파일 222 PASS |
| `packages/ui` | build 통과 | 4파일 45 PASS |

- `services/web-store` `vite build` 통과 (최종 문구 반영 후 재실행).
- 패키지 단독 `tsc --noEmit`(operator-core-ui · store-ui-core · shared-space-ui)은 이 변경과 무관한 기존 오류가 많아 변경 파일 기준으로 판정했다. `store-ui-core` 의 `VideoRegistration.tsx:4` TS6059(`tablet-kiosk-core` rootDir)는 `7f1ee655f5c`(2026-11-01)에서 들어온 기존 import 줄의 오류이며, 이번 변경으로 고치지 않았다.

## 브라우저 검증

**실서버가 아니라 로컬 web-store + Playwright 응답 가로채기(모의 API)다.** PC 1280 · mobile 390. 운영 API · 데이터에는 접근하지 않았다. 재생 검증은 브라우저에서 녹화한 실제 webm 을 사용했다.

| 시나리오 | 결과 |
|---|---|
| 동영상: 등록 버튼 위치, 제목→필터→표, 체크→ActionBar, 검색 변경 시 선택 정리, 무결과에 중앙 버튼 없음 | PASS |
| 동영상 등록: `O4O 영상 등록 / 외부 영상 연결`, 직접 URL | PASS |
| 재생목록: 만들기 버튼 위치, '상세 관리' · '저장한 재생목록 선택' 제거, 동영상 수 · 총 재생시간 | PASS |
| 재생목록: 이름 클릭→상세, 체크→수정→상세, 없는 ID 직접 URL | PASS |
| 재생목록 삭제: 서버 실패 시 항목 유지 → 재시도 → 서버 결과로 갱신 | PASS |
| 빈 목록: 상단 · 중앙 같은 버튼 | PASS |
| 지속 403(재생목록 목록 · 상세 항목 · 동영상): 빈 목록 위장 없이 오류 + 다시 시도, 복구 후 재조회 | PASS |
| 폐기 경로 `/schedules` → 디스플레이 재생, 매장 일정 표기 없음 | PASS |
| 디스플레이: 선택→재생 시작→`/play/:id`, 두 탭 서로 다른 재생목록 유지 | PASS |
| 재생: 버튼 제스처 전체화면 진입, 음소거 자동재생, `a>b>a` 순서 반복 | PASS (headless Chromium) |
| 재생: 실패 영상 건너뛰기, 전체 실패 안내, 다시 재생 복구 | PASS |
| 다른 소비처 `commerce/local-products` · `library/contents` | 렌더 · 머리 버튼 · 가로 넘침 PASS. 표 행 동작은 미확인(아래 미해결 3) |

첫 실행의 FAIL 은 모두 원인을 확인했다.

- 버튼 이름을 잘못 찾은 시나리오 오류(`수정` → `선택 재생목록 수정`)는 시나리오를 고쳐 PASS.
- 1회성 403 주입은 다음 호출이 복구해 목록이 나온 것이어서 판정에 쓸 수 없었다. 거절을 유지하는 시나리오로 교체해 위 표의 결과를 얻었다. 최종 전체 실행의 잔여 FAIL 4건이 이 폐기된 1회성 시나리오이다.
- 디스플레이 선택 화면에서 확정 용어와 어긋난 제품 문구(`플레이리스트` · `재생` · `항목 수`)를 발견해 수정했다.

### 전환 화면 (web-neture · web-pharmacy-coop · admin-dashboard · web-store)

로컬 dev 서버 + 모의 API, PC 1280 · mobile 390. 응답은 대부분 빈 목록이다. 아래 화면은 모두 렌더 크래시와 가로 넘침이 없었다. **표의 위치(y)는 첫 화면 800 / 844px 기준으로 읽는다.** 행 체크 · ActionBar 를 브라우저로 실행한 전환 화면은 조합원 관리뿐이고, 나머지 화면의 행 동작은 단위 테스트 근거다.

| 화면 | 확인 내용 | 결과 |
|---|---|---|
| web-neture `/admin/brands` | 안내 접힘, 표 y422 | PASS |
| web-neture `/store/orders` | 안내 접힘, 빈 목록 | PASS |
| web-neture `/operator/product-approvals` | 안내 접힘, 표 y468. `휴지통 열기` 는 제목 아래 왼쪽(기존 보조 작업) | PASS |
| web-neture `/operator/product-candidates` | 안내 접힘. 표 y731(PC) · y1352(mobile) | 배치 PASS, 첫 화면에 표 없음(미해결 7) |
| web-neture `/admin/settlements` | `정산 계산` 상단 오른쪽, 눌러야 `계산 실행` 표시 | PASS. 알림 오류 표시는 모의 응답 형식 때문이며 표는 미확인 |
| web-neture `/admin/settings/legal-terms` | 렌더 | PASS |
| web-neture `/admin/community` | 공통 콘솔, 표 y284 | PASS |
| web-neture `/operator/suppliers` (supplier 호스트) | 표 y471, 빈 목록 | PASS |
| web-neture `/supplier/library` (supplier 호스트) | `자료 등록` 오른쪽(PC) · 제목 아래(mobile), 안내 접힘, 빈 목록 | 배치 PASS, 표 미확인 |
| web-pharmacy-coop 조합원 관리 | 2행 표시, 행 체크 → ActionBar · 선택 해제 표시. 표 y828(PC) · y1132(mobile) | 배치 PASS, **기존 결함 발견**(미해결 8) |
| admin-dashboard `/operator/kpa/force-assets` | `강제 배포 생성` 상단 오른쪽(right 1199), 클릭 동작, 표 y368 | PASS |
| admin-dashboard `/kpa/my-store-contents` | 표 y304 | PASS |
| admin-dashboard `/admin/o4o-product-db/masters` | `새 상품 등록` 오른쪽, 표 y484 | PASS |
| admin-dashboard `/operators` | `서비스 담당자 지정` 상단 오른쪽. 표 y680(PC) · y990(mobile) | 배치 PASS, 표가 낮음(미해결 7) |
| web-store `commerce/tablet-displays` 태블릿 콘텐츠 탭 | `태블릿 화면 만들기` 오른쪽(PC), 표 y773(PC) · y817(mobile) | PASS |
| web-store `commerce/order-worktable` | 모의 응답 형식이 맞지 않아 오류 · 다시 시도만 표시 | **배치 미확인** |
| 포럼 삭제 요청 콘솔 | 일반 경로로 화면을 열 수 없어 미실행(미해결 9) | **미확인** |

### 실연결 확인 (새 프런트 + 운영 API 읽기)

공개 테스트 계정(매장 경영자)으로 로그인했다. 브라우저에서 `store.neture.co.kr` 화면 요청만 이번 branch 의 로컬 dev 서버(`VITE_API_BASE_URL` 은 운영과 같은 주소)로 돌리고, API 는 운영을 호출했다. 로그인 외 쓰기 요청은 모두 차단했고 차단 기록은 0건이다. 운영 API 는 구코드라 새 응답 필드는 없다.

| 대상 | 확인 결과 | 판정 |
|---|---|---|
| 로그인 | PC 1280 · mobile 390 에서 `/store` 로 이동. pageerror 0 | PASS |
| `signage/videos` | 실제 3행, 열 `썸네일 · 영상 이름 · 출처 · 등록일`. `동영상 등록` 상단 오른쪽. 표 y444(PC) · y740(mobile). 가로 넘침 0, 오류 표시 없음 | PASS |
| `signage/playlist` | 실제 1행, 열 `이름 · 동영상 수 · 총 재생시간 · 수정일`. `재생목록 만들기` 상단 오른쪽. 표 y498(PC) · y742(mobile). 가로 넘침 0 | PASS |
| 구 API 응답의 총 재생시간 | 새 필드가 없는 응답에서 `—` 로 표시. 화면 오류 없음 | PASS (새 필드 값 표시는 모의 API 근거) |
| 재생목록 상세 | 행 선택으로 상세 이동, 가로 넘침 0. 항목 0개 · 초안이라 게시와 화면 열기 비활성 | PASS |
| `signage/player` | 안내와 `재생 화면 열기` 표시. 가로 넘침 0 | PASS |
| 초안 재생목록의 재생 주소 | 공개 재생 API 404, `게시 상태와 접근 권한을 확인` 안내 표시 | PASS (게시 전 차단 동작) |
| 테스트 매장 등록 YouTube 3건 | 재생 응답만 가로채 등록 URL 을 넣은 시험. 3건 모두 시간 진행, 일시정지 아님 | PASS |
| 공개 YouTube | 1920×1080 에서 음소거 자동 시작, 시간 진행, 오류 없음 | PASS |
| 공개 Vimeo `22439234` | 앱과 앱 밖 대조 페이지 모두 시간 진행 | PASS |
| 공개 Vimeo `76979871` · `1084537` | 앱과 대조 페이지가 같게 실패. 전자는 시험 Chrome 의 DRM 초기화 실패(`drminitfailed`), 후자는 Vimeo 의 자동화 접근 거절(401). 전자는 앱에서 건너뛰기 안내를 확인했고, 후자는 측정 시점(9초)에 `영상 준비 중…` 상태였다 | 앱 결함 아님. 시험 환경 제약 |
| 전환 · 반복 | Vimeo 끝 → YouTube, YouTube 끝 → Vimeo 복귀, 오류 표시 없음. 끝부분으로 시간을 옮겨 확인 | PASS |
| 전체화면 시작 | `전체화면으로 재생` 클릭 후 `document.fullscreenElement` 있음 | PASS |

오류 재현 정정: 처음 실연결에서 나온 `동영상을 불러오지 못했습니다` 는 dev 서버에 `VITE_API_BASE_URL` 을 주지 않아 미디어 요청만 잘못된 주소로 나간 시험 설정 문제였다. 운영 빌드는 이 값을 넣어 빌드하고, 배포된 화면에서 같은 API 는 200 · 3건이다.

## 재생목록 집계 SQL 실행

`findPlaylistsByOrganization` 의 쿼리 문자열을 소스에서 그대로 읽어, scratchpad 의 임시 PostgreSQL 17(운영 DB 미접속, 시험 후 종료)에서 실행했다. `store_playlists` · `store_playlist_items` · `o4o_asset_snapshots` · `signage_forced_content` 는 쿼리가 쓰는 컬럼만 마이그레이션과 대조해 만든 시험 스키마다. 전체 마이그레이션 적용이나 운영 데이터 실행이 아니다.

| 경우 | 동영상 수 · 필수 · 총 재생시간 · 시간 없음 | 판정 |
|---|---|---|
| 재생시간 60 + "35.4" | 2 · 0 · 95 · 0 | PASS (항목별 반올림 후 합산) |
| "abc" · 없음 · 0 · 음수 · 객체 | 5 · 0 · 0 · 5 | PASS (쿼리 오류 없이 시간 없음으로 집계) |
| 빈 목록 | 0 · 0 · 0 · 0 | PASS |
| 노출 기간이 끝난 필수 항목 포함 | 1 · 0 · 60 · 0 | PASS (끝난 항목 제외) |
| snapshot 이 없는 항목 | 1 · 0 · 0 · 1 | PASS |
| 다른 매장 재생목록 | 결과에 없음 | PASS |
| 같은 serviceKey 공통 필수 영상 1건 추가 | 각 목록의 동영상 수 · 필수 · 시간 없음이 1씩 증가, 총 재생시간 불변 | PASS |

`PREPARE` · `EXECUTE` 로 바인딩 파라미터의 타입 추론도 확인했다. `kpa-society` · `other`(각 1건 있음)는 필수 1건씩만 더해지고, `NULL` 은 더해지지 않는다.

## Consumer Impact Matrix

전체 소비처 분류는 [TODO §5](../work-orders/TODO-O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1.md#5-소비처-표) 가 정본이다. 집계: 전환 23 · 준수 20 · 읽기 전용 예외 51 · 목록 업무 아님 7 · 하위 표 2.

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability 영향 | 검증 방식 | 결과 |
|---|---:|---|---|---|---|
| web-store | 사용 | 사이니지 재구성, 화면 전환 | 신규 `videos/new` · 폐기 경로 redirect, 권한 변경 없음 | typecheck + test + 모의 브라우저 | PASS |
| web-neture | 사용 | 화면 3개 배치 | 없음 | typecheck + test + 모의 브라우저 | PASS |
| web-pharmacy-coop | 사용 | 관리 화면 배치 | 없음 | typecheck + test + 모의 브라우저 | PASS, 기존 결함 1건 수정(미해결 8) |
| admin-dashboard | 사용 | 화면 4개 배치 | 없음 | typecheck + 관련 test + 모의 브라우저 | PASS |
| operator-core-ui 소비 서비스 | 사용 | 공통 콘솔 배치 | 없음 | package test + web-neture 모의 브라우저 | PASS, 포럼 삭제 요청 콘솔은 브라우저 미확인(미해결 9) |
| api-server | 사용 | 재생목록 응답 필드 추가, 접근 없음 403, #945 누락 포팅 | API 응답 additive · 접근 거절 명확화 | typecheck + boundary test + 임시 DB 쿼리 실행 | PASS, 운영 DB 실행 미확인 |

`check-literal-consumers`: `ListWorkspace` · `GuideBlock` 경로 리터럴 0, `ActionBar` 는 기록 문서만. 원문 소스를 읽는 계약 테스트는 위 테스트 실행에서 통과했다.

## 미해결

1. **재생목록 집계 SQL 의 운영 스키마 실행 미확인.** 쿼리 동작은 임시 PostgreSQL 에서 확인했다(위 표). 다만 시험 스키마는 손으로 만들었고, 운영 API 는 구코드라 테스트 계정 로그인으로는 새 SQL 이 실행되지 않는다. 운영 DB 에는 접속하지 않았다. 배포 직후 같은 테스트 계정으로 `signage/playlist` 의 총 재생시간 표시를 확인하면 된다.
2. **실제 TV 와 배포 후 smoke 미검증.** 재생은 데스크톱 Chrome 에서만 확인했다. 실제 TV 브라우저의 자동재생 · 전체화면 제약은 미확인이며, 실제 TV 장시간 점검은 [영상 재생 TODO](../work-orders/TODO-O4O-STORE-VIDEO-PLAYBACK-COMPLETION-V1.md) 에서 현장 대상으로 정해져 있다. 재생 주소를 열면 시작 화면에서 재생 버튼을 눌러야 하므로, 전원을 켠 뒤 입력 없이 시작하는 동작은 이 화면만으로는 되지 않는다. 이를 추가할지는 제품 결정이라 코드를 바꾸지 않았다. Vimeo 재생은 공개 영상 1건 기준이며, 쓰기를 막아 동영상 등록 · 재생목록 저장 · 게시의 운영 왕복도 실행하지 않았다.
3. **다른 소비처의 행 동작 미확인.** `commerce/local-products` 와 `commerce/order-worktable` 은 모의 응답 형식이 맞지 않아 오류 상태만 확인했다. web-neture · admin 전환 화면은 빈 목록 모의라 행 체크 · ActionBar 를 브라우저로 실행하지 않았고 단위 테스트 근거다.
4. **내 자료함은 첫 화면에 목록이 보이지 않는다.** 상단 오른쪽 버튼은 맞췄지만 탭 · 안내 · 필터가 여러 단이다. 탐색 구조 개편이라 후속 WO 후보로 남긴다.
5. **셸 AI 입력.** `StoreAiAssistant` 한 줄 입력은 `StoreWorkspaceShell` 기본 위치라 유지했고 정본에 예외로 기록했다. mobile 390 에서는 셸 영역 때문에 첫 행이 화면 아래쪽(y≈797)에 온다.
6. **`ListWorkspace` 직접 채택.** 사이니지 외 화면은 배치만 계약에 맞췄다. 컴포넌트 채택은 후속 WO 후보다.
7. **첫 화면에 표가 보이지 않는 전환 화면.** 상품 후보 검토(통계 · 설명 · 필터 · 선택 안내), 서비스 관리자, 조합원 관리는 표가 첫 화면 아래에 있다. 순서는 계약에 맞지만 "기존 목록 먼저" 의 체감은 약하다. 위 내 자료함과 묶어 후속 WO 후보로 남긴다.
8. **(해결) 조합원 관리 `undefined 요청` 버튼(기존 결함).** `Management.tsx` 의 라벨 계산이 `request_changes` 에서 `request_` 를 잘라 없는 키를 찾았다. 라벨 사전에 있는 값을 먼저 쓰도록 고쳤다. 심사 대기 조합원 선택 시 버튼은 `검토 기록 · 보완 요청 · 가입 승인 요청 · 가입 거절 요청` 이다(모의 API 브라우저 PC · mobile, 회귀 assertion 추가, web-pharmacy-coop 11파일 89 PASS).
9. **포럼 삭제 요청 콘솔은 일반 경로로 열리지 않는 것으로 보인다.** 코드 기준으로 neture 호스트에서는 `HostBoundary` 가 community 호스트로 보내고, community 호스트에서는 게시판 화면으로 redirect 한다. 운영 동작은 확인하지 못했다. 처분은 별도 WO 판단 대상이다.
10. **사이니지 탭 사이 표 시작 높이 차이(기존 셸 동작, 결함 아님).** `StoreWorkspaceShell` 은 영역 첫 화면이 아닌 곳에만 `{영역} 전체` · `다른 업무 열기` 줄을 그린다. `signage/videos` 가 영역 첫 화면이라 이 줄이 없고 `signage/playlist` 에는 있다. 모든 매장 업무 영역에 공통인 동작이라 사이니지만 바꾸지 않았다. 통일이 필요하면 공통 셸 변경으로 별도 판단한다. 앞서 기록한 "글자 없는 `h2` 3개" 는 측정 오류로 정정한다. 접힌 `다른 업무 열기` 안의 그룹 제목이며, 접힌 `<details>` 안에서는 `innerText` 만 비고 `textContent` 는 남는 것을 Chrome 에서 재현했다.
