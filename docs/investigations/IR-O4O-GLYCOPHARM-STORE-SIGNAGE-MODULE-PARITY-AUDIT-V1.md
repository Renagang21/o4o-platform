# IR-O4O-GLYCOPHARM-STORE-SIGNAGE-MODULE-PARITY-AUDIT-V1

> **성격: read-only 조사 IR** (코드/백엔드/migration 변경 없음 — 문서 1개만 commit).
> 목적: GlycoPharm 매장 사이니지에 KPA 실제 기능 모듈(동영상 등록 / 새 플레이리스트 / 새 스케줄)을 붙이기 전,
> KPA 구현체를 조사하여 "무엇을 어떻게 이식·공유·재사용할지" 확정.
> 선행: `WO-O4O-GLYCOPHARM-STORE-SIGNAGE-SCHEDULE-KPA-PARITY-FIX-V1`(`ab93fd976`, 버튼 위치만 정렬) · 2026-06-16

---

## 1. 핵심 결론 (TL;DR)

| 기능 | GlycoPharm 현재 | 갭 분류 | 필요한 작업 |
|---|---|---|---|
| **새 스케줄** | ✅ 동작(org 해석 시) | **E** (완성) | 없음 — org-context robustness만 선택적 |
| **새 플레이리스트** | ✅ 동작 (생성/항목/순서/삭제 wired) | **E** (완성) | 없음 — store-playlists serviceKey 미전달 nuance만 확인 |
| **동영상 등록** | ❌ 직접 등록 모달·client 부재(콘텐츠 추가=라이브러리 이동만) | **C** (백엔드 있음, 프론트 누락) | **frontend-only** — KPA `signageMedia.ts` client + 등록 모달 이식 |

> **백엔드는 이미 100% 공통(serviceKey 기반).** `/api/signage/:serviceKey/{media,playlists,schedules}` 가 `glycopharm` whitelist
> 포함 — GlycoPharm 은 추가 backend 없이 호출 가능. 따라서 유일한 실질 갭(**동영상 등록**)은 **프론트 client+모달 이식**으로 끝난다.
>
> **권장: 후보 A(frontend-only service-local 이식).** 동영상 등록만 KPA 모듈을 GlycoPharm 에 이식. 플레이리스트/스케줄은 무변경.

---

## 2. KPA 기준 모듈 매트릭스 (store-facing)

기준 파일: `services/web-kpa-society/src/pages/pharmacy/StoreSignagePage.tsx`

| 기능 | 버튼/state | 폼/모달(파일:라인) | API client(파일) | 백엔드 endpoint | 데이터 모델 |
|---|---|---|---|---|---|
| **동영상 등록** | "동영상 등록" / `showVideoRegForm` (329) | 모달 `StoreSignagePage.tsx:1658-1752` (제목/URL/설명/태그/상태) | `createSignageMedia` (`api/signageMedia.ts:83`) | `POST /api/signage/kpa-society/media` | `SignageMediaItem` — **YouTube/Vimeo URL 등록**(파일 업로드 아님) |
| **새 플레이리스트** | "새 플레이리스트" / `showCreateForm` (313) | 모달 `1004-1068` (이름/설명/태그) | `createStorePlaylist` (`api/storePlaylist.ts:56`) | `POST /store-playlists` (StorePlaylist) | `StorePlaylist` |
| **새 스케줄** | "새 스케줄" / `showScheduleForm` (280) | 폼 `1375-1516` | `createSchedule` (`api/signageSchedule.ts:125`) | `POST /api/signage/kpa-society/schedules` | `SignageScheduleItem` |

- organizationId: KPA = `user.kpaMembership.organizationId` (258), 각 signage API 에 `X-Organization-Id` 헤더로 전달.
- 플레이리스트 항목 추가: 스냅샷(`addPlaylistItem`) + 직접 미디어(`addPlaylistItemFromSignage`) + 라이브러리(`addPlaylistItemFromLibrary`).

---

## 3. KPA 운영자/커뮤니티/공통 packages 조사

