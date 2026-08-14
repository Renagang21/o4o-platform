# CHECK-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1

> **WO**: WO-O4O-OPERATOR-CROSSSERVICE-REMAINING-VIEW-DUPLICATION-FINAL-CLEANUP-V1
> **작업일**: 2026-08-13 · **worktree**: `C:\tmp\o4o-agent-e-operator-common` · **branch**: `work/operator-commonization-v1`
> **main 병합 없음** · 기준: 최신 `origin/main` 병합(`17b1ed9ef`, 충돌 0)

---

## 1. 최종 census

```text
전체 모집단: 154
FULLY_COMMON   : 96
CORE_ONLY      : 0
VIEW_DUPLICATED: 0
SERVICE_SPECIFIC: 44
NOT_IMPLEMENTED: 2
OUT_OF_SCOPE   : 12
미조사         : 0
```

합계 검증: 96 + 0 + 0 + 44 + 2 + 12 = **154** ✅

### 1-1. 직전 census 대비 이동

| 이동 | 건수 |
|---|---:|
| `VIEW_DUPLICATED` → `FULLY_COMMON` | **22** |
| `VIEW_DUPLICATED` → `SERVICE_SPECIFIC` | **1** |
| `VIEW_DUPLICATED` 잔여 | **0** |

`FULLY_COMMON` 74 → **96** (+22) · `SERVICE_SPECIFIC` 43 → **44** (+1)

---

## 2. 대상 23건 각각의 최종 판정

### 2-1. 사이니지 HQ 16 → **FULLY_COMMON**

| # | route (KPA · KCos 각 1건) | 판정 |
|---|---|---|
| 1·2 | `/operator/signage/hq-media` | FULLY_COMMON |
| 3·4 | `/operator/signage/hq-media/:mediaId` | FULLY_COMMON |
| 5·6 | `/operator/signage/hq-playlists` | FULLY_COMMON |
| 7·8 | `/operator/signage/hq-playlists/new` | FULLY_COMMON |
| 9·10 | `/operator/signage/hq-playlists/:playlistId` | FULLY_COMMON |
| 11·12 | `/operator/signage/templates` | FULLY_COMMON |
| 13·14 | `/operator/signage/templates/:templateId` | FULLY_COMMON |
| 15·16 | `/operator/signage/forced-content` | FULLY_COMMON |

**근거**: 백엔드가 `app.use('/api/signage/:serviceKey', signageRoutes)` 로 **serviceKey 파라미터화**돼 있어
(`apps/api-server/src/bootstrap/register-routes.ts:1011`) 두 서비스가 완전히 같은 endpoint·payload 를 쓴다.
실차이는 HTTP client · serviceKey · accent · 도메인 어휘뿐이었다.

### 2-2. QR 작성 4 → **FULLY_COMMON**

`/operator/qr/new` · `/operator/qr/:id/edit` × KPA·KCos.

직전 census 가 잔여로 남긴 이유(“KPA 전용 Content Hub 축”)는 **슬롯으로 해소**했다:
`contentKinds`(옵션 목록) + `renderContentPicker`(선택기 슬롯) + `resolvePickedTitle`.
공통 패키지는 KPA 전용 `ContentHubPickerModal` 을 알지 못하며,
**K-Cosmetics 에는 존재하지 않는 `content_hub` 종류가 노출되지 않는다** (§5-3 실측).

### 2-3. 운영 분석 2 → **FULLY_COMMON**

`/operator/analytics` × KPA·Neture.
endpoint 3종(`/operator/analytics/{summary,actions,insight}`)이 동일하고 serviceKey 는 쿼리 파라미터다.
KPA 구현(DataTable · 3계층 독립 오류 · AI 인사이트)을 공통 본체로 채택했다.

### 2-4. Neture 주문 1 → **SERVICE_SPECIFIC**

| 축 | 공통 `product-order-view` (KPA·KCos·GP) | Neture `OrdersManagementPage` |
|---|---|---|
| endpoint | `{service}/operator/orders` | `/neture/operator/orders` |
| row 축 | `storeName` · `channel` · `itemCount` · `orderNumber` (**매장 × 채널**) | `buyer_name` · `buyer_email` · `final_amount` (**구매자**) |
| stats 축 | `{total, paid, pending, cancelled, totalAmount}` (**결제/정산**) | `{total, pending, processing, shipped, delivered}` (**배송 이행**) |
| 탭 | 결제 상태 | `pending_payment → paid → shipped → delivered` (**fulfillment 단계**) |

