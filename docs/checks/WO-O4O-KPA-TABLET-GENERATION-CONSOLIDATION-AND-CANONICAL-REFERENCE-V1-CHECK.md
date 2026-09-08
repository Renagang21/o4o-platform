# CHECK — WO-O4O-KPA-TABLET-GENERATION-CONSOLIDATION-AND-CANONICAL-REFERENCE-V1

**작업일**: 2026-09-08
**선행**: `IR-O4O-STORE-CONTENT-TABLET-QR-CURRENT-STATE-AND-LEGACY-CENSUS-V1` §7 「작업 1 — Tablet 세대 정리」
**정본**: `docs/baseline/O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1.md` §2 · §4
**결과**: DONE (중지 조건 3건 발동 → 아래 §9 에 보고, 구현하지 않음)

---

## 0. 이번 회차의 성격

화면을 동작시키는 작업이 아니라 **여러 세대가 겹친 구현을 하나의 계약으로 수렴**시키는 작업이다.
따라서 모든 판정을 추정이 아니라 **프로덕션 실측**으로 세웠다 (2026-09-08, Cloud SQL Auth Proxy read-only).

---

## 1. 최신 main 재검증 (순서 1)

`main == origin/main == cf9c9390a`. 작업 시작 시 트리 clean.

---

## 2. `product_content` 실제 row / consumer census (순서 2)

### 2-1. DB 실측 — **0행**

`store_tablet_screen_blocks` 전수 (199 블록 / 46 세트):

| block_type | blocks | sets | visible |
|---|---:|---:|---:|
| corner_description | 46 | 46 | 46 |
| qr_guide | 42 | 42 | 42 |
| content_list | 41 | 41 | 41 |
| idle_media | 38 | 38 | 38 |
| product_list | 32 | 32 | 29 |
| **product_content** | **0** | **0** | **0** |

`product_content` 를 가진 screen_set 도 **0개**.

### 2-2. 코드 consumer 13곳 — 전부 "만들지도, 그리지도 않음"

- `AUTO_BLOCK_TYPES` 5종에 미포함 → 편집기가 생성하지 않는다.
- `@o4o/tablet-screen-set-editor`(1639L) 에 처리 코드 0.
- 공개 resolver 는 `{productRef, contentId}` **참조만 통과**시켰다.
- KPA 뷰어는 본문이 없으면 `return null` → 항상 미표시.
- 프로덕션 `/tablet/screen` 응답 실측에도 `product_content` 섹션 없음(§8-2).

**판정: DEAD 확정.** 같은 목적은 `content_list` 가 서버 resolve 로 이미 대체(정본 §1-3-③).

### 2-3. 조치 — 쓰기·resolve·렌더에서 은퇴, **가드는 보존**

제거: `ScreenBlockType` union / 공통 매장 라우터·운영자·공급자 세트의 쓰기 허용 목록 및 preview 분기 /
공개 resolver 분기 / KPA 뷰어 렌더 분기 / KPA API 타입.

**보존**: `store-tablet-medication-guard.collectScreenSetMasterIds()` 의 `product_content` 수집.
DB CHECK 제약이 아직 이 값을 허용하므로 직접 INSERT 로 존재할 수 있다. **안전 판정을 좁히지 않는다.**

---

## 3. `store_tablet_displays` 역할 A~D 판정 (순서 3)

실측: **6행 / 태블릿 2대 / 전부 is_visible / `content_id` 채워진 행 0**.
`current_screen_set_id IS NULL` 인 태블릿 4대는 전부 `is_active=false` 테스트 태블릿이고 진열 0행.

| 역할 | 내용 | 판정 | 근거 |
|:---:|---|:---:|---|
| **A** | `product_list` 의 실제 상품 집합·순서 원장 | **LIVE — 유지** | 살아 있는 2대가 이 경로로만 상품을 얻는다. 지우면 그 2대의 상품 화면이 빈다. |
| **B** | `content_id` = 상품별 콘텐츠 선택 원장 | **DEAD** | 0/6 행. 2세대 `content_list` 가 대체. §4 에서 1순위 근거에서 분리했다. |
| **C** | `configured` (코너 구성 여부) 판정 근거 | **LIVE — 유지** | `resolveTabletDisplaySource` 의 가시행 COUNT. |
| **D** | 그 밖의 역할 | **없음** | — |

**결론: 테이블 삭제 불가(중지 조건 준수).** 다만 A·C 만 살아 있고 B 는 죽었음을 코드에 명시했다.

---

## 4. `first_active` / 공개 URL 호환성 판정 (순서 4)

