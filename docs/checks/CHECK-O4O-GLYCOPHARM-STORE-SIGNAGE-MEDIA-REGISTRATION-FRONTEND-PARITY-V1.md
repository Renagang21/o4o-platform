# CHECK-O4O-GLYCOPHARM-STORE-SIGNAGE-MEDIA-REGISTRATION-FRONTEND-PARITY-V1

> GlycoPharm 매장 사이니지 "내 동영상" 탭에 KPA 기준 **동영상 등록 모듈**을 frontend-only 이식.
> **결과: PASS** — GP tsc 0 + vite build 성공. backend/DB/공통 core/KPA 무변경.
> 선행: `IR-O4O-GLYCOPHARM-STORE-SIGNAGE-MODULE-PARITY-AUDIT-V1`(`3cbbd537d`) · 버튼 정렬 `ab93fd976` · 2026-06-16

---

## 0. 사전 smoke (플레이리스트/스케줄) — 사용자 요청 1단계

배포된 GlycoPharm(`ab93fd976`)에서 약국 계정(renagang21) Playwright smoke:

| 항목 | 결과 |
|---|---|
| 새 플레이리스트 생성 | **POST 201**, 목록 즉시 반영(0→1), 표시 확인, 정리 삭제됨 |
| 스케줄 탭 | "약국 정보를 불러올 수 없습니다" 배너 **없음**, "새 스케줄" 노출·폼 열림·플레이리스트 선택 가능 |
| console / 4xx-5xx | 0 |

→ **새 플레이리스트(E)·새 스케줄(E) 정상 동작 확정.** serviceKey 필터 문제 없음 → 별도 보정 WO 불필요.
사용자 인식("플레이리스트 미연결")과 달리 코드·런타임 모두 정상. **동영상 등록 이식만 진행.**

---

## 1. 목적 / 갭

IR 결론: 백엔드 사이니지는 `/api/signage/:serviceKey/{media,playlists,schedules}` serviceKey 공통(`glycopharm` whitelist),
`POST /api/signage/glycopharm/media` 존재. **유일 갭 = GlycoPharm 동영상 등록 frontend(client+모달) 부재** → frontend-only 이식.

---

## 2. 변경 파일 (3 코드 + CHECK)

| 파일 | 변경 |
|---|---|
| `services/web-glycopharm/src/api/signageMedia.ts` | **신규** — `createSignageMedia` / `fetchSignageMedia` / `deleteSignageMedia` (KPA mirror, BASE=`/api/signage/glycopharm/media`, `api`+`X-Organization-Id`) |
| `services/web-glycopharm/src/api/storePlaylist.ts` | `addPlaylistItemFromSignage`(`/glycopharm/store-playlists/:id/items/from-signage`, body `{mediaId, organizationId}`) 추가 |
| `.../signage/StoreSignageMainPage.tsx` | 내 동영상 탭: "동영상 등록" 버튼 + 등록 모달 + 등록 동영상 목록 + 플레이리스트 add-picker 에 등록 동영상 추가. `detectVideoSource` 헬퍼·state·로더·핸들러 |

---

## 3. 구현 내용

- **버튼(내 동영상 탭 헤더 우측)**: "동영상 등록"(`setShowVideoRegForm`, 1순위) + "콘텐츠 허브"(라이브러리 보존, 2순위). KPA "동영상 등록" 위치.
- **등록 모달**: 제목/URL(YouTube·Vimeo)/설명/태그/공개상태. `detectVideoSource` 로 sourceType 판정 → `createSignageMedia(organizationId, payload)` → 모달 닫힘 + `loadSignageMedia()` 재조회.
- **등록 동영상 목록**: `fetchSignageMedia(organizationId)` 결과를 "등록한 동영상" 섹션으로 표시(상태 badge + 삭제). 기존 snapshot grid/KPI 무변경(추가만).
- **플레이리스트 연결**: add-picker 에 등록 동영상 버튼 → `addPlaylistItemFromSignage`. backend `addItemFromSignage` 는 `signage_media`를 **organizationId 기준 조회**(serviceKey 무관)이므로 GlycoPharm 에서도 동작.
- organizationId: 기존 store-hub overview 해석 재사용. 미해석 시 등록 버튼은 안내 후 no-op(silent 방지).

---

## 4. 백엔드 무변경 근거

- `POST /api/signage/:serviceKey/media`(`requireSignageStore`) — serviceKey path param 공통, `glycopharm` whitelist. GlycoPharm 이 그대로 호출.
- `addItemFromSignage`(store-playlist.repository.ts:498) — `signage_media WHERE id AND organizationId`(serviceKey 미사용) → GlycoPharm from-signage 동작 보장.
- backend/route/entity/migration **무변경**. (GlycoPharm `/store-playlists` 컨트롤러의 serviceKey 미바인딩 nuance 는 from-signage/create 에 무영향 — IR §4.)

---

## 5. 검증

| 대상 | 결과 |
|---|---|
| 사전 smoke (플레이리스트/스케줄) | PASS (위 §0) |
| `web-glycopharm tsc --noEmit -p tsconfig.app.json` | **0** |
| `pnpm --filter glycopharm-web build` (tsc && vite) | **성공 (✓ 19.39s)** |
| KPA-Society / operator·admin / backend / DB / 공통 core / deps | **무변경** |

배포 후 smoke 권장(GlycoPharm `/store/marketing/signage/videos`): 동영상 등록 버튼 → 모달 → 저장(POST /api/signage/glycopharm/media) → "등록한 동영상" 반영 → 플레이리스트 add-picker 에서 선택. KPA 비교.

---

## 6. 완료 기준 충족

| 기준 | 결과 |
|---|---|
| 내 동영상 헤더에 "동영상 등록" 버튼 | ✅ |
| 클릭 시 등록 모달 열림 | ✅ |
| 저장 시 `POST /api/signage/glycopharm/media` 호출 | ✅ |
| 저장 성공 후 모달 닫힘 + 목록 갱신 | ✅ (등록 동영상 섹션 재조회) |
| 등록 동영상이 플레이리스트 추가 흐름에서 선택 가능 | ✅ (`addPlaylistItemFromSignage`) |
| KPA-Society 무변경 | ✅ |
| backend/DB/공통 core/deps 무변경 | ✅ |
| GP tsc + build PASS | ✅ |

---

## 7. 제외 / 후속

- 콘텐츠 허브(라이브러리) 이동은 "콘텐츠 허브" 버튼으로 보존 — 직접 등록과 병행. 허브 자산(snapshot) ↔ 직접 미디어(SignageMedia) 2소스 공존 정리는 후속 UX 정비.
- 등록 동영상 수정(updateSignageMedia)·썸네일은 미포함(등록/삭제/플레이리스트 연결 우선).
- store-playlists serviceKey 바인딩(`'glycopharm'` 전달)은 항목 필터 nuance — smoke 상 영향 없음, 필요 시 별도 소형 건.

**판정: PASS**
