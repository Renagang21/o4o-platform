# CHECK-O4O-KPA-TABLET-LOCATION-FIRST-UX-REFIT-V1

> WO: `WO-O4O-KPA-TABLET-LOCATION-FIRST-UX-REFIT-V1`
> 성격: 저비용 UX refit — **schema 무변경 / public runtime 무변경 / API contract 무변경 / 프론트 UI 재배치만**
> 선행: [CHECK-O4O-KPA-TABLET-CURRENT-DASHBOARD-DATA-STRUCTURE-AUDIT-V1](CHECK-O4O-KPA-TABLET-CURRENT-DASHBOARD-DATA-STRUCTURE-AUDIT-V1.md)
> 대상: `https://kpa-society.co.kr/store/commerce/tablet-displays`

---

## 1. 변경 전 화면 기준축

**태블릿 기기(store_tablets row) 중심** — 세로 누적 6 섹션, 상단에 **DataTable(태블릿 목록)** 이 1차 선택 수단. 태블릿을 표 행 클릭으로 고르면 아래 섹션들이 `selectedTabletId` 로 갱신.

```
태블릿 목록 DataTable(선택) → 공개 URL → 서비스 공통 대기영상 → 대기화면(Idle) → 태블릿 화면 설정 → 진열 편집기
```

문제: "지금 어느 코너 태블릿을 보고 있는지", "그 코너에 무엇이 나가는지" 를 한눈에 파악하기 어렵고, 위치/코너가 표의 한 컬럼일 뿐 1차 기준축이 아니었다.

## 2. 변경 후 화면 기준축

**위치/코너 우선 2단 레이아웃** — 좌측 사이드바가 위치/코너 기준 태블릿 목록(1차 기준축), 우측이 선택 코너의 현재 구성.

```
┌ 좌: 코너·위치 사이드바 ┐  ┌ 우: 선택 코너 현재 구성 ────────────────┐
│ [화장품 코너]          │  │ 현재 코너 화면 구성 요약                   │
│  A - 1 섹터            │  │  (코너명 + 공개URL복사/미리보기 +          │
│ [IDLE 검증 코너 B]     │  │   진열 상품 수 · 대기화면 수 · 공통영상 상태) │
│ [SMOKE_타블렛]         │  │ ── 서비스 공통 대기영상                    │
│  ...                   │  │ ── 대기 화면(Idle) 편집                   │
│ [+ 추가]               │  │ ── 태블릿 화면 설정                       │
│                        │  │ ── 진열 편집기 (상품 풀 + 현재 구성)        │
└────────────────────────┘  └──────────────────────────────────────────┘
```

- 좌측 사이드바는 `location` 우선(없으면 name) 라벨로 표시하고 **위치 기준 정렬**(같은 코너끼리 묶임, 위치 없는 태블릿은 뒤로).
- 우측 최상단에 **현재 코너 화면 구성 요약** 패널을 신설 — 선택 코너명 + 공개 URL(복사)/미리보기 + 진열 상품 수(노출 수)/대기화면 수/공통 대기영상 상태 + 변경됨 표시.
- 기존 "공개 화면 URL" 독립 섹션은 요약 패널로 **흡수**(중복 제거).

### 레이아웃 선택 근거 (사이드바 vs 상단 탭)

WO §5.1 권장대로 **좌측 사이드바형**을 채택. 코너 태블릿은 매장당 다수로 늘 수 있어(WO 배경) 상단 탭보다 세로 목록이 확장에 유리하고, 선택 상태·삭제·추가를 한 열에 모을 수 있다. `lg` 이상에서 2단, 모바일에서는 사이드바가 상단으로 쌓이는 반응형.

---

