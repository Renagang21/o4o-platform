# O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1

> **본문 전체 PH 부분 폐기 우선순위 (2026-10-11 · #427):** [완전 폐기 정책](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md)은 이 문서의 모든 절·표·코드 예시·불변식·후속 계획·최종 판정에 있는 PharmacyHub/PH 전용 유지·확장 계약을 대체한다. 개별 절의 표기는 이를 다시 명시한 것이며 표기가 없는 다른 PH 지시도 현행 운영/구현 의무가 아니다. 다른 서비스·공통 Core/Freeze·인쇄 QR 연결과 법정 보유 판단은 그대로다.


> **유형:** Baseline (경계 고정 / 통합 금지선)
> **WO:** `WO-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-KEEP-LEGACY-V1`
> **선행 조사:** [`IR-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-DATA-MODEL-V1`](../investigations/IR-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-DATA-MODEL-V1.md)
> **일자:** 2026-06-17 · **최종 갱신:** 2026-11-05 (사용자 승인: 매장 시간표 폐기·디스플레이별 직접 선택)
> **상태:** Active — 항목 모델 reconciliation 완료 전까지 유효

---

## 0. 고정 표준 (SSOT)

> 내 매장 디지털 사이니지 플레이리스트는 현재 canonical `signage_playlists` 로 통합하지 않는다.
>
> `store_playlists` 계열은 **매장 실행자산 기반 플레이리스트 저장 모델**이며,
> `signage_playlists` 계열은 **서비스/HQ/방송 미디어 카탈로그 기반 플레이리스트 저장 모델**이다.
>
> 두 모델은 playlist **header** 일부는 유사하지만 **item 모델이 다르다.**
> `store_playlist_items` 는 `o4o_asset_snapshots` 기반 불변 실행자산(스냅샷 + forced 시간창)을 참조하고,
> `signage_playlist_items` 는 `signage_media` 기반 미디어를 직접 참조한다.
>
> 따라서 **항목 모델 reconciliation 없이 dual-write, 단순 migration, big-bang 통합을 금지한다.**

---

## 0-1. 현재 매장 재생 정책 — 2026-11-05 사용자 승인

매장 시간·요일 기반 **재생 일정 기능은 폐기**한다. 작은 매장에서 디스플레이마다 게시된 재생목록 하나를 골라 반복 재생한다.
이 결정은 아래 §3의 재생기/API 변경 금지 중 **매장 시간표 제거와 직접 목록 선택 UX**를 대체한다.
플레이리스트 모델 통합·dual-write·스냅샷/forced 노출 기간 변경 금지는 유지한다.

- 동영상 보관함 → 재생목록 → **디스플레이 재생**.
- 디스플레이의 브라우저에서 **재생 화면 열기** → 새 탭(`/store/marketing/signage/display`) → 게시 목록 선택 → 명시적으로 일반/전체화면 재생 시작.
- 새 탭은 클릭한 기기에서 열린다. 원격 제어/기기 등록 기능은 추가하지 않는다. 매장 로그인·접근 권한은 기존 StoreGate를 유지한다.
- 재생 URL(`/store/marketing/signage/play/:playlistId`)에 선택을 담는다. 각 탭/기기는 독립적이며 전역 선택 저장이나 다른 화면 동기화가 없다. 새로고침하면 같은 목록을 다시 읽고 사용자 시작을 기다린다.
- 재생 주소 복사·재생목록 변경·명시적 목록 다시 적용을 제공한다. 다른 기기에서도 해당 매장 로그인/권한이 필요하다.
- 기본 음소거. 전체화면을 지원하지 않거나 브라우저가 거절하면 일반 화면으로 재생한다. 개별 실패는 다음 자료, 모두 실패하면 재시도를 제공한다.
- 매장 전용 `/api/signage/:serviceKey/schedules*` 및 `/active-content`는 제거한다(auth 이후 404). 이전 schedules 화면과 `_schedule` 재생 주소는 직접 선택 화면으로 안내한다.
- DB 테이블/과거 일정 데이터와 공통 digital-signage-core scheduler/entity는 삭제하지 않는다. Tablet ScreenSet은 별도 경로다.
- 공개 published snapshot reader와 필수 영상 노출 기간을 유지한다. 기존 방송 ID reader도 별도 모델로 유지하고 권한 실패를 다른 reader로 우회하지 않는다.

동영상 등록은 **O4O 영상 등록**(파일 업로드/보관 영상 선택), **외부 영상 연결**(YouTube/Vimeo 개별 URL)로 나눈다.
**제공 영상 가져오기**는 커뮤니티/가입 협업체의 기존 복사 흐름을 유지한다. 두 등록 경로의 영상은 같은 동영상 보관함에 출처와 함께 표시한다.
직접 등록을 기본으로 하고 AI 제목·설명 작성은 선택적 보조다. YouTube 업로드/연결 상태·작업 목록은 해당 업로드 경로를 선택한 경우에 안내한다.

구현·검증과 PR 전달 상태는 [현재 TODO](../work-orders/TODO-O4O-DISPLAY-PLAYBACK-SIMPLIFICATION-V1.md)를 따른다. 이 작업은 PR까지만 진행하며 병합·배포는 별도다.

## 1. 목적

선행 IR 결론을 운영 규칙으로 고정한다. 본 baseline 의 목적은 통합 추진이 **아니다.** 향후 작업자가 "canonical 이 있으니 내 매장 저장도 거기로 바꾸자"는 변경을 임의로 일으켜 **목록 불일치 / 항목 의미 손실 / 스케줄·재생기 회귀**를 만드는 것을 방지하는 데 있다.

---

## 2. 역할 경계

| 모델 | 저장소 | 의미 | 항목 참조 | 사용 surface |
|---|---|---|---|---|
| **매장 실행자산** | `store_playlists` / `store_playlist_items` (KPA 공유) | 매장이 실행하는 불변 자산 묶음 | `snapshot_id` → `o4o_asset_snapshots` (불변 스냅샷, forced 시간창) | 내 매장 (KPA) |
| **매장 실행자산 (격리)** | `cosmetics_store_playlists` / items (cosmetics 스키마) | 동일 성격, K-Cosmetics 격리 스키마 | cosmetics 스키마 내부 | 내 매장 (KCos) |
| **방송 미디어 카탈로그** | `signage_playlists` / `signage_playlist_items` (canonical) | 서비스/HQ/커뮤니티 방송 카탈로그 | `mediaId` → `signage_media` (직접 참조) | 운영자(HQ) · 커뮤니티 |

→ 운영자/커뮤니티 축은 canonical(`signage_playlists`)을 **계속 사용**한다. 본 경계는 **내 매장 축**에만 적용된다.

---

## 3. 허용 / 금지

### 허용
- 내 매장 등록은 공통 `SignagePlaylistCreateShell`(store 모드) 사용. **저장은 surface별 adapter 가 현행 store endpoint** (`/{service}/store-playlists`, KCos 는 `/cosmetics/store-playlists`) 호출.
- 헤더/항목 표시·정렬·HUB 스냅샷 복사 등 현행 흐름 유지.
- 문서·주석 보강.

### 금지 (항목 모델 reconciliation 완료 전)

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.

- 내 매장 저장을 canonical `POST /api/signage/:serviceKey/playlists` 로 전환
- `store_playlists` → `signage_playlists` migration / dual-write / mirror-write
- schedule `storePlaylistId` → `playlistId` 재배선
- 재생기(player) / API contract 변경 — 대상은 **현행 매장 재생 경로**다: 각 web 앱의 `SignagePlayerSelectPage` · `SignagePlaybackPage`(KPA · KCos · PharmacyHub · store-web), 공개 재생 `PublicSignagePage` 와 그 API(`/store-playlists/public/:id` · `/api/signage/:serviceKey/active-content`)
- K-Cosmetics `cosmetics_store_playlists` 스키마 통합

> **현행화 (2026-10-05)** — 별도 앱 `services/signage-player-web` 은 은퇴했다(배포 PR #306 · 소스 PR #311, [CHECK](../checks/CHECK-O4O-RETIRED-WEB-RESIDUAL-CLEANUP-V1.md)).
> 위 "재생기" 금지선에 더는 포함되지 않으며, 그 은퇴는 이 경계가 막는 통합 작업이 아니다.
> 매장 태블릿 영상 재생의 canonical 경로는 Tablet ScreenSet 이다([`O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1`](O4O-SIGNAGE-CANONICAL-PLAYBACK-PATH-V1.md)) — 이 문서의 플레이리스트 저장 경계와는 별개 축이다.

---

## 4. 근거 (IR 요약)

- **항목 비호환이 핵심:** `snapshot_id`(불변 실행자산) ≠ `mediaId`(미디어 직접참조). 컬럼 매핑으로 해결 불가.
- 강행 시 사용자 체감 위험: 플레이리스트는 보이나 재생 항목 불일치 / 스케줄 연결됐으나 콘텐츠 상이 / forced 시간창 소실 / 스냅샷 독립성·HUB 복사 후 원본 독립 원칙 붕괴.
- 스케줄은 이미 `playlistId` + `storePlaylistId` dual-reference, 재생기는 transport-agnostic → ID 전환 리스크는 "스케줄 재배선 + 라우트 id 병행"에 국한되나, **항목 모델 선결이 없으면 전환 자체가 무의미·위험**.

---

## 5. 통합을 추진하려면 (선결 순서)

```text
1. (현재) WO-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-KEEP-LEGACY-V1  ← 현행 유지 + 경계 고정 (본 문서)
2. IR-O4O-SIGNAGE-STORE-ITEMS-MODEL-RECONCILIATION-V1               ← snapshot 실행자산 ↔ signage_media 카탈로그 통합 가능성 조사 (선결)
3. (필요 시) 헤더 한정 mirror-write / per-org opt-in 부분 전환 WO   ← 2 완료 후에만, big-bang 금지
```

mirror-write 는 항목 reconciliation 이후에도 정말 필요한지 재판단한다.

---

## 6. 관련 문서
- IR: [`IR-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-DATA-MODEL-V1`](../investigations/IR-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-DATA-MODEL-V1.md)
- 선행 표준화 WO: [`CHECK-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1`](../checks/CHECK-O4O-SIGNAGE-PLAYLIST-CREATE-STANDARD-ALL-SURFACES-V1.md)
- 공통 Shell: `packages/shared-space-ui/src/signage/SignagePlaylistCreateShell.tsx`