| 조직 | 태블릿 | active | 세트 보유 |
|---|---:|---:|---:|
| e3d14288… | 3 | **3** | 3 |
| 9c87f46b… | 4 | **2** | 2 |
| 68e1291f… | 2 | 0 | 0 |

- `?tabletId=` 없이 열리는 kiosk URL 이 정상 사용이다(device pairing 부재). 제거 시
  `products` · `idle` · `screen` 3개 공개 endpoint 가 태블릿을 못 고른다.
- 다태블릿 매장(2곳)에서 `ORDER BY created_at ASC LIMIT 1` 은 **가장 오래된 1대로 결정적 고정**.
- **QR 공개 URL 은 이 fallback 에 의존하지 않는다** — screen set 의 `public_qr_slug`
  (active 세트 15개 전부 보유 · `store_qr_codes.landing_type='screen_set'` 39건)로 세트를 직접 지목한다.

**판정: 존치.** 제거하면 기존 태블릿이 깨진다(중지 조건 해당) → 삭제하지 않고 근거를 코드 주석에 고정.
device pairing 도입 시 이 함수 하나만 교체하면 되도록 호출부 3곳이 모두 이 함수를 경유함을 확인했다.

---

## 5. 상품 Content fallback 계약 단일화 (순서 5) — **구조적 결함 발견·수정**

정본 §2 의 1순위는 "매장이 **해당 상품에** 명시적으로 연결한 내 매장 콘텐츠" 이고,
그 연결 원장은 `kpa_store_content_product_links` 다.

**그런데 기존 구현은 그 링크를 1세대 컬럼 `disp.content_id` 를 경유해서만 찾았다**
(`ON scl.content_id = disp.content_id`). 실측상 그 컬럼은 0/6 행이므로

> **1순위가 구조적으로 발화 불가능했고, 런타임은 사실상 2순위(SPD)부터 시작하고 있었다.**

조치 — supplier(`store-public-utils`)·local(`store-public-tablet.handler`) **양쪽을 같은 형태로** 정렬:

- 1순위 근거 = 링크 원장 **직접 조회**.
- `disp.content_id` 는 제거하지 않고 **우선순위 정렬 키**로만 보존(과거 데이터 호환).
- `LEFT JOIN LATERAL … LIMIT 1` — 링크 다중 시 행 증식·비결정성 차단(local 쿼리는 DISTINCT 가 없어 필수).

부수 실측: `kpa_store_content_product_links` 는 현재 **전체 0행** → 오늘 관측 변화 0, 계약만 정상화.

---

## 6. `product_list` 3단 계약 정렬 (순서 6)

```text
① 명시 선택(config.products)          → 그 목록·순서            selectionMode='selected'
② (태블릿 문맥 한정) 코너 진열        → store_tablet_displays   selectionMode='corner_display'  ← 신설 표식
③ 그 외 (QR·모바일 포함)              → 상품 없음                selectionMode='selected'(0건)
```

- ②는 1세대에 남은 **유일한 살아 있는 읽기 경로**다(§3-A). 태블릿 문맥에서만 성립하고,
  QR·모바일은 ③에서 이미 차단된다(코너 무관 상품 유입 방지 — 기존 계약 유지).
- `selectionMode='corner_display'` 는 **additive** 다. 기존 소비처는 `'selected'` 만 인식하므로
  미인식 값은 무시된다(기존 동작 불변). 이제 소비처가 "어느 단을 통해 온 목록인지" 구분할 수 있다.

실측 분포: `legacy_tablet_displays` 15 · source 키 없음 13 · `selected_products` 4.

---

## 7. idle 이중 구조 정리 (순서 7) — **비대칭 버그 발견·수정**

"이중 구조"의 실체는 저장소가 둘이라는 뜻이 아니라 **같은 의미의 두 경로가 다른 결과**를 냈다는 뜻이었다.

| 경로 | 기존 결과 |
|---|---|
| config 없음 | `[운영자 공통, ...매장 대기목록]` |
| `source='legacy_idle_playlist'` | `[...매장 대기목록]` ← **운영자 공통 영상 조용히 유실** |

`legacy_idle_playlist` 는 "이 태블릿의 대기 목록을 쓴다" 는 뜻이지 "운영자 공통을 뺀다" 는 뜻이 아니다.
두 경로를 일치시켰다. `operator_common` · `custom_media` 는 명시 선택 소스이므로 prepend 대상이 아니다(중복 방지).

관련 실측:

