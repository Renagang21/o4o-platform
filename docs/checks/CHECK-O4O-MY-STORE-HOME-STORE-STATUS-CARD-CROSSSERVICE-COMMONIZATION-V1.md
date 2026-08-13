# CHECK-O4O-MY-STORE-HOME-STORE-STATUS-CARD-CROSSSERVICE-COMMONIZATION-V1

- **WO**: WO-O4O-MY-STORE-HOME-STORE-STATUS-CARD-CROSSSERVICE-COMMONIZATION-V1 — 내 매장 홈 매장 상태 카드 공통화
- **브랜치**: `work/commonization-my-store-shell-parts` (main 병합 없음)
- **작성일**: 2026-08-13
- **상태**: 구현 완료(2 서비스) · 4 서비스 typecheck/build PASS

---

## 1. 조사 — 기존 차이

| 서비스 | 상태 영역 | 상태 축(의미) | 데이터 |
|---|---|---|---|
| **PharmacyHub** | `statusSlot` — 카드(아이콘+매장명+사용자명 / 우측 상태 배지 / 경고 2종 / 역할·승인일시 dl / 가입 상태 상세 링크) | **가입·연결 상태** (`none/pending/active/rejected/suspended/withdrawn` + `not_connected` `ambiguous`) | `fetchStoreDashboard` (store + membership) |
| **K-Cosmetics** | `statusSlot` — 카드(아이콘 / 매장명+상태 배지 / 코드·멤버수·역할 한 줄 / 우측 상품·주문 관리 버튼) | **매장 운영 승인 상태** (`approved/pending/draft/suspended/rejected`) | 선택 매장(`selectedStore`) |
| **KPA** | **없음** — 헤더 + 처리 필요 신호 + KPI 구성. 매장 상태 카드/배너 없음 | – | – |
| **GlycoPharm** | `HubLayout`(hub-core) 의 섹션·signal·QuickAction 상태 모델 + `orderMetricsReady` 배너 | 운영 신호(signalKey) 축 | `useStoreHub` |

표시 의미는 4서비스가 서로 다르다:
- 매장 연결 여부 = PharmacyHub 만 (`not_connected` / `ambiguous`)
- 멤버십/역할 = PharmacyHub(역할·승인일시) · K-Cosmetics(역할·멤버수) — 값의 출처와 판정이 다름
- 운영 활성 상태 = K-Cosmetics(매장 승인 상태) · GlycoPharm(운영 신호)
- 서비스별 별도 경고 = PharmacyHub 연결 경고 · GlycoPharm 주문/매출 준비 중 배너

---

## 2. 공통화 여부와 이유

**공통화 대상 = PharmacyHub + K-Cosmetics 2서비스의 카드 "구성 계약"만.** 상태 값의 의미·판정은 공통화하지 않았다.

- 두 카드는 **아이콘 → 매장명 → 상태 배지 → 메타(역할 등) → 경고 → 보조 액션** 이라는 동일한 구성과 순서를 각자 인라인으로 반복하고 있었다. 이 배치·조건부 렌더가 공통화 대상이다.
- 반면 **상태 축이 다르다**(가입/연결 vs 매장 운영 승인). 그래서 상태 값·라벨·tone·경고 노출 조건·membership/role 판정은 **서비스에 그대로 남기고 slot 으로 받는다.** 공통 컴포넌트는 판정 코드를 갖지 않는다.
- KPA 는 해당 카드가 **존재하지 않아** 제외했다(신규 상태 추가 금지).
- GlycoPharm 은 `HubLayout` 의 상태 모델(roles·signalKey·QuickAction)이 단순 카드보다 넓어, 축소하면 기능 손실 — WO 변경 금지 항목이므로 제외했다.

---

## 3. Core / 서비스별 유지

`packages/store-ui-core/src/components/home/StoreHomeStatusCard.tsx` (신규)