Neture 주문에는 store/channel/itemCount 차원이 **아예 없고**(매장 B2B 주문이 아니라 Neture 소비자 주문),
공통 뷰에는 배송 이행 단계가 없다. 억지로 합치려면 없는 필드를 지어내고(=계약 왜곡)
Neture 탭의 존재 이유인 배송 단계를 버려야 한다 → WO §금지 2개 항목에 정면으로 걸린다. **합치지 않는다.**

---

## 3. 신설·확장한 공통 모듈

### 3-1. 신설 (`packages/operator-core-ui`)

| 모듈 | LOC | 구성 |
|---|---:|---|
| `modules/signage-hq` | 3,466 | `HqMediaPage` · `HqMediaDetailPage` · `HqPlaylistsPage` · `HqPlaylistCreatePage` · `HqPlaylistDetailPage` · `SignageTemplatesPage` · `SignageTemplateDetailPage` · `ForcedContentPage` · `MediaDeleteDialog` · types |
| `modules/qr-template-write` | 552 | `OperatorQrTemplateWritePage` + picker 슬롯 계약 |
| `modules/operator-analytics` | 427 | `OperatorAnalyticsPage` |
| **합계** | **4,445** | |

`MediaDeleteDialog`(사용처 선조회 삭제 게이트)는 KPA 전용 파일이던 것을 `git mv` 로 공통 패키지에 이관했다.

### 3-2. 신설 (서비스 측 config)

| 파일 | LOC | 내용 |
|---|---:|---|
| `web-kpa-society/…/signage/signageHqConfig.ts` | 60 | apiFetch(Bearer) + serviceKey + accent + 어휘 |
| `web-k-cosmetics/…/signage/signageHqConfig.ts` | 66 | apiFetch(axios) + serviceKey + accent + 어휘 |

---

## 4. 제거 LOC / 신규 공통 LOC

```text
git diff --stat (기존 파일): 22 files changed, 350 insertions(+), 6661 deletions(-)
```

- **기존 서비스 파일 순감**: 6,661 삭제 − 350 추가 = **−6,311 LOC**
- **신규 공통 LOC**: 4,445 (core) + 126 (service config) = **+4,571**
- **전체 순감**: 약 **−1,740 LOC**, 그리고 같은 화면이 서비스 수만큼 존재하던 구조가 **1벌**로 수렴

대표 축소 (before → after):

| 파일 | before | after |
|---|---:|---:|
| KPA `signage/HqPlaylistDetailPage` | 598 | 24 |
| KPA `signage/ForcedContentPage` | 554 | 24 |
| KPA `signage/HqMediaPage` | 541 | 24 |
| KPA `qr/OperatorQrWritePage` | 476 | 78 |
| KCos `signage/ForcedContentPage` | 434 | 24 |
| KCos `signage/HqMediaPage` | 415 | 24 |
| KPA `signage/TemplateDetailPage` | 372 | 24 |
| KPA `AnalyticsPage` | 383 | 48 |
| KCos `signage/HqPlaylistDetailPage` | 373 | 24 |
| Neture `AnalyticsPage` | 322 | 47 |

**누적**(직전 WO 포함): `VIEW_DUPLICATED` 49 → **0**, `CORE_ONLY` 9 → **0**.

---

## 5. 브라우저 검증

### 5-1. 로그인 검증 여부 — **미검증 (명시)**

`docs/local/TEST-ACCOUNTS.local.md` §2 기준 **4서비스 전부 L2 service credential 이 unknown** 이라
웹 로그인 E2E 를 수행할 수 없다. 같은 문서 §4-2 가 허용한 **L1 토큰 주입 우회**로 UI 만 검증했다.

> **로그인 E2E 미검증** — 토큰 주입은 로그인 성공이 아니다. 로그인 자체는 이번에도 검증되지 않았다.

### 5-2. smoke 결과

로컬 `vite preview`(PH 5173 / KPA 5174 / KCos 5175 / Neture 5176), `VITE_API_BASE_URL=https://api.neture.co.kr`.

