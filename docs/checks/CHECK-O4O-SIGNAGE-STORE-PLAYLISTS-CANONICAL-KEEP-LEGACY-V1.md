# CHECK — 내 매장 사이니지 플레이리스트 현행 유지 + 경계 고정

**WO:** `WO-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-KEEP-LEGACY-V1`
**일자:** 2026-06-17
**범위:** 문서 + 주석 전용 (DB/migration/backend API/schedule/replayer/package/lockfile/Dockerfile 변경 0)
**선행:** [`IR-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-DATA-MODEL-V1`](../investigations/IR-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-DATA-MODEL-V1.md)

---

## 1. 목적

IR 결론(전면 canonical 통합 비권장)을 운영 규칙으로 고정. 향후 작업자가 내 매장 저장을 임의로 canonical `signage_playlists` 로 전환해 목록 불일치·항목 손실·스케줄/재생기 회귀를 만드는 것을 방지.

통합 추진이 아니라 **현행 유지 + 통합 금지선 명문화**가 목표.

---

## 2. 산출물

| 항목 | 경로 |
|---|---|
| **경계 baseline (SSOT)** | [docs/baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md](../baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md) |
| CHECK (본 문서) | docs/checks/CHECK-O4O-SIGNAGE-STORE-PLAYLISTS-CANONICAL-KEEP-LEGACY-V1.md |
| CLAUDE.md 인덱스 | "상세 규칙 문서 목록" 1줄 추가 |
| adapter 주석 보강 (3 store 등록 페이지) | KPA `StorePlaylistCreatePage.tsx` / GP `StorePlaylistCreatePage.tsx` / KCos `StorePlaylistCreatePage.tsx` |

---

## 3. 고정한 표준

> 내 매장 디지털 사이니지 플레이리스트는 현재 canonical `signage_playlists` 로 통합하지 않는다.
> `store_playlists` 계열 = 매장 실행자산(스냅샷/forced) 모델, `signage_playlists` 계열 = 방송 미디어 카탈로그(mediaId) 모델.
> 항목 모델(`snapshot_id` vs `mediaId`)이 다르므로 **reconciliation 없이 dual-write/migration/big-bang 통합 금지.**

운영자/커뮤니티 축은 canonical 계속 사용 — 경계는 **내 매장 축에만** 적용.

---

## 4. 변경 내용

- 신규 baseline 문서로 경계·금지선·근거·선결순서 고정.
- 3개 store 등록 페이지(adapter)에 **주석만 보강**: "canonical POST 로 바꾸지 말 것 + 항목 비호환 + baseline/IR 링크". 로직/동작 변경 없음.
- CLAUDE.md 문서 목록에 baseline 1줄 추가(discoverability).

---

## 5. 변경 없음 확인
- DB / migration / backend API / schedule / replayer: 변경 0
- frontend 로직/route/menu/권한: 변경 0 (주석만)
- package.json / lockfile / Dockerfile: 변경 0
- K-Cosmetics `cosmetics_store_playlists` 스키마: 별도 트랙으로 분리 기록(미접촉)

---

## 6. 검증
- 주석/문서 전용 변경 → 런타임/타입 영향 없음(주석은 컴파일 무관).
- 회귀 위험 0 (additive).

---

## 7. 후속 (선결 순서)
```text
1. (현재) KEEP-LEGACY — 본 WO
2. IR-O4O-SIGNAGE-STORE-ITEMS-MODEL-RECONCILIATION-V1  (통합 추진 시 선결)
3. (필요 시) 헤더 한정 mirror-write / per-org opt-in 부분 전환 WO  (2 완료 후, big-bang 금지)
```
별도: K-Cosmetics `cosmetics_store_playlists` 격리 스키마 정합 독립 트랙.
