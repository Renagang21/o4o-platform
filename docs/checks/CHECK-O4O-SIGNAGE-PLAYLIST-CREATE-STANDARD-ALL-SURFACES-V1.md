# CHECK — O4O 디지털 사이니지 플레이리스트 등록 표준화 (전 surface)

**WO:** `WO-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1`
**일자:** 2026-06-17
**범위:** Frontend 전용 (백엔드/DB/package/lockfile/Dockerfile 변경 0)

---

## 1. 결정 (조사 후 사용자 확정)

조사 결과 WO 원안 전제 3가지가 실제 코드와 어긋나, 다음으로 재정렬 후 진행.

| 결정 | 내용 |
|------|------|
| 백엔드 기준 | **Canonical 채택** — 단, surface별 저장 endpoint 는 "그 목록이 읽는 바로 그 엔드포인트"에 맞춤 (데이터 정합성). 진짜 API canonical 통합은 후속 백엔드 IR. |
| 커뮤니티 축 | **KPA만** 표준화. GP/KCos 커뮤니티는 HUB 소비 surface 로 유지(생성 추가 안 함 — Drift 방지). |
| 등록 진입 | **/new route 로 통일** — 모달/인라인 폼 → 별도 `/new` 페이지 + 공통 Shell. |
| 내 매장 저장 | **현행 endpoint 유지** — `signage_playlists`(canonical) ≠ `store_playlists`(매장) 테이블 상이. canonical 전환은 백엔드 마이그레이션 필요 → WO §9 위반이므로 분리. |

### 결정적 발견 — 내 매장 데이터 정합성

| | 테이블 | 스코핑 |
|---|---|---|
| canonical `POST /api/signage/:serviceKey/playlists` | `signage_playlists` | serviceKey + organizationId |
| 현행 내 매장 `/{service}/store-playlists` (3사) | `store_playlists` | organizationId only |

→ 내 매장 목록은 3사 모두 `store_playlists` 를 읽음. 저장만 canonical 로 바꾸면 "만들었는데 목록에 안 보임". 따라서 내 매장 adapter 는 현행 `store-playlists` endpoint 유지.

→ 운영자 축은 3사 모두 이미 canonical `/api/signage/:serviceKey/hq/playlists` (`signage_playlists`) 사용 → 정합.

---

## 2. 공통 Shell

- **경로:** `packages/shared-space-ui/src/signage/SignagePlaylistCreateShell.tsx`
- **export:** `packages/shared-space-ui/src/index.ts` (`SignagePlaylistCreateShell` + types)
- **패턴:** `CommunityContentWriteShell` 동일 — 순수 presentational, API/router/toast 미 import. 저장은 `onSubmit(values, { setProgress })` 주입. 검증/진행/인라인 에러는 shell 소유.
- **위치 선정:** `@o4o/shared-space-ui` 는 3사 모두 이미 의존(package.json + Dockerfile 반영) → 신규 패키지 불필요, 배포 안전(`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` 회피).
- **config (surface별 차이 흡수):** `surface`(community/operator/store), `showDescription`, `showTags`, `requireTags`, `showItems`, `requireItems`, `showPlaybackOptions`, `perItemDuration`, `tagSuggestions`, 라벨.
- **정규화 값:** `{ name, description, tags, loopEnabled, defaultItemDuration, transitionType, items[{url,title,durationSeconds}] }`.

---

## 3. surface별 적용

### 3.1 공통 type / Shell
- `packages/shared-space-ui/src/signage/SignagePlaylistCreateShell.tsx` (신규)
- `packages/shared-space-ui/src/index.ts` (export 추가)

### 3.2 커뮤니티 (KPA만)
- `services/web-kpa-society/src/pages/signage/PlaylistEditorPage.tsx` — Shell 전환(create+edit 유지). 저장 endpoint `/api/v1/kpa/signage/playlists` 현행 유지(목록 조회와 동일 family). config: community, requireTags=false, 항목별 재생시간.

