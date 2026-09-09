# IR-O4O-STORE-EXECUTION-ASSET-LOCATION-AND-UI-CENSUS-V1

- **WO**: WO-O4O-STORE-EXECUTION-MANAGEMENT-CANONICAL-DESIGN-V1 (§2 · §13 · §14)
- **작성일**: 2026-09-09
- **성격**: 조사 전용 — 코드 변경 0 / schema 변경 0 / 메뉴 변경 0
- **근거**: 소스 전수 + **프로덕션 실측**(Cloud SQL Auth Proxy, read-only SELECT)
- **짝 문서**: [`DESIGN-O4O-STORE-EXECUTION-MANAGEMENT-CANONICAL-V1`](../design/DESIGN-O4O-STORE-EXECUTION-MANAGEMENT-CANONICAL-V1.md)

---

## 0. 한 줄 결론

> **"코너 이름을 어디에 저장할까"가 병목이 아니다.**
> 실행 표면 4개 중 **2개(POP·Signage)에는 배치 축 자체가 없다.**
> Store Corner entity 를 지금 만들어도 붙을 곳이 2개뿐이다.

---

## 1. 위치/코너 성격 컬럼 — 전수 (프로덕션 실측)

`information_schema` 에서 `location|corner|shelf|zone|position|placement|display|player|device`
패턴을 store/signage 계열 테이블 전체에 대해 조회한 **전수 결과 12건**이다.

| 테이블 | 컬럼 | 실제 의미 | 위치 축인가 |
|---|---|---|:---:|
| `store_tablets` | `location` varchar | 태블릿 1대의 설치 위치 | **✅ 유일한 진짜 위치 필드** |
| `store_qr_placements` | `placement` varchar | QR 사용처 코드(개방형) | **✅ (2026-09-09 신설)** |
| `store_qr_placements` | `corner_ref` varchar | 코너 참조 훅 | ✅ 이지만 **미사용(0행)** |
| `store_qr_codes` | `primary_placement` | 목록용 캐시 | ✅ (파생) |
| `signage_template_zones` | `position` jsonb · `zoneKey` · `zoneType` | **화면 템플릿 내부 레이아웃 영역** | ❌ 매장 위치 아님 |
| `signage_forced_content_positions` | `display_order` | 정렬 순서 | ❌ |
| `store_playlist_items` | `display_order` | 정렬 순서 | ❌ |
| `store_local_products` | `price_display` | 가격 표기 | ❌ |
| `store_product_profiles` | `display_name` | 이름 | ❌ |
| `store_qr_scan_events` | `device_type` | 스캔 기기 종류(mobile/desktop) | ❌ |

**위치 축은 실질적으로 2개뿐이다** — `store_tablets.location`, `store_qr_placements.placement`.
나머지는 이름만 겹치는 오탐이다. `signage_template_zones` 는 특히 혼동하기 쉬우나
**화면 안쪽 레이아웃 영역**이지 매장 안쪽 위치가 아니다.

### 1-1. `store_tablets.location` 실제 값 — 관례가 3종 혼재

프로덕션 태블릿 9대 중 8대에 값이 있다.

```text
카운터 / 구강관리 코너 / 피부관리 코너 / 검증용 코너   ← 한글 코너 이름
A-2 / C-2 / F-2                                        ← 격자·매대 코드
x                                                      ← 의미 없는 값
(빈 값 1)
```

**같은 컬럼에 3가지 표기 관례가 섞여 있다.** 자유 문자열을 join key 로 쓰면
`구강관리 코너` 와 `A-2` 는 절대 만나지 않으면서도 **에러 없이 조용히 어긋난다.**
이것이 "문자열 location 으로 충분한가"에 대한 실측 답이다 — 충분하지 않다.

### 1-2. `store_tablet_corner_contents` — 이름은 corner 지만 코너 entity 가 아니다

```text
id · organization_id · tablet_id · screen_set_id · sort_order · is_visible   (13행)
```

**태블릿 × 화면세트 연결 테이블**이다. 여기서 "corner" 는 *태블릿 그 자체*를 뜻한다.
독립 코너 식별자가 아니므로 **Store Corner entity 가 이미 있다고 판단하면 안 된다.**

`TabletCornerBoard`(운영 Core) 주석이 이 등가를 명시한다:

> 카드 1장 = 태블릿 1대. 카드 제목 = **설치 코너(위치)**, 없으면 태블릿 이름.

즉 **Tablet 도메인에서는 이미 `코너 ≡ 태블릿 1대`** 로 굳어 있다.

---

## 2. 실행 표면별 배치 축 보유 현황 — 이 조사의 핵심