| 계약 | 내용 |
|---|---|
| `variant` | `'stacked'`(PharmacyHub) / `'inline'`(K-Cosmetics) — 두 서비스 기존 마크업을 각각 보존 |
| slot | `badgeSlot` · `notices` · `actionsSlot` · `footerSlot` — 상태 판정 결과를 서비스가 만들어 넣는다 |
| config | `icon` · `iconWrapClassName` · `title` · `titleClassName` · `subtitle` · `meta[]` · `headerClassName` · `className` |
| `wrapper` | 컨테이너를 서비스 `Card` 등으로 감싼다 (K-Cosmetics `<Card className="p-6">`) |
| 판정 없음 | 상태→라벨/tone 매핑, 경고 노출 조건, membership/role 해석 코드 **미포함** |

의존성 변경 없음(react 만 사용). package.json / lockfile 미변경.

**서비스별 유지**

| 서비스 | 유지 |
|---|---|
| PharmacyHub | `STATUS_LABEL`/`STATUS_TONE`, loading·error 배지 분기, `not_connected`·`ambiguous` 경고 문구와 조건, 역할·승인일시 dl, `/join/status` 링크, teal accent |
| K-Cosmetics | `STATUS_CONFIG`/`StatusBadge`, 코드·멤버수·역할 표기, 상품·주문 관리 NavLink 2종, `Card p-6` |
| KPA | 변경 0 |
| GlycoPharm | 변경 0 (회귀만 확인) |

---

## 4. 변경 금지 준수

- 상태 의미 통합 없음 — 두 서비스의 상태 vocabulary·tone 을 각자 유지.
- membership/role 판정 로직 이동 없음 (공통 컴포넌트에 판정 코드 0).
- 매장 연결 API · route · 권한 · API 계약 변경 없음.
- 신규 상태/경고 추가 없음.
- **DB / migration / backend 변경 없음.**
- GlycoPharm `HubLayout` 상태 모델 미변경.

---

## 5. 검증

| 대상 | typecheck | vite build |
|---|:---:|:---:|
| web-kpa-society (회귀) | PASS | PASS |
| web-pharmacy-hub | PASS | PASS |
| web-k-cosmetics | PASS | PASS |
| web-glycopharm (회귀) | PASS | PASS |

코드 경로 등가성 확인(작업 브랜치 미배포 — 브라우저 smoke 미실행):

| 항목 | 확인 |
|---|---|
| 문구·값 | PH: 매장명/`불러오는 중…`/`매장 정보 확인 불가`/역할/승인 일시/경고 2종 문장 그대로. KCos: 매장명/`코드: `/`멤버 N명`/역할 3분기 그대로 |
| 경고·노출 조건 | PH `!loading && !error && store?.status === 'not_connected' | 'ambiguous'` 조건식 그대로. meta 는 `error` 시 미노출(종전 `!error` 래핑과 동일) |
| tone | PH `STATUS_TONE` fallback 포함 동일, error 배지 red, loading 텍스트 동일. KCos `STATUS_CONFIG` 배지 컴포넌트 그대로 사용 |
| 액션 목적지 | PH `/join/status` · KCos `/operator/products`, `/operator/orders` |
| 레이아웃 | PH `flex flex-wrap items-start justify-between gap-3` + `dl grid sm:grid-cols-2`(모바일 1열/sm 2열) · KCos `flex flex-col md:flex-row md:items-center md:justify-between gap-4`(모바일 세로/데스크톱 가로) — class 문자열 종전 그대로 |
| 마크업 | 컨테이너 태그만 PH `section` 유지 / KCos `Card`(div) 유지. 내부 요소 구조 동일 |

---

## 6. 변경 파일

```
packages/store-ui-core/src/components/home/StoreHomeStatusCard.tsx   (신규)
packages/store-ui-core/src/index.ts                                  (export 추가)
services/web-pharmacy-hub/src/pages/store-owner/HomePage.tsx         (statusSlot 위임)
services/web-k-cosmetics/src/pages/operator/StoreCockpitPage.tsx     (statusSlot 위임)
docs/checks/CHECK-O4O-MY-STORE-HOME-STORE-STATUS-CARD-CROSSSERVICE-COMMONIZATION-V1.md (본 문서)
```

KPA / GlycoPharm 소스 변경 0건.

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