| 항목 | 결과 |
|---|---|
| 진입 경로 × viewport | **52 조합** (신규 공통화 화면 중심 + PH 회귀) |
| desktop + mobile | 1440×900 / 390×844 |
| deep link | 전 route 주소창 직접 진입 |
| 목록 / 작성 / 상세 / empty / error | 목록 8 · 작성 2 · 상세 deep link(`/none`) 3 · empty·error 상태 포함 |
| JS 예외 | **0** |
| white screen | **0** |
| dead link / NAV 실패 | **0** (전 route 자기 경로 착지) |
| 가로 overflow | 1건 — Neture mobile `/operator/orders` |

**overflow 1건 귀속**: `services/web-neture/src/pages/operator/OrdersManagementPage.tsx` 는
이번 WO 에서 `SERVICE_SPECIFIC` 판정으로 **전혀 수정하지 않았다**(`git diff HEAD -- <path>` 결과 **빈 diff**).
기존 결함이며 본 변경과 무관하다.

### 5-3. 공통화 전후 동일 업무 DOM/UX 비교

`<main>` 콘텐츠 한정으로 `h1 / h2 / th / label` 시그니처를 서비스 간 대조했다.

| 업무축 | 대조 | 구조 동일 |
|---|---|:---:|
| 사이니지 HQ 미디어 | KPA · KCos | YES |
| 사이니지 HQ 플레이리스트 | KPA · KCos | YES (`이름/항목수/총시간/루프/상태/생성일`) |
| 사이니지 플레이리스트 등록 | KPA · KCos | YES (`제목/기본 항목 시간/전환 효과/반복 재생/태그`) |
| 사이니지 템플릿 | KPA · KCos | YES (`이름/공개/시스템/상태/생성일`) |
| 사이니지 강제 콘텐츠 | KPA · KCos | YES (`제목/소스/상태/적용기간`) |
| QR 작성 | KPA · KCos | YES (`제목/설명/대상 종류/대상 URL`) |
| 운영 분석 | KPA · Neture | YES (`액션별 요약/일별 추이/최근 액션 이력` + `일시/액션/상태/상세`) |

**SAME=7 / DIFF=0.** 남은 문자열 차이는 의도한 서비스 어휘뿐이다
(`플레이리스트 등록` ↔ `재생목록 등록`).

### 5-4. 서비스 고유 기능 게이팅 실측 (가장 중요한 회귀 지점)

폼을 실제로 열어 필드를 수집했다.

| 검증 | KPA | K-Cosmetics |
|---|---|---|
| 강제 콘텐츠 `노출 대상`(태블릿 대기화면) 필드 | **PRESENT** | **ABSENT** |
| QR 콘텐츠 종류 옵션 | `콘텐츠 허브 / 블로그 / CMS / POP` | `블로그 / CMS / POP` |
| QR 콘텐츠 허브 선택기 | **PRESENT** | **ABSENT** |

→ 공통화로 **없는 기능이 새로 노출되지 않았고**, 있던 기능도 사라지지 않았다.

### 5-5. production write 미검증 항목

안전한 테스트 데이터가 없어 실행하지 않았다:

- 사이니지: 미디어 등록/삭제(단건·일괄), 미디어/플레이리스트 상태 전이, 플레이리스트 항목 추가/제거,
  플레이리스트 다단계 등록, 템플릿 생성/수정/삭제, 강제 콘텐츠 등록/수정/활성 토글/삭제
- QR: 템플릿 저장 · 발행
- 분석: 조회 전용이라 write 없음

→ 렌더 · 경로 · 폼 구조 · 게이팅까지 검증됐고 **쓰기 경로는 미검증**이다.

---

## 6. 보존 확인 (WO §금지)

| 금지 항목 | 결과 |
|---|---|
| API/DB 계약 변경으로 UI 를 억지로 맞추기 | **0건**. 모든 endpoint·payload 그대로. Neture 주문은 계약 왜곡을 피하려 합치지 않았다(§2-4) |
| 서비스별 업무 의미 제거 | **0건**. KPA 태블릿 노출 대상 · Content Hub 축 모두 보존, KCos 에는 미노출(§5-4) |
| wrapper 만 공유하고 FULLY_COMMON 선언 | 없음 — §5-3 DOM 실측으로 본체 동일성 확인 |
| 미검증 대량 변경 커밋 | 없음 — tsc 5서비스 + build 4서비스 + smoke 52조합 후 커밋 |
| 새 기능 추가 | 없음 |
| URL / 권한 변경 | **0건** |

