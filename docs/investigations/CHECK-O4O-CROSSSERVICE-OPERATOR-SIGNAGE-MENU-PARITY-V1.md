# CHECK — WO-O4O-CROSSSERVICE-OPERATOR-SIGNAGE-MENU-PARITY-V1

> GlycoPharm / K-Cosmetics operator **Signage** 하위 메뉴를 동일한 canonical 구조로 정렬.
> Signage 하위에 섞여 있던 Content 성격 메뉴(콘텐츠 허브 / 콘텐츠 라이브러리 / 사이니지 콘텐츠)를 제거.
>
> - 일자: 2026-06-16
> - 범위: 메뉴 정합화 only (backend / API / DB / route / capability 변경 없음)
> - 대상: `web-glycopharm`, `web-k-cosmetics`
> - 제외: KPA, Neture

---

## 1. 변경 전 Signage 메뉴 비교

| # | GlycoPharm (before) | path | K-Cosmetics (before) | path |
|:-:|---|---|---|---|
| 1 | HQ 미디어 | `/operator/signage/hq-media` | **사이니지 콘텐츠** | `/operator/signage/content` |
| 2 | HQ 플레이리스트 | `/operator/signage/hq-playlists` | HQ 미디어 | `/operator/signage/hq-media` |
| 3 | 템플릿 | `/operator/signage/templates` | HQ 플레이리스트 | `/operator/signage/hq-playlists` |
| 4 | **콘텐츠 허브** | `/operator/signage/content` | 템플릿 | `/operator/signage/templates` |
| 5 | **콘텐츠 라이브러리** | `/operator/signage/library` | 강제 콘텐츠 | `/operator/signage/forced-content` |
| 6 | 강제 콘텐츠 | `/operator/signage/forced-content` | — | — |

**굵게** 표시한 항목 = Content 성격 → 제거 대상.

---

## 2. 최종 canonical Signage 메뉴

| # | 라벨 | path |
|:-:|---|---|
| 1 | HQ 미디어 | `/operator/signage/hq-media` |
| 2 | HQ 플레이리스트 | `/operator/signage/hq-playlists` |
| 3 | 템플릿 | `/operator/signage/templates` |
| 4 | 강제 콘텐츠 | `/operator/signage/forced-content` |

두 서비스 모두 **같은 이름·같은 순서·같은 path** 로 정렬됨.

---

## 3. 서비스별 변경 내용

### GlycoPharm — `services/web-glycopharm/src/config/operatorMenuGroups.ts`

- `UNIFIED_MENU.signage` 에서 제거:
  - `콘텐츠 허브` → `/operator/signage/content`
  - `콘텐츠 라이브러리` → `/operator/signage/library`
- 남은 4항목은 이미 canonical 순서 → 순서 변경 없음.
- 레거시(`@deprecated`) `OPERATOR_MENU_ITEMS.signage` 도 동일하게 정합 (서비스 내부 자기참조 외 소비처 없음 — 일관성 목적).

### K-Cosmetics — `services/web-k-cosmetics/src/config/operatorMenuGroups.ts`

- `UNIFIED_MENU.signage` 에서 제거:
  - `사이니지 콘텐츠` → `/operator/signage/content`
- 남은 4항목(HQ 미디어 / HQ 플레이리스트 / 템플릿 / 강제 콘텐츠)은 이미 canonical 순서 → 순서 변경 없음.
- `OPERATOR_MENU_ITEMS = UNIFIED_MENU` (별도 레거시 블록 없음) → 자동 반영.

---

## 4. 제거한 GlycoPharm 메뉴

| 라벨 | path | route 상태 |
|---|---|---|
| 콘텐츠 허브 | `/operator/signage/content` | route 보존 (`ContentHubPage`, App.tsx:853) — orphan-route 허용 |
| 콘텐츠 라이브러리 | `/operator/signage/library` | route 보존 (`ContentLibraryPage`, App.tsx:852) — orphan-route 허용 |

route/page 는 삭제하지 않음 (메뉴에서만 제거). dead link 발생 없음.

---

## 5. K-Cosmetics 정합 결과

| 라벨 | path | route 상태 |
|---|---|---|
| 사이니지 콘텐츠 (제거) | `/operator/signage/content` | route 보존 (`SignageContentHubPage`, App.tsx:697) — orphan-route 허용. `StoreCockpitPage.tsx:492` 내부 링크로 여전히 도달 가능 → 완전 은폐 아님 |

제거 후 GlycoPharm 과 **완전히 동일한 4-항목 구조** 가 됨.

---

## 6. route/page 존재 여부 (canonical 4항목)