### 3.3 운영자 (3사) — canonical `hq/*` 다단계 (URL→media→playlist→items/bulk)
| 서비스 | 신규 등록 페이지 | 목록 페이지 전환 | 라우트 |
|---|---|---|---|
| KPA | `pages/operator/signage/HqPlaylistCreatePage.tsx` | `HqPlaylistsPage.tsx` (모달 제거, 버튼→/new) | `OperatorRoutes.tsx` `signage/hq-playlists/new` |
| GP | `pages/operator/signage/HqPlaylistCreatePage.tsx` | `HqPlaylistsPage.tsx` (인라인폼 제거, 버튼 2곳→/new) | `App.tsx` `signage/hq-playlists/new` |
| KCos | `pages/operator/signage/HqPlaylistCreatePage.tsx` | `HqPlaylistsPage.tsx` (인라인폼 제거, 버튼→/new) | `App.tsx` `signage/hq-playlists/new` |

GP/KCos 운영자 등록은 기존 단건(메타데이터만) → KPA 기준 다단계(URL 항목 포함)로 정렬.

### 3.4 내 매장 (3사) — 현행 `store-playlists` endpoint 유지 (store 모드, 항목 없음)
| 서비스 | 신규 등록 페이지 | 목록 페이지 전환 | 라우트 |
|---|---|---|---|
| KPA | `pages/pharmacy/StorePlaylistCreatePage.tsx` | `pages/pharmacy/StoreSignagePage.tsx` (모달 제거, 버튼→/new) | `App.tsx` `marketing/signage/playlist/new` |
| GP | `pages/store-management/signage/StorePlaylistCreatePage.tsx` | `StoreSignageMainPage.tsx` (인라인폼 제거, 버튼→/new) | `App.tsx` |
| KCos | `pages/store/StorePlaylistCreatePage.tsx` | `StoreSignagePage.tsx` (인라인폼 제거, 버튼→/new) | `App.tsx` |

KPA store-playlists 는 description/tags 수용 → store 모드 기본(표시). GP/KCos store-playlists 는 name 만 수용 → `showTags=false, showDescription=false`.

생성 후 항목(미디어)은 기존 HUB 복사 흐름(목록/상세)에서 추가 — 변경 없음.

---

## 4. 검증

### tsc (정적)
| 서비스 | 패턴 | 명령 | 결과 |
|---|---|---|---|
| @o4o/shared-space-ui | — | `tsc --noEmit -p tsconfig.json` | PASS |
| web-kpa-society | direct include | `tsc --noEmit` | PASS (EXIT 0) |
| web-glycopharm | project refs | `tsc -b --noEmit` | PASS (EXIT 0) |
| web-k-cosmetics | direct include | `tsc --noEmit` | PASS (EXIT 0) |

`noUnusedLocals`/`noUnusedParameters` strict → 모달/인라인 폼 제거 시 잔여 state/handler/import 없음 확인됨(tsc 통과).

### 브라우저 smoke (2026-06-17, 배포 후 — 리비전 13:56Z)
Playwright headless, 프로덕션 도메인(kpa-society.co.kr / glycopharm.co.kr / k-cosmetics.site). operator=sohae2100, store=renagang21 (자격증명 SSOT 직접 read, 미노출).

| 서비스 | community `/signage/playlist/new` | operator `/operator/signage/hq-playlists/new` | store `/store/marketing/signage/playlist/new` |
|---|---|---|---|
| KPA | ✅ PASS (Shell) | ✅ PASS | ✅ PASS |
| GlycoPharm | ⛔ 404 = 의도(소비 surface, /new 미추가) | ✅ PASS | ✅ PASS |
| K-Cosmetics | ⛔ 404 = 의도(소비 surface, /new 미추가) | ✅ PASS | ✅ PASS |