| 표면 | 원장 | 배치(위치) 축 | 이력 | 사용 로그 | 프로덕션 행수 |
|---|---|---|:---:|:---:|---|---|
| **QR** | `store_qr_codes` | `store_qr_placements` | **있음** | `store_qr_scan_events` (112행) | QR 91 / 배치 4 |
| **Tablet** | `store_tablets` | `location` 자유문자열 | **없음**(현재값만) | **없음** | 9대 |
| **POP** | `store_pops` | **없음** | 없음 | 없음 | **0행** |
| **Signage** | `signage_playlists` | **없음** | 없음 | `signage_playback_logs` (**0행**) | 재생목록 1 |
| **ESL** | 없음 | 없음 | 없음 | 없음 | — |

### 2-1. POP 에는 위치가 없다

`store_pops` 컬럼: `store_id · service_key · author_role · title · slug · summary · content ·
status(draft|published|archived) · published_at`.

**`published` 는 "게시했다"이지 "매대에 붙였다"가 아니다.**
WO §7 의 가설 — *"출력됨 ≠ 매장에서 사용 중"* — 은 실측으로 확인됐다.
POP 은 제작·게시 축만 갖고 있으며 실행 축이 없다.

### 2-2. Signage 에는 기기·설치 위치가 없다

signage 계열 테이블 12개 전수: `ai_generation_logs · content_blocks · forced_content ·
forced_content_positions · layout_presets · media · playback_logs · playlist_items ·
playlist_shares · playlists · schedules · template_zones · templates`.

**`signage_displays` · `signage_players` · `signage_devices` 는 존재하지 않는다.**
`signage_playlists` 는 `organizationId` 로 매장에만 묶이고, 재생은 TV 에서 플레이어 URL 을
여는 방식이다. 따라서 설계 예시의 **"대기공간 TV"는 현재 어디에도 표현되지 않는다.**

### 2-3. 측정 가능한 것은 QR 하나뿐

| 표면 | 사용 로그 | 상태 |
|---|---|---|
| QR | `store_qr_scan_events` | **112행 — 실측 가능** |
| Signage | `signage_playback_logs` | 테이블만 있고 **0행** |
| Tablet | — | **로그 테이블 자체가 없다** |
| POP | — | 없음 (원장도 0행) |

코너별 통합 분석을 v1 에 넣으면 **QR 외의 숫자는 전부 지어낸 값이 된다.**

---

## 3. 메뉴 IA 전수 — "KPA/PH 차이 없음" 전제는 이미 사실이 아니다

`packages/store-ui-core/src/config/storeMenuConfig.ts` 의 3개 서비스 config 실측.

### 3-1. 같은 4개 표면이 서비스마다 다른 그룹에 있다

| 표면 | KPA-Society | PharmacyHub | K-Cosmetics |
|---|---|---|---|
| QR | `[약국 경영지원]` | **`[매장 실행]`** | `[매장 활성화]` |
| POP | `[약국 경영지원]` | **`[매장 실행]`** | `[매장 활성화]` |
| Tablet | `[약국 경영지원]` "태블릿 화면 제작" | **`[매장 실행]`** "태블릿" | `[채널]` "태블릿" |
| Signage | `[디지털 사이니지]` 독립 그룹 | **`[매장 실행]`** 안에 4항목 | `[디지털 사이니지]` 독립 그룹 |

**서비스 3개 → 그룹핑 3종.** WO §12 의 "KPA / PH 차이 = 없음" 은
My Store 메뉴 축에서는 **이미 성립하지 않는다.** 새 운영 계층은 parity 를 *유지*하는 게 아니라
**parity 를 회복시키는** 작업이다.

### 3-2. PharmacyHub 가 이미 `[매장 실행]` 을 만들어 뒀다

PH 만 QR·POP·사이니지·TV재생·태블릿·상품설명서를 **`[매장 실행]` 한 그룹**에 모았고,
라우트 주석도 같은 어휘를 쓴다:

```tsx
{/* WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 — 매장 실행 자산 (출력·실행) */}
<Route path="qr" .../>  <Route path="pop" .../>  <Route path="signage" .../>
```

**"매장 실행"이라는 상위 개념은 이미 PH 에서 한 번 발명됐다.**
이번 설계는 새 개념 도입이 아니라 **PH 의 그룹을 3서비스 공통 운영 계층으로 승격**하는 일이다.
다만 PH 의 것은 여전히 **자산 종류별 나열**이며 코너 축이 아니다.

### 3-3. 셸은 이미 공통이다 (좋은 소식)

PH 의 `StoreOwnerShell` 은 공통 `MyStoreShell` + `PHARMACY_HUB_STORE_CONFIG` 를 쓴다.
KPA·K-Cos 도 같은 `storeMenuConfig.ts` 를 쓴다.
**메뉴를 한 곳에서 바꾸면 3서비스에 동시 적용된다** — 서비스별 사이드바 사본이 없다.

---

## 4. 기존 UI 중복 — 가장 중요한 발견