- `store_tablets.idle_playlist_items` 채워진 태블릿 **0 / 9**
- `store_tablet_operator_idle_selections` **0행**
- `signage_forced_content` (target_surface tablet_idle/both) **0행**
- 태블릿에 적용된 세트 5개 중 **3개가 `legacy_idle_playlist`** → 세 코너는 현재 재생 목록이 비어 있다.

→ 강제 콘텐츠가 0건이라 **오늘 관측 변화는 없다.** 계약만 단일화했고, 향후 운영자 공통 영상이 등록되면
세 코너가 정상적으로 함께 재생한다(기존에는 조용히 빠졌다).

계약표는 `store-public-tablet-idle-resolve.ts` 헤더에 고정했다.

---

## 8. 검증

### 8-1. 정적·테스트

| 항목 | 결과 |
|---|---|
| `pnpm --filter @o4o/api-server run type-check` | PASS |
| `pnpm run type-check:frontend` (6 서비스) | **OK** |
| `services/web-kpa-society` `tsc -b` | PASS |
| jest — 신규 계약 spec | **18/18 PASS** |
| jest — 기존 tablet 계약 4스위트 | **44/44 PASS** |
| ESLint(변경 13파일) | 0 error (warning 8건 전부 기존) |
| `node scripts/lint-ratchet.mjs` | PASS — `51 errors / baseline 51` (변동 0) |

신규 spec `kpa-tablet-generation-consolidation-contract.spec.ts` 가 §2·§5·§6·§7·§9 를 회귀 고정한다.
§5 회귀 가드는 **오탐 0 / 미탐 0** 을 별도 실증했다(구형 `AND scl.content_id = disp.content_id` 탐지 = true,
신형 정렬 키 `(l.content_id = disp.content_id) DESC` 오탐 = false).

### 8-2. SQL BEFORE/AFTER 동치 — 프로덕션 실데이터

이번 변경의 최대 위험은 공개 hot path 2개의 SQL 재작성이다. 배포 전에 **프로덕션 DB 에서 구형/신형
쿼리를 나란히 실행**해 동치를 실증했다 (org `9c87f46b…` / tablet `f8b78a16…` = 진열 보유 실사용 코너).

| 대상 | BEFORE | AFTER |
|---|---|---|
| local 상품 | 3행 (후시딘·비판텐·마데카솔, content=NULL) | **3행 동일 · 동일 순서 · content=NULL** |
| supplier 상품 | 19행 / content 0 (org 전체) · 3행 / content 0 (해당 코너) | **동일** |

→ 신형 SQL 은 **문법 유효 + 결과 동일**.

### 8-3. 공개 endpoint BEFORE 기준선 (프로덕션 · 배포 전)

| endpoint | http | 관측 |
|---|:---:|---|
| `/tablet/screen?tabletId=…` | 200 | sections = idle_media(1) · corner_description · content_list(4) · product_list(products 0, selectionMode 없음) · qr_guide — **product_content 섹션 없음** |
| `/tablet/products?tabletId=…` | 200 | supplier 0 / local 3 · `tabletDisplaySource=configured` · selectedContentId 전부 null |
| `/tablet/idle?tabletId=…` | 200 | items 1 (youtube) · `tabletSource=query` · `operatorCommonSource=null` |

**배포 후 AFTER 예측(반증 가능):**
`screen` 은 `product_list.selectionMode='corner_display'` 만 추가되고 나머지 동일 /
`products` 는 완전 동일(§8-2 로 증명) / `idle` 은 완전 동일(이 코너는 `custom_media` 이며 강제 콘텐츠 0건).

### 8-4. Browser E2E — **미실시(사유 명시)**

로컬 api-server 기동이 **이번 변경과 무관한 워크스페이스 해석 오류**로 실패했다:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  packages/content-core/src/types/index.js
  imported from packages/content-core/src/index.ts