- 전 PASS: route 해결(redirect 0) · Shell 마운트(제목 input + 저장/생성 버튼) · **console error 0 · 관련 4xx/5xx 0**.
- surface 구성 정확: operator=재생옵션+태그필수, store=KPA(설명/태그 노출)·GP/KCos(name-only).
- **저장 round-trip**: KPA 내 매장 1건 통제 수행(GP/KCos 미확대, 프로덕션 데이터 최소화).

#### KPA 내 매장 store-playlist round-trip (KEEP-LEGACY 핵심 검증)
| 항목 | 결과 |
|---|---|
| 생성 데이터명 | `[SMOKE] keep-legacy <ts>` |
| 생성 성공 | ✅ 201 `POST https://api.neture.co.kr/api/v1/kpa/store-playlists` |
| 목록 반영 | ✅ YES — 생성 직후 내 매장 목록(`/store/marketing/signage/playlist`) 렌더에 표시 |
| 삭제/정리 | ✅ DELETE 200, 잔존 `[SMOKE]` 0 (앱 토큰 인증으로 정리 완료) |
| console / 4xx·5xx | 생성·목록 경로 정상(201/200). store 화면의 403 다수 = pharmacy 계정이 operator signage 엔드포인트(`/api/signage/kpa-society/{playlists,media,schedules}`) 호출 시 발생 — **pre-existing 권한 경계, 이번 변경 무관** |

→ **KEEP-LEGACY 핵심 주장 라이브 확인**: 내 매장 저장이 `store_playlists` 로 가서 내 매장 목록에 반영됨(canonical 오저장 아님). GP/KCos store 는 동일 패턴(현행 미변경 endpoint)이라 KPA 1건으로 대표 검증.

**배포 주의(재발 방지):** `deploy-web-services.yml` 의 detect-changes 가 `git diff HEAD~1 HEAD`(HEAD 단일 커밋)만 봄. 코드 커밋 뒤 docs-only 커밋이 HEAD 가 되면 web 배포가 전부 skip 됨(이번에 발생). → `gh workflow run deploy-web-services.yml --ref main -f service=all` 수동 트리거로 해결(run 27694104841).

---

## 5. 변경 없음 확인
- 백엔드 라우트/컨트롤러/엔티티: 변경 0
- DB / migration: 변경 0
- package.json / lockfile / Dockerfile: 변경 0
- 권한 guard: 변경 0
- GP/KCos 커뮤니티 사이니지: 무수정
- 공통 Shell 은 기존 의존 패키지(@o4o/shared-space-ui) 내 신규 파일 — Dockerfile 영향 없음

---

## 6. 남은 이슈 / 후속
- **브라우저 smoke** (3 서비스 × 운영자/내매장, KPA 커뮤니티) — 배포 후.
- **백엔드 canonical 통합 IR** — `store_playlists` → `signage_playlists` 정합(미러 write / dual-read / migration) 은 별도 IR/WO 로 분리(이번 WO §9 범위 외). 제안 문서명: `IR-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-DATA-MODEL-V1` (조사 대상: 두 테이블 필드 차이 / store-playlists API 사용처 / 목록·상세·복사·미디어추가 흐름 / organizationId·serviceKey 스코핑 차이 / dual-read·mirror-write 가능성 / migration·데이터 보존 정책).
- GP/KCos 운영자 등록이 단건→다단계로 바뀌며 "URL 최소 1개 필수"가 됨(KPA 정합). 의도된 정렬.

---

## 7. 범위 경계 (명시)

본 WO 의 표준화 범위는 **등록 UI Shell · `/new` route · surface별 adapter 정렬**까지이며, **저장 데이터 모델 통합은 명시적으로 제외**한다. 특히 내 매장 축은 목록 정합성을 위해 현행 `store_playlists` endpoint 를 유지한다.

**상태:** CODE PASS / 배포 후 browser smoke 대기
**후속:** `store_playlists` → `signage_playlists` canonical 통합 IR 분리