| 영역 | 모듈 | 동영상등록/플레이리스트 완성도 | 공통화 | GlycoPharm 재사용 |
|---|---|---|---|---|
| store-facing(KPA) | `StoreSignagePage.tsx` (3탭) | ✅ 높음 — store-owner 직접 등록 | service-local(서비스별 copy) | ✅ 직접 이식 대상 |
| operator(KPA) | `pages/operator/signage/HqMediaPage` 등 (HQ 미디어/플레이리스트/템플릿/AI) | ✅ 매우 높음 — **단 HQ(본사) 레벨** 모듈 | serviceKey 공통 API | △ 용도 다름(operator 면) — store-facing 대체 아님 |
| hub/community | GlycoPharm `HubSignageLibraryPage` / KCos `HubSignagePage` | ✅ 높음 — 공개 탐색 + Asset Snapshot Copy | `shared-space-ui` 템플릿 공통 | 이미 GlycoPharm 보유 |
| 공통 packages | `packages/digital-signage-core`(entity/controller), `digital-signage-contract`(types), `@o4o/shared-space-ui`(템플릿) | ✅ entity/API/타입 완전 공통 | ✅ 모든 서비스 동일 core | ✅ backend 이미 공통 |
| **API 계층** | `apps/api-server/src/routes/signage/signage.routes.ts` (`/api/signage/:serviceKey/*`) | ✅ media/playlist/schedule CRUD 전부 | ✅ serviceKey 멀티테넌트 | ✅ `glycopharm` whitelist 포함 |

**판정**: 동영상 등록의 "더 완성된 모듈"은 **operator HQ media**(본사 레벨, 다른 용도)이지 store-facing 대체가 아니다.
**store-facing 동영상 등록의 canonical = KPA `StoreSignagePage` 의 video-reg 모달 + `signageMedia.ts`.** 백엔드는 공통이므로 이식 대상은 **프론트뿐**.

---

## 4. GlycoPharm 갭 분석

| 기능 | 현재 상태 | 빠진 부분 | 분류 | 근거(파일:라인) |
|---|---|---|---|---|
| 동영상 등록 | "내 동영상" 탭 = 허브에서 가져온 자산 read/publish. 헤더 버튼 "콘텐츠 추가"=라이브러리 이동. 직접 등록 모달·client 없음 | ① `showVideoRegForm` 모달 ② `signageMedia.ts` client(`createSignageMedia`) | **C** (백엔드 있음, 프론트 누락) | GlycoPharm `api/signageMedia.ts` **부재**(확인) / KPA 보유 / 백엔드 `POST /api/signage/:serviceKey/media` 존재(`signage.routes.ts:94`) |
| 새 플레이리스트 | UI/폼/`createStorePlaylist`(`/glycopharm/store-playlists`)/항목 관리 모두 wired | 없음 | **E** | `StoreSignageMainPage.tsx:390-398,740-763` / `api/storePlaylist.ts:53-110` |
| 새 스케줄 | UI/폼/`createSchedule`(`/api/signage/glycopharm/schedules`, X-Organization-Id) wired. org=store-hub overview 해석 | org 미해석 시 silent no-op(`!organizationId` early return) | **E*** | `StoreSignageMainPage.tsx:232-248,489-526` / `api/signageSchedule.ts:99-130` |

> ⚠️ 관찰(backend nuance): GlycoPharm `/store-playlists` 컨트롤러가 **serviceKey 인자 없이** 등록됨
> (`glycopharm.routes.ts:398` vs KPA `kpa.routes.ts:398` 은 `'kpa-society'` 전달). 생성은 organizationId 기반이라 동작하나,
> `findPlaylistItems(id, serviceKey)` 항목 필터가 serviceKey 기준이면 영향 가능 → 소형 확인 항목(본 IR 범위 외).

> ⚠️ 사용자 인식 vs 코드: 사용자는 "새 플레이리스트가 제대로 안 붙음"으로 관측했으나 코드상 **완전 wired(E)**.
> 실제 배포 화면에서 생성이 실패한다면 (a) store-playlists serviceKey nuance, (b) org/empty-state 오인 가능 → 구현 WO 전 **브라우저 smoke 1회 권장**.

---

## 5. 구현 후보 (3안)

### 후보 A — KPA store-facing 동영상 등록 모듈을 GlycoPharm 에 service-local 이식 (frontend-only) ★권장
```
범위: GlycoPharm 에 api/signageMedia.ts 신설(KPA mirror, BASE=/api/signage/glycopharm) +
      StoreSignageMainPage '내 동영상' 탭에 showVideoRegForm 모달 + 목록을 SignageMedia 기반으로 보강.
장점: 백엔드 무변경(공통 serviceKey API 이미 존재). KPA UX parity. 회귀 표면 작음(GlycoPharm 1~2파일).
단점: KPA 코드 일부 중복(이미 service-local 패턴). 허브 자산(storeAssetControlApi)과 직접 미디어(SignageMedia) 2소스 공존 정리 필요.
```

### 후보 B — digital-signage-core / shared-space-ui 공통 컴포넌트로 추출 후 적용
```
범위: KPA video-reg 모달 + signageMedia client 를 packages 공통 컴포넌트로 추출 → KPA/GlycoPharm/KCos 공유.
장점: 장기 공통화. 사이니지 축 표준화.
단점: 작업 큼 + KPA 회귀 위험(이미 동작 중인 KPA 면 교체). 본 건(동영상 등록 1개) 대비 과대.
```