| 라벨 | GlycoPharm route | K-Cosmetics route |
|---|---|---|
| HQ 미디어 | ✅ App.tsx:858 `HqMediaPage` | ✅ App.tsx:701 `HqMediaPage` |
| HQ 플레이리스트 | ✅ App.tsx:860 `HqPlaylistsPage` | ✅ App.tsx:703 `HqPlaylistsPage` |
| 템플릿 | ✅ App.tsx:862 `SignageTemplatesPage` | ✅ App.tsx:705 `SignageTemplatesPage` |
| 강제 콘텐츠 | ✅ App.tsx:865 `ForcedContentPage` | ✅ App.tsx:707 `ForcedContentPage` |

canonical 4항목 모두 양 서비스에 route/page 존재 → 신규 추가 불필요.

---

## 7. dead link 없음 확인

- 메뉴에 남긴 4항목 모두 route 존재 (§6) → dead link 0.
- 제거한 항목의 route 는 삭제하지 않고 보존 (orphan-route) → 데드링크 유발 없음.

---

## 8. path / capability / adminOnly 불변 확인

- 남긴 항목의 `path` 변경 없음.
- 이 파일 signage 그룹은 `adminOnly` / capability 필드 미사용 → 변경 대상 없음.
- 신규 capability 신설 없음.

---

## 9. Content 메뉴 미변경 확인

- GlycoPharm `content` 그룹(공지사항/뉴스, Home 편집, 문의 관리) 변경 없음.
- K-Cosmetics `content` 그룹(공지사항/뉴스, 설문조사 관리, 문의 관리) 변경 없음.
- 제거한 Signage 항목과 Content 메뉴 path 충돌 없음 (`/operator/signage/*` vs `/operator/content*` — 별개 네임스페이스).

---

## 10. KPA / Neture 미변경 확인

- `web-kpa-society`, `web-neture` 의 menu config 미변경.
- 본 작업 git diff 는 GlycoPharm / K-Cosmetics 2개 config 파일만 포함.

---

## 11. TypeScript 결과

- **web-glycopharm** (`tsc -b --noEmit`): 변경 파일(`operatorMenuGroups.ts`) 관련 신규 에러 0.
  - 출력된 에러는 모두 미빌드 workspace package 모듈 해석 실패(`@o4o/types`, `@o4o/ui`, `@o4o/lms-ui` 등) — 격리 type-check 의 기존 baseline 상태이며 본 변경과 무관.
- **web-k-cosmetics** (`tsc --noEmit`): 동일 — 변경 파일 관련 신규 에러 0, 출력 에러는 모두 동일한 기존 baseline 모듈 해석 실패.

→ 본 메뉴-데이터 제거는 import / type surface 무변경이므로 신규 타입 영향 없음.

---

## 12. build 결과

- 미실행 (보류). 사유: full vite build 는 monorepo 전체 `@o4o/*` 패키지 선행 빌드 필요(격리 환경 기준 미빌드 baseline). 본 변경은 **메뉴 배열 원소 제거 only** — import 추가/제거·타입 변경 없음 → 빌드 영향 0 으로 판단.
- 실제 빌드 검증은 main 머지 후 Cloud Run deploy 파이프라인에서 수행됨.

---

## 13. smoke 결과

- 코드-레벨 검증으로 대체(브라우저 smoke 보류). 배포 후 권장 smoke:
  - GlycoPharm `/operator` → Signage 펼침 → 4항목(HQ 미디어/HQ 플레이리스트/템플릿/강제 콘텐츠)만 표시, 콘텐츠 허브/라이브러리 비표시.
  - K-Cosmetics `/operator` → Signage 펼침 → 동일 4항목, 사이니지 콘텐츠 비표시.

---

## 14. 남은 차이와 사유

- GlycoPharm `signage/content`·`signage/library`, K-Cos `signage/content` route 는 보존되어 orphan-route 로 남음. 의도된 보존(기능 삭제 아님, 메뉴 정합만). route 정리는 별도 WO 범위.
- K-Cos `사이니지 콘텐츠` 페이지는 `StoreCockpitPage` 링크로 도달 가능 → 메뉴 제거가 기능 은폐로 이어지지 않음.

---

## 15. 완료 판정

- ✅ GlycoPharm Signage 에서 콘텐츠 허브 / 콘텐츠 라이브러리 제거
- ✅ K-Cosmetics Signage canonical 4-항목 정합 (사이니지 콘텐츠 제거)
- ✅ 두 서비스 동일 이름·순서·path
- ✅ dead link 0 / path·capability·adminOnly 불변 / Content·KPA·Neture 미변경
- ✅ 변경 파일 type-check 신규 에러 0

**완료 고정 가능.**