## 3. 실제 수정 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` | (1) 상단 DataTable(+ActionBar 일괄삭제) 제거 → 위치/코너 **좌측 사이드바** 신설 · (2) 2단 grid 레이아웃 · (3) **현재 구성 요약 패널** 신설(공개 URL/미리보기 흡수) · (4) `sortedTablets`(위치 정렬)·`cornerPrimary/cornerSecondary`·`selectedTablet` 도출 추가 · (5) 미사용 자원 제거(`DataTable/ActionBar/Column` import, `tabletColumns`, `selectedTabletKeys`, `bulkDeleting`, `handleBulkDeleteTablets`) |

> **단일 파일 프론트 변경.** 백엔드/엔티티/마이그레이션/공유 패키지 무변경.

## 4. 재사용한 기존 API / 컴포넌트 (변경 없이 그대로)

- 상태/핸들러: `fetchTablets`·`createTablet`·`deleteTablet`(→ 사이드바 per-card 삭제), `loadTabletData`(pool/displays/idle), `handleSave`(진열), `handleSaveIdle`, `handleSaveSettings`, `handleOcSelect/Clear`(운영자 공통영상), `handleOpenPreview`, `publicTabletUrl`.
- 컴포넌트: `IdlePlaylistEditor`·`TabletKioskPage`(@o4o/tablet-kiosk-core), 진열 편집기(상품 풀 + 현재 구성 grid), 전시 설정 카드, 미리보기 오버레이, 운영자 공통영상 모달 — **전부 그대로 재배치만**.
- 요약 패널 수치는 **이미 로드된 state**(`displays`·`idleItems`·`ocSelection`)에서 계산 — **신규 API 호출 0**.

## 5. 추가 API

**없음.** WO §7.2(read-only summary API)는 허용되나 **프론트 조합으로 해결**(선택 코너의 진열/대기/공통영상 수치는 이미 로드된 데이터로 계산). 사이드바 per-tablet 카운트(모든 태블릿 동시 표시)는 이번 범위에서 미도입(§8 한계).

## 6. 금지 범위 준수

| 금지 항목 | 준수 |
|---|:--:|
| DB migration | ✅ 없음 |
| 테이블 컬럼 추가/삭제 | ✅ 없음 |
| screen_set/block 모델 구현 | ✅ 없음 (요약 문구도 "현재 코너 화면 구성" 수준, "화면 세트" 용어 미사용) |
| 기존 idle 저장 구조 변경 | ✅ 없음 (idle_playlist_items 그대로) |
| store_tablet_displays 의미 변경 | ✅ 없음 |
| public product source of truth 변경 | ✅ 없음 (public runtime 파일 미접촉) |
| operator common idle video 정책 변경 | ✅ 없음 |
| OPL/service_key 코드 수정 | ✅ 없음 |
| 테스트 데이터 생성 | ✅ 없음 |
| `?tabletId` 공개 URL / first-active fallback / device pairing | ✅ 정책 무변경 (URL 생성 로직 동일) |

## 7. 테스트 / 빌드 결과

| 검증 | 결과 |
|---|:--:|
| `web-kpa-society` typecheck (`tsc --noEmit`) | ✅ PASS (exit 0) |
| `web-kpa-society` build (`tsc && vite build`) | ✅ PASS (exit 0, StoreTabletDisplaysPage 청크 정상 빌드) |
| Deploy Web Services (Cloud Run, kpa-society) | ✅ success (run 29096266313, `10854b764`) |
| Browser smoke (production, 약국 계정) | ✅ PASS (아래) |

### Browser smoke (production, 2026-07-10) — 약국 경영자 계정

`kpa-society.co.kr` 로그인 → `/store/commerce/tablet-displays`. Playwright headless.

| 항목 | 결과 |
|---|:--:|
| 페이지 진입 | ✅ |
| 코너·위치 사이드바 렌더 | ✅ |
| 현재 코너 화면 구성 요약 패널 | ✅ |
| 요약 통계 3종 (진열 상품 / 대기 화면 / 공통 대기영상) | ✅ |
| 공개 URL 복사 + 미리보기 버튼 (요약에 통합) | ✅ |
| 기존 편집 섹션 유지 (Idle 편집 / 서비스 공통 대기 영상 / 태블릿 화면 설정 / 상품 편집기) | ✅ 4/4 |
| console error / network 4xx·5xx | ✅ 0 / 0 |