### 후보 C — GlycoPharm 허브/라이브러리 모델 유지, 직접 등록 미도입
```
범위: 동영상은 "콘텐츠 추가"(라이브러리/허브 경유)만 유지. 직접 등록 버튼/모달 추가 안 함.
장점: 최소 변경. GlycoPharm 현 IA 충돌 0.
단점: KPA UX 비동일. 사용자 요구("KPA처럼 동영상 등록 버튼이 실제 등록 모듈을 연다") 미충족.
```

---

## 6. 권장안

**후보 A (frontend-only 이식).**

| 구분 | 내용 |
|---|---|
| frontend-only 가능 | **동영상 등록** — GlycoPharm `api/signageMedia.ts`(KPA mirror) + `showVideoRegForm` 모달 + 내 동영상 목록을 SignageMedia 소스로 보강. 백엔드 `/api/signage/glycopharm/media` 이미 존재 |
| backend 작업 필요 | 없음(동영상 등록 기준). store-playlists serviceKey 미전달은 **선택적 1줄 보정**(`'glycopharm'` 전달) — 별도 소형 건 |
| KPA 회귀 위험 | 없음(GlycoPharm service-local 이식, KPA 파일 미수정) |
| GlycoPharm 회귀 위험 | 낮음 — 내 동영상 탭 1곳 + 신규 client 파일. 플레이리스트/스케줄 무변경 |
| 예상 수정 파일 | `services/web-glycopharm/src/api/signageMedia.ts`(신규), `.../signage/StoreSignageMainPage.tsx`(내 동영상 탭) |
| 검증 | GP tsc + 배포 후 smoke(동영상 등록 모달 → 저장 → 목록 반영 / 플레이리스트 생성 / 스케줄 생성), KPA 비교 |

**선행 권장**: 구현 WO 전 GlycoPharm `/store/marketing/signage/{playlist,schedules}` **브라우저 smoke 1회** — 플레이리스트/스케줄이 실제 동작하는지(코드상 E) 확인하여 사용자 인식과 정합.

---

## 7. 완료 기준 — 질문 답변

1. KPA "동영상 등록" 모듈 위치/API: `StoreSignagePage.tsx:1658-1752`(모달) + `api/signageMedia.ts`(`createSignageMedia`) → `POST /api/signage/kpa-society/media`.
2. KPA "새 플레이리스트" 모듈/API: `StoreSignagePage.tsx:1004-1068` + `api/storePlaylist.ts`(`createStorePlaylist`) → `POST /store-playlists`.
3. operator/community 에 더 적합한 공통 모듈? — 백엔드/entity/타입은 `digital-signage-core` 로 **완전 공통**. operator HQ media 는 **본사 레벨(다른 용도)** 이라 store-facing 동영상 등록 대체 아님. store-facing canonical = KPA StoreSignagePage video-reg.
4. GlycoPharm 에 API/client/backend 가 이미 있는가? — **backend: 있음(공통 serviceKey)**. **client: 동영상만 없음**(signageMedia.ts 부재). 플레이리스트/스케줄 client 있음.
5. frontend-only 가능? — **동영상 등록 = frontend-only 가능**(backend 공통). 플레이리스트/스케줄 = 이미 완성.
6. backend 작업 필요? — 동영상 등록엔 **불필요**. (선택) store-playlists serviceKey 1줄 보정.
7. 다음 WO 범위? — 동영상 등록 frontend 이식 1개로 잘라낸다.

---

## 8. 다음 WO 후보명

- **권장(frontend-only)**: `WO-O4O-GLYCOPHARM-STORE-SIGNAGE-MEDIA-REGISTRATION-FRONTEND-PARITY-V1`
  - GlycoPharm `signageMedia.ts`(KPA mirror) + 내 동영상 탭 video-reg 모달 이식. 백엔드 무변경.
- (선택, 별도 소형) `WO-O4O-GLYCOPHARM-STORE-PLAYLIST-SERVICEKEY-BIND-FIX-V1` — `/store-playlists` 컨트롤러에 `'glycopharm'` 전달.
- (보류) 공통화 후보 B `WO-O4O-SHARED-STORE-SIGNAGE-MEDIA-COMMONIZATION-V1` — 사이니지 축 공통화가 별도 목표로 설 때.

---

## 9. 작업 제한 (본 IR)

read-only — 코드/백엔드/migration/dependency/공통 core 변경 없음. 문서 1개만 path-specific commit.
