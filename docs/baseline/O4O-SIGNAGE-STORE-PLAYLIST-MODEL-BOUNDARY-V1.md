# O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1

> **유형:** Baseline (경계 고정 / 통합 금지선)
> **WO:** `WO-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-KEEP-LEGACY-V1`
> **선행 조사:** [`IR-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-DATA-MODEL-V1`](../investigations/IR-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-DATA-MODEL-V1.md)
> **일자:** 2026-06-17
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

## 1. 목적

선행 IR 결론을 운영 규칙으로 고정한다. 본 baseline 의 목적은 통합 추진이 **아니다.** 향후 작업자가 "canonical 이 있으니 내 매장 저장도 거기로 바꾸자"는 변경을 임의로 일으켜 **목록 불일치 / 항목 의미 손실 / 스케줄·재생기 회귀**를 만드는 것을 방지하는 데 있다.

---

## 2. 역할 경계

| 모델 | 저장소 | 의미 | 항목 참조 | 사용 surface |
|---|---|---|---|---|
| **매장 실행자산** | `store_playlists` / `store_playlist_items` (KPA·GlycoPharm 공유) | 매장이 실행하는 불변 자산 묶음 | `snapshot_id` → `o4o_asset_snapshots` (불변 스냅샷, forced 시간창) | 내 매장 (KPA·GP) |
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
- 내 매장 저장을 canonical `POST /api/signage/:serviceKey/playlists` 로 전환
- `store_playlists` → `signage_playlists` migration / dual-write / mirror-write
- schedule `storePlaylistId` → `playlistId` 재배선
- 재생기(player) / API contract 변경
- K-Cosmetics `cosmetics_store_playlists` 스키마 통합

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