### 6-1. 수렴 과정에서 정합된 표현 (업무 의미 변경 아님)

| 대상 | 변경 |
|---|---|
| KCos QR 작성 발행 확인 | `window.confirm` → 공통 `ConfirmActionDialog` (게이트 존재 여부 동일) |
| KCos 사이니지 8화면 | DataTable 표준 · 일괄 삭제 · RowActionMenu · 미디어 삭제 안전 게이트 획득 |
| Neture 운영 분석 | 액션 이력 조회 실패를 **silent 로 삼키던 것**을 오류 + 재시도로 표면화 |
| KPA `HqPlaylistDetailPage` | 원본 소스의 깨진 문자열 `HQ 미��어에서 선택` → `HQ 미디어에서 선택` 복구 |
| KCos 사이니지 태그 프리셋 | 기존 `HqMediaPage` 가 KPA 약국 태그(복약지도/당뇨/혈압/의약외품)를 복사해 갖고 있었다. 같은 서비스 `HqPlaylistCreatePage` 는 이미 화장품 태그를 쓰고 있어 **서비스 내부에서도 불일치**했다. 잘못된 약국 어휘를 새 공통 콘솔로 옮기지 않고 화장품 어휘로 통일했다 |

---

## 7. 검증 요약

| 대상 | 결과 |
|---|---|
| KPA `tsc --noEmit` | EXIT=0 |
| K-Cosmetics `tsc --noEmit` | EXIT=0 |
| Neture `tsc --noEmit` | EXIT=0 |
| **GlycoPharm `tsc --noEmit`** (공유 모듈 소비처 회귀) | EXIT=0 |
| Pharmacy-Hub `tsc -b` | EXIT=0 |
| `vite build` × 4 서비스 | 전부 성공 |
| 브라우저 smoke | §5-2 (52 조합, JS 예외 0) |

---

## 8. 남은 사항

### 8-1. 범위 밖 3번째 소비처 (GlycoPharm)

본 WO 대상은 KPA / K-Cosmetics / Neture / Pharmacy-Hub 4서비스다.
GlycoPharm 에도 같은 사이니지 HQ 화면군이 있으나 census 모집단 밖이라 **손대지 않았다**.
공통 모듈은 준비돼 있어 `signageHqConfig.ts` 1개 추가로 편입 가능하다.
GlycoPharm 은 공유 모듈 소비처이므로 **회귀 검증만 수행**했다(`tsc` EXIT=0).

### 8-2. 이전 WO 에서 이월된 기존 결함 (본 WO 미해결, 재기록)

| 위치 | 현상 |
|---|---|
| K-Cosmetics `/operator/blog` | `GET /api/v1/cosmetics/operator/blog/posts` → **404** (백엔드 route 부재). 공통 콘솔은 오류 + 재시도로 정상 표시 |
| `/operator/members` mobile (KPA·KCos·Neture) | 가로 overflow — 직전 WO 에서 BEFORE/AFTER 실측으로 기존 결함 확인 |
| Neture `/operator/orders` mobile | 가로 overflow — 본 WO 미수정 파일(§5-2) |

---

## 9. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
```

1. `WO-…-GLYCOPHARM-OPERATOR-SIGNAGE-HQ-COMMON-ADOPTION-V1` — §8-1
2. `WO-…-KCOSMETICS-OPERATOR-BLOG-BACKEND-ROUTE-V1` — §8-2 의 404
3. `WO-…-OPERATOR-MOBILE-TABLE-OVERFLOW-V1` — §8-2 의 overflow 3+1건

---

## 10. 결론

- 대상 **23건 전부**를 `FULLY_COMMON`(22) 또는 `SERVICE_SPECIFIC`(1) 로 종료했다.
- **`CORE_ONLY` = 0 · `VIEW_DUPLICATED` = 0 · 미조사 = 0.**
- 다만 **로그인 E2E 와 production write 는 미검증**이다(§5-1 · §5-5).
  이 두 축은 자격증명·테스트 데이터 확보 후 별도 검증이 필요하다.