> **다중 코너 전환(≥2 카드) 미실측**: 사용 가능한 약국 계정(renagang21)은 태블릿 1대 보유라 사이드바 카드가 1개 → 코너 선택 전환 경로는 브라우저에서 직접 실측 못 함. WO §7.3(테스트 데이터 생성 금지)로 임시 태블릿을 만들지 않았다. 단일 태블릿 렌더(자동 선택, §8.2 "1개일 때 불필요하게 복잡하지 않음")는 PASS. 다중 전환은 `setSelectedTabletId` onClick(단순 state) + typecheck/build 로 커버.

## 8. 남은 한계 (명시)

- **아직 Screen Set/Block 정식 모델은 아님** — 진열/대기화면/설정은 여전히 각각의 저장소·저장 버튼(파편 4경로) 유지. 요약 패널로 "한눈에 보기"만 개선.
- **대기화면은 아직 `idle_playlist_items` 별도 저장소** — screen-set 블록으로 흡수하지 않음.
- **화면 세트 교체 기능 없음** — 한 코너에 여러 세트를 만들어 배정하는 개념 미도입.
- **location 은 아직 자유텍스트** — 코너 정규화 테이블 없음. 사이드바 그룹핑은 문자열 정렬 기반.
- **org 단위 tablet settings 공유 문제 잔존** — 전시 설정은 여전히 매장 1행(코너별 분리 아님).
- **사이드바 per-tablet 카운트 미표시** — 모든 태블릿의 진열/대기 수를 동시에 보여주려면 read-only summary API 필요(WO §7.2). 이번엔 선택 코너만 요약(신규 호출 0 우선).
- **일괄 삭제(체크박스 다중선택) → per-card 삭제로 대체** — 삭제 기능 자체는 사이드바 카드에서 유지. 코너 태블릿 소수 운영 전제상 허용 범위(감사 §7 유지목록의 데이터/ API 계약과 무관한 UI 어포던스 변경).
- **비활성 태블릿 미표시** — `fetchTablets` 가 active 만 반환하는 기존 동작 유지(정책 무변경).

## 9. 후속 WO 제안

1. `WO-O4O-KPA-TABLET-CORNER-SCREEN-SET-BLOCK-DESIGN-V1` — 정식 Screen Set/Block/Assignment 모델 설계(파편 4경로 통합 편집 단위).
2. `WO-O4O-KPA-TABLET-IDLE-BLOCK-INTEGRATION-DESIGN-V1` — idle_playlist_items → screen-set 블록 흡수 설계.
3. `WO-O4O-KPA-TABLET-DEVICE-SCOPED-PUBLIC-VIEW-V1` — device pairing / first-active fallback 해소 / 코너별 전시 설정 스코프 확장.
4. (선택) `WO-O4O-KPA-TABLET-SIDEBAR-SUMMARY-API-V1` — 모든 코너의 진열/대기 수를 한 번에 보여줄 read-only summary 엔드포인트(사이드바 per-tablet 카운트).

---

## 10. 완료 기준 대비

| 완료 기준 | 상태 |
|---|:--:|
| 위치/코너 목록 중심 재배치 | ✅ 좌측 사이드바 1차 기준축 |
| 선택 위치/코너 현재 구성 한눈에 | ✅ 요약 패널(코너명·진열/대기/공통영상·공개URL·미리보기) |
| 기존 진열/idle/운영자영상/공개URL 기능 유지 | ✅ 핸들러·컴포넌트 그대로 재배치 |
| schema 변경 0 / public runtime 변경 0 / 기존 데이터 변경 0 | ✅ |
| CHECK 문서 작성·커밋·push | ✅ (`10854b764` 구현, 배포/smoke 결과 반영 커밋) |