### 4-1. `StoreChannelsView` 는 이미 "운영 관점" 화면이다

`packages/store-ui-core/src/components/channels/StoreChannelsView.tsx`

```ts
CHANNEL_TABS = [ B2C 온라인 스토어 · KIOSK 키오스크 · TABLET 태블릿 · SIGNAGE 사이니지 ]
STATUS_CONFIG = { APPROVED 활성 · PENDING 대기 · REJECTED 거부 · SUSPENDED 정지 · EXPIRED 만료 · TERMINATED 해지 }
CHANNEL_DESC.TABLET = '매장 내 태블릿에서 상품 안내 및 상담 요청을 처리합니다'
```

제작 화면이 아니라 **"우리 매장에서 어떤 채널이 살아 있나"를 보는 화면**이다.
제안하는 실행 관리 홈과 **목적이 겹친다.**

**차이는 축이다:**

```text
StoreChannelsView   축 = 채널(매체 종류)   "태블릿 채널이 승인/활성 상태인가"
실행 관리 홈(제안)   축 = 코너(물리 위치)   "혈당관리 코너에 지금 무엇이 있나"
```

두 화면을 나란히 두면 매장은 "채널 관리"와 "실행 관리"의 차이를 물을 것이다.
**설계 문서가 이 관계를 명시하지 않으면 세 번째 중복 화면이 된다.**

### 4-2. `StoreMarketingAnalyticsView` 에 이미 매체 축이 있다

```ts
{ key: 'tablet', label: '태블릿' }  ...  (qr 등 매체별 키 보유)
```

코너별 분석을 새로 만들면 **매체별 분석과 숫자가 갈라진다.** 같은 스캔 모집단을
두 화면이 다르게 자르면 매장은 어느 쪽을 믿을지 모른다.

### 4-3. 중복 아님으로 판정한 것

| 후보 | 판정 | 근거 |
|---|---|---|
| `signage_template_zones` ↔ 매장 코너 | **중복 아님** | 화면 내부 레이아웃 영역 |
| `store_execution_assets.usage_type` ↔ 배치 | **중복 아님** | 자산의 *용도*(pop/qr/signage/banner/notice)이고 **위치 컬럼이 없다**. 자산 라이브러리이지 배치 원장이 아니다 |
| `store_tablet_corner_contents` ↔ Corner entity | **중복 아님** | 태블릿×화면세트 연결 |
| `foreign_visitor_partner_qr_scan_events` | **별도 축** | 외국인 관광객 파트너 QR — 매장 실행 자산 아님 |

---

## 5. WO 질문에 대한 직답

| # | 질문 | 답 |
|---|---|---|
| 1 | 독립 Store Corner entity 가 이미 있는가 | **없다.** `store_tablet_corner_contents` 는 이름만 corner 다 |
| 2 | 신규 entity 가 정말 필요한가 | **필요하지만 지금은 아니다** — §6 |
| 3 | 단순 문자열 location 으로 충분한가 | **불충분하다.** 실측상 한 컬럼에 관례 3종이 섞여 join 이 조용히 실패한다 |

---

## 6. 왜 "지금은 아니다" 인가

Corner entity 를 지금 만들면 붙일 표면이 **Tablet·QR 2개뿐**이다.
POP 은 프로덕션 **0행**, Signage 재생 로그 **0행**, ESL 은 **미존재**.

```text
Corner entity 를 먼저 만든다  →  참조자 2개 · 빈 코너 카드 · POP/Signage 칸은 영구 "없음"
배치 축을 먼저 채운다        →  코너는 그때 데이터에서 자연히 드러난다
```

QR 회차에서 이미 검증된 순서가 있다:

> `placement` 를 **개방형 문자열**로 두고 → 실제 사용 분포를 관측하고 → 그 뒤 정규화한다.

Corner 도 같은 순서를 따르는 것이 일관적이다.
`store_qr_placements.corner_ref`(현재 **0행 미사용**)가 이미 그 승격 훅으로 예약돼 있다.

---

## 7. 조사 범위에서 확인하지 못한 것

정직하게 남긴다.

- **PH 사이드바 렌더 경로**는 공통 `MyStoreShell` 로 확인했으나, PH 홈(`HomePage.tsx`)에는
  실행 자산 진입 카드가 없다 — B2B 주문 축 위주다. 매장이 QR/POP 에 도달하는 실제 경로가
  사이드바 하나뿐인지는 **브라우저 실측을 하지 않아 단정하지 않는다.**
- POP 이 0행인 이유(미출시인지, 진입점 부재인지)는 **이번 조사 범위 밖**이다.
  실행 관리 홈에서 POP 을 어떻게 다룰지는 이 답에 따라 달라지므로 설계 문서에 미결로 남긴다.
- ESL 은 코드·스키마 어디에도 없어 **조사 대상이 존재하지 않았다.**

---

## 8. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```