```

`@o4o-apps/content-core`(skeleton, `main` 이 `src/index.ts`) 의 런타임 해석 문제이며 본 WO 가 건드린
파일이 아니다. 변경분이 아직 배포되지 않아 프로덕션 브라우저 확인은 **AFTER 를 볼 수 없다**.

따라서 브라우저 클릭 대신 **더 강한 증거**를 남겼다: §8-2 프로덕션 실데이터 SQL 동치 +
§8-3 배포 전 BEFORE 기준선 + 반증 가능한 AFTER 예측. 배포 후 §8-3 표를 다시 찍어 대조하면 종결된다.
**통과한 것만 골라 보고하지 않기 위해 이 항목을 미실시로 명시한다.**

---

## 9. 중지 조건 — 발동 3건 (구현하지 않고 보고)

| # | 조건 | 상태 | 내용 |
|:---:|---|:---:|---|
| 1 | `product_content` 제거에 CHECK 제약 축소 migration 필요 | **발동** | `store_tablet_screen_blocks.block_type` CHECK 에 `product_content` 가 남아 있다(`20270120000000`, `20270206000000`). 제약 축소는 **migration** 이므로 이번 회차에서 하지 않았다. 코드 은퇴만 수행. 대상 0행이라 축소 자체는 안전하나 **별도 승인 필요**. |
| 2 | `store_tablet_displays` 삭제 | **미해당(삭제 안 함)** | §3 역할 판정 결과 A·C 가 LIVE → 삭제 금지. `content_id` 컬럼만 DEAD 이나 DROP 은 migration 이라 보류. |
| 3 | `first_active` 제거가 기존 URL/태블릿을 깸 | **발동** | §4 근거로 **존치**. 제거하지 않고 보고. |

### 후속 제안 (별도 WO)

1. `block_type` CHECK 에서 `product_content` 제거 + `store_tablet_displays.content_id` DROP (둘 다 0행).
2. 세트 idle 소스를 KPA 태블릿 관리 화면이 **실제 값으로** 표시(현재는 계약 문구만 안내 — §10).
3. 정본 §10 Phase 3 공통 추출 — 이번 회차로 KPA 백엔드 계약이 단일화되어 착수 가능해졌다.

---

## 10. KPA 태블릿 관리 UX (순서 8)

기존 2탭 구조(`코너별 운영` / `태블릿 콘텐츠`)는 이미 정본 §4 의 **B(운영) / A(저작)** 분리와 일치한다 —
재설계하지 않았다.

남은 실제 결함은 **대기 화면 편집기**였다. 이 편집기는 1세대 원장(`store_tablets.idle_playlist_items`)을
직접 편집하는데, 실제 재생 목록은 적용된 세트의 `idle_media` 블록이 어떤 소스를 가리키는지에 따라 갈린다.
화면에서 그걸 알 수 없어 "저장했는데 안 나온다" 가 생기는 구조였다(실측: 5개 코너 중 3개가 legacy 소스인데
그 원장은 0행).

→ 편집기 상단에 **우선순위와 설정 위치**를 명시하는 안내를 추가했다. 데이터·저장 동작은 바꾸지 않았다.

---

## 11. 제거 가능한 legacy/dead 정리 (순서 10)

| 대상 | 조치 |
|---|---|
| `product_content` 블록 — 쓰기 허용 목록 3곳 · preview 분기 3곳 · 공개 resolver 분기 · 뷰어 렌더 분기 · 타입 union 2곳 | **제거** |
| `product_content` — 의약품 가드 수집 | **보존**(§2-3 근거) |
| `product_content` — DB CHECK · 과거 migration | **보존**(중지 조건 1) |
| `store_tablet_displays` 테이블 · `content_id` 컬럼 | **보존**(§3 · 중지 조건 2) |
| `first_active` fallback | **보존**(§4 · 중지 조건 3) |

이번 회차에서 **테이블·컬럼·행을 하나도 지우지 않았다.** DB 변경 0 / migration 0.

---

## 12. 범위 밖 (건드리지 않음)

다른 서비스 공통화 · PharmacyHub 수정 · QR Placement 개발 — **전부 미착수**.
변경 파일 13개는 전부 공통 태블릿 백엔드 계약과 KPA 프론트다.
`@o4o/screen-content-core` union 축소는 3개 소비 서비스(KPA·Neture·PharmacyHub)에 영향이 있으나,
제거 대상이 어디서도 생성·렌더되지 않아 `type-check:frontend` 6서비스 OK 로 확인했다.

---

## 13. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건(§9)

---

## 14. 결론 — canonical reference 로서의 상태

| 축 | 이번 회차 이후 |
|---|---|
| 블록 타입 | 실사용 5종으로 수렴(dormant 1종 은퇴) |
| 상품 Content 1순위 | 링크 원장 **단일 근거** · supplier/local **동일 형태** |
| product_list | 3단 계약 명시 + 출처 표식 |
| idle | **단일 resolver · 단일 계약표**(경로 간 결과 불일치 해소) |
| 1세대 진열 | 살아 있는 역할(A·C)만 남기고 죽은 역할(B)을 계약에서 분리 |
| first_active | 존치 근거·교체 지점 명문화 |
| 회귀 | 계약 spec 18건으로 고정 |

다음 공통화(정본 §10 Phase 3)는 이 계약을 그대로 추출 대상으로 삼을 수 있다.
