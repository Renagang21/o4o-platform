# O4O-STORE-MENU-CANONICAL-TREE-V1

> **매장 HUB ↔ 내 매장 메뉴 Canonical Tree**
>
> 매장 HUB 에 진열되는 항목과 매장 경영자가 내 매장에서 제작·활용하는 메뉴를 **같은 축** 으로 정렬한다.
>
> 매장 HUB 항목 = 내 매장 제작/활용 메뉴 = 동일 실행 자산 축.

- **작성일:** 2026-05-23
- **분류:** Baseline (Standard)
- **버전:** V1
- **상태:** Active
- **상위 문서:**
  - [`O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1`](O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md) (게시 표준)
  - [`O4O-BUSINESS-PHILOSOPHY-V1 §3.3`](O4O-BUSINESS-PHILOSOPHY-V1.md) (Store 정의)
  - [`O4O-3-ROLE-FLOW-BASELINE-V1`](O4O-3-ROLE-FLOW-BASELINE-V1.md)
- **선행 IR:** [`IR-O4O-OPERATOR-HUB-CONTENT-PUBLISHING-SIMPLIFICATION-V1`](../archive/investigations/IR-O4O-OPERATOR-HUB-CONTENT-PUBLISHING-SIMPLIFICATION-V1.md) §3, §5

---

## 1. 정렬 원칙

```text
매장 HUB
  → 운영자가 매장 경영자를 위해 준비한 실행 콘텐츠 진열 공간

내 매장
  → 매장 경영자가 가져와서 실제 매장에서 활용하는 공간

두 영역은 서로 다른 구조가 아니라, 같은 실행 자산 축으로 정렬된다.
```

### 1.1 매장 메뉴 axis = HUB 항목 axis

매장 HUB 의 N개 항목 ↔ 내 매장 메뉴의 N개 항목 — **1:1 동일 축**.

매장 경영자가 HUB 에서 본 항목 그대로 내 매장에서 작업 가능해야 함.

### 1.2 본 V1 범위

- 6 항목 (상품 상세정보 / POP / QR-code / 블로그 / 사이니지 / 고객 안내문)
- **설문 제외** (별도 후속 IR — §7 참조)

### 1.3 적용 서비스 (Neture 제외 확정)

```text
적용 대상: KPA / GlycoPharm / K-Cosmetics  (매장 기능 보유 서비스)
제외:      Neture  (매장 기능 부재 — 공급자 / 운영자 / 시장 실행 플랫폼)
```

**확정 사유:** Neture 는 매장 (Store) 기능 자체가 없는 공급자/운영자/시장 실행 중심 서비스. 매장 HUB ↔ 내 매장 흐름의 모든 항목 (블로그 / POP / QR / 상품 상세 / 사이니지 / 고객 안내문) 의 구현 대상이 아니다.

향후 Neture 에 매장 기능이 신설되는 경우 본 §1.3 의 적용 범위 재검토.

---

## 2. Canonical 항목 정의

### 2.1 표준 6 항목

| # | 항목명 | HUB 진열 | 매장 제작 | 매장 가져가기 | 저장 대상 후보 | 기존 구현 | 후속 구현 |
|---|--------|:--------:|:---------:|:-------------:|--------------|----------|----------|
| 1 | **상품 상세정보** | HubB2BCatalogPage (KPA/Glyco) | StoreProductInfoCreatorPage (KPA) | 부분 | `store_execution_assets` / `kpa_store_contents` | 부분 (KPA 단독) | 필요 |
| 2 | **POP** | StoreHubSignageLibrary 내 | StorePopPage (KPA) | ✅ `assetType='signage'` | `store_execution_assets` | 정렬 (KPA 중심) | 일부 |
| 3 | **QR-code** | 독립 진열 화면 부재 | StoreQRPage (KPA) | 부분 (library 참조) | `store_execution_assets` + URL | 부분 (KPA 단독) | 필요 |
| 4 | **블로그** | 진열 화면 부재 | PharmacyBlogPage (KPA, direct) | ❌ Hub→Store 흐름 없음 | `kpa_store_contents` / staff_blog_posts | 미구현 (KPA 직접 작성만) | **필요 (HUB ↔ 매장 흐름 신설)** |
| 5 | **사이니지** | HubSignageLibraryPage | StoreSignagePage | ✅ `assetType='signage'` | `o4o_asset_snapshots` + `signage_playlist_items` | 정렬 (KPA / Glyco) | 거의 없음 |
| 6 | **고객 안내문 / 설명자료** | HubContentLibraryPage (CMS) | 매장 측 화면 부재 | ✅ `assetType='cms'` | `cms_contents` (visibilityScope='organization') / `kpa_store_contents` | 부분 (HUB 측만) | **필요 (매장 측 화면 신설 — 현재 0%)** |

### 2.2 설계 원칙

각 항목은 다음을 갖춰야 한다:

- HUB 진열 화면 (운영자 게시 결과를 매장 경영자가 탐색)
- 매장 제작 화면 (매장 경영자가 자기 매장에 맞춰 작성·편집)
- 매장 가져가기 흐름 (HUB → 내 매장 사본 복사)
- 출처 표시 (§5 참조)

---

## 3. HUB ↔ 내 매장 메뉴 매핑표

| 매장 HUB 항목 | 내 매장 메뉴 | 매장 활용 방식 | 가져가기 방식 | 현재 구현 상태 | 정렬 판정 | 후속 작업 |
|--------------|-------------|--------------|--------------|--------------|:--------:|----------|
| 상품 상세정보 (HUB B2B Catalog) | 내 상품 상세 | 내 매장 상품 페이지에 표시 / 인쇄물 활용 | snapshot copy (`assetType='product'` 표준화 필요) | KPA 단독 (60%) | 부분 정렬 | W4 |
| POP (HUB Signage 내 일부) | 내 매장 POP | 매장 인쇄 / 디스플레이 / 캠페인 | `assetSnapshotApi.copy({ assetType:'signage' })` 일부 + library 참조 | KPA 90%+ | **정렬** | W7 출처 통일 |
| QR-code (HUB 진열 부재) | 내 매장 QR | 매장 안내 / 랜딩 / 설문 진입 | library 참조 (snapshot 표준화 필요) | KPA 단독 (90%) | 부분 정렬 | W5 |
| 블로그 (HUB 진열 부재) | 내 매장 블로그 | 매장 블로그 게시 / SEO / 고객 안내 | **흐름 부재 — 신설 필요** | KPA 단독 direct only (70%) | **미정렬** | W3 |
| 사이니지 (HubSignageLibraryPage) | 내 매장 사이니지 | 매장 디지털 디스플레이 송출 | `assetSnapshotApi.copy({ assetType:'signage' })` | KPA/Glyco 95% | **정렬** | W7 출처 통일 |
| 고객 안내문 (HubContentLibraryPage) | 내 매장 안내문 | 매장 안내 인쇄 / 화면 표시 | `assetSnapshotApi.copy({ assetType:'cms' })` | **매장 측 0%** | 부분 정렬 (HUB 측만) | W6 |

### 3.1 매핑 원칙

- 매장 HUB 항목명과 내 매장 메뉴명은 **동일** 한 사용자 표현 사용
- 매장 메뉴 그룹은 6 항목 기준 — 추가/세분화 가능하나 6 항목 축 자체는 유지
- 사이니지는 RTE 부적합 — 전용 화면 유지 (게시 표준 §3.2 와 정합)

---

## 4. 가져가기 / 사본화 기준

### 4.1 표준 흐름

```text
운영자 RichTextEditor 작성·수정
   ↓ status='published'
매장 HUB 진열 (HubContentQueryService)
   ↓ 매장 경영자 "내 매장으로 가져가기" 클릭
assetSnapshotApi.copy({ sourceService, sourceAssetId, assetType })
   ↓ o4o_asset_snapshots / 매장 측 entity (kpa_store_contents / store_execution_assets)
매장 사본 생성
   ↓ 매장 경영자가 자기 매장 상황에 맞춰 수정
매장 실행 자산 활용
```

### 4.2 사본화 핵심 원칙

| 원칙 | 의미 |
|------|------|
| **HUB 콘텐츠는 원본** | 운영자만 수정 가능. 매장 경영자는 원본 직접 수정 금지. |
| **매장 사본은 독립** | 가져온 자료는 매장 소유 사본. 매장 경영자가 자유롭게 편집·삭제·재사용 가능. |
| **원본 변경 ≠ 사본 변경** | 운영자가 HUB 원본을 갱신해도 매장 사본은 영향 없음 (snapshot semantics) |
| **출처 표시 유지** | 매장 사본은 항상 원본 출처를 메타로 보존 (§5 참조) |

### 4.3 가져가기 API 표준

```text
assetSnapshotApi.copy({
  sourceService: '<service>',
  sourceAssetId: '<hub-item-id>',
  assetType: 'cms' | 'signage' | 'product' | 'qr' | 'blog' | ...
})
```

현재 5종 `assetType` 지원 (`cms` / `signage` / `lesson` / `content` / `resource`). 6 항목 모두 지원 위해 `product` / `qr` / `blog` 매핑 확장 또는 기존 5종에 정합 매핑 필요 — 후속 W7 의 범위.

### 4.4 본 V1 비-구현 영역

본 baseline 은 문서 기준 정렬. 실제 API/UI 구현은 후속 WO (§9 참조).

---

## 5. 출처 표시 기준

### 5.1 표준 출처 (4 종)

기존 `StorePopPage` 의 `library` / `snapshot` / `direct` 명칭을 표준화 + 확장:

| Origin | 의미 | UI Badge 권장 |
|--------|------|---------------|
| `operator_hub` (= 기존 `library`) | 운영자가 HUB 에 게시한 콘텐츠를 매장이 가져온 자료 | "운영자 자료" / 파란색 |
| `community_snapshot` (= 기존 `snapshot`) | 커뮤니티 콘텐츠를 매장이 가져온 자료 | "커뮤니티" / 회색 |
| `store_direct` (= 기존 `direct`) | 매장이 직접 작성한 콘텐츠 | "직접 작성" / 녹색 |
| `library_self` (선택) | 매장 자료함 (내 매장 업로드 / 자체 라이브러리) | "내 자료" / 노란색 |

### 5.2 기존 명칭 유지 정책

기존 `StorePopPage` 의 3 명칭 (`library` / `snapshot` / `direct`) 은 코드 호환을 위해 그대로 사용 가능. 본 baseline 은 의미 매핑을 명문화:

```text
library     = operator_hub      (운영자 게시 → 매장 가져옴)
snapshot    = community_snapshot (커뮤니티 → 매장 가져옴)
direct      = store_direct       (매장 직접 작성)
```

신규 코드는 의미가 명확한 명칭 (`operator_hub` 등) 사용 권장.

### 5.3 출처 표시 원칙

- 모든 항목 (POP / QR / 블로그 / 상품 상세 / 사이니지 / 안내문) 의 매장 측 자료실·목록·상세에 origin badge 표시
- 매장 경영자가 콘텐츠 출처를 한 눈에 식별
- 운영자 게시 콘텐츠 ↔ 매장 자체 작성을 **동일 자료실에서 통합 표시 + badge 로 구분** (별도 화면 분리 금지)

---

## 6. 항목별 구현 상태 재분류

`IR-O4O-OPERATOR-HUB-CONTENT-PUBLISHING-SIMPLIFICATION-V1` §3, §5 기준 재정리.

| # | 항목 | HUB 진열 | 매장 제작 | 가져가기 | 종합 판정 | 후속 WO |
|---|------|:--------:|:---------:|:-------:|:---------:|:-------:|
| 1 | POP | 부분 (Signage 통합) | 90% | ✅ | **정렬** | W7 (출처 통일) |
| 2 | 사이니지 | ✅ | 95% | ✅ | **정렬** | W7 (출처 통일) |
| 3 | 상품 상세정보 | 부분 (B2B Catalog) | 60% | 부분 | **부분 정렬** | W4 (운영자 게시 + 매장 흐름) |
| 4 | QR-code | ❌ (독립 진열 부재) | 90% | 부분 | **부분 정렬** | W5 (운영자 게시 신설) |
| 5 | 고객 안내문 | ✅ (CMS) | **0%** | ✅ | **부분 정렬 (매장 측 부재)** | W6 (매장 측 화면 신설) |
| 6 | 블로그 | ❌ (진열 부재) | 70% (direct only) | ❌ | **미정렬** | W3 (HUB ↔ 매장 흐름 신설) |
| (참고) 설문 | — | — | — | **범위 외** | 별도 IR (W10) |

### 6.1 우선순위

후속 구현 우선순위 (영향도 기준):

1. **W3 블로그** — HUB ↔ 매장 흐름 전체 신설 (가장 미정렬)
2. **W6 고객 안내문** — 매장 측 0% (전체 미구현)
3. **W5 QR-code** — HUB 진열 신설
4. **W4 상품 상세정보** — 매장 측 확장
5. **W7 / W8** — POP / 사이니지 출처 표시 통일 (이미 정렬됨, 다듬기)

---

## 7. 설문 제외 기준

본 V1 canonical tree 에서는 설문을 포함하지 않는다.

```text
설문은 필요하지만 본 V1 범위에서 제외한다.

이유:
- 우선은 매장 경영자 대상 설문이 별도 논의 필요
- 소비자 대상 설문은 QR-code / 태블릿 등 실제 소비자 이용 환경 설계 후
  별도 IR 에서 다룬다
- 배치 방식 (매장 HUB 내 / 별도 영역) 별도 결정

후속: IR-O4O-SURVEY-STRUCTURE-DESIGN-V1 (가칭)
```

→ 6 항목 표준에 설문 미포함. 본 baseline 은 6 항목 축만 정의.

---

## 8. Drift Guard

다음 상태는 본 표준에 대한 **Drift** 로 본다.

| # | Drift | 등급 |
|---|-------|:----:|
| SMT-G1 | 매장 HUB 항목과 내 매장 메뉴가 서로 다른 축으로 운영됨 (HUB 6 항목 vs 매장 N 항목 불일치) | **HIGH** |
| SMT-G2 | 운영자가 게시한 콘텐츠를 매장 경영자가 가져가 활용할 수 없음 (가져가기 흐름 부재) | **HIGH** |
| SMT-G3 | HUB 콘텐츠가 매장 사본이 아니라 원본 직접 수정 방식으로 연결됨 (snapshot semantics 위반) | **HIGH** |
| SMT-G4 | 상품 상세정보 / POP / QR-code / 블로그 / 사이니지 / 고객 안내문 축이 메뉴마다 다르게 표현됨 (명칭 불일치) | MED |
| SMT-G5 | 매장 자료실 안에서 운영자 게시 콘텐츠 ↔ 매장 자체 작성이 별도 화면으로 분리됨 (통합 표시 위반) | MED |
| SMT-G6 | 출처 표시 (`origin badge`) 가 누락된 항목 존재 | MED |
| SMT-G7 | 설문을 본 V1 범위에 포함해 구조를 복잡하게 만듦 | LOW |
| SMT-G8 | 공급자가 O4O 내부 Producer 로 다시 등장 (`HubProducer='supplier'` 제외 — 명문화된 예외 유지) | HIGH (기존 정책) |

---

## 9. 후속 WO 권장 순서

본 baseline 확정 후 다음 순서로 구현 WO 진행:

### 9.1 Phase 1 — 미정렬 / 매장 측 부재 항목 신설 (우선순위 순)

| # | WO | 사유 |
|---|----|------|
| **W3** | `WO-O4O-OPERATOR-BLOG-PUBLISHING-V1` | 블로그 — 가장 미정렬. HUB 진열 + 매장 가져가기 흐름 신설 |
| **W6** | `WO-O4O-OPERATOR-CUSTOMER-GUIDE-PUBLISHING-V1` | 고객 안내문 — 매장 측 0% (HUB 측은 CMS 로 이미 정렬) |
| **W5** | `WO-O4O-OPERATOR-QR-PUBLISHING-V1` | QR-code — HUB 진열 신설 |
| **W4** | `WO-O4O-OPERATOR-PRODUCT-DETAIL-PUBLISHING-V1` | 상품 상세정보 — 매장 측 확장 |

### 9.2 Phase 2 — 표준 통일 (병렬 가능)

| # | WO | 사유 |
|---|----|------|
| **W7** | `WO-O4O-STORE-HUB-CONTENT-IMPORT-STANDARD-V1` | 6 항목 모두에 `assetSnapshotApi.copy()` 적용 — assetType 매핑 확장 |
| **W8** | `WO-O4O-STORE-CONTENT-ORIGIN-BADGE-V1` | 출처 표시 (`operator_hub` / `community_snapshot` / `store_direct` / `library_self`) 6 항목 확장 |

### 9.3 Phase 3 — 매장 메뉴 통합 (UI 측)

| # | WO | 사유 | 상태 |
|---|----|------|------|
| **W9** | `WO-O4O-MY-STORE-PRODUCT-CENTERED-ACTIVATION-V1` (구 가칭 `WO-O4O-STORE-MENU-IMPLEMENTATION-V1`) | 매장 측 메뉴 구조를 본 V1 축으로 통합 정렬 — `packages/store-ui-core/src/config/storeMenuConfig.ts` canonical 적용 | **1차 완료 (2026-06-05)** — §12 참조 |

### 9.4 Phase 4 — 설문 (별도 트랙)

| # | IR | 사유 |
|---|----|------|
| **W10** | `IR-O4O-SURVEY-STRUCTURE-DESIGN-V1` | 매장 경영자 대상 우선, 소비자 대상은 환경 설계 후 |

### 9.5 권장 진행 순서

```text
W3 (블로그 HUB↔매장)  ← 가장 미정렬
   ↓
W6 (고객 안내문 매장 측)  ← 매장 측 0%
   ↓
W5 (QR-code HUB)
   ↓
W4 (상품 상세 매장 측)
   ↓
W7 + W8 (가져가기 통일 + 출처 표시)  ─ 병렬
   ↓
W9 (매장 메뉴 통합 정렬 UI)
   ↓
W10 (설문 별도 IR)
```

---

## 10. 본 baseline 의 위치

```text
CLAUDE.md
   ↓
PHILOSOPHY-V1
   ↓
3-ROLE-FLOW-BASELINE-V1
   ↓
Operator UX Baselines ┐
                     ├─ OPERATOR-CANONICAL-WORKFLOW-V1     (검수·승인 UX)
                     ├─ OPERATOR-NON-APPROVAL-UX-BASELINE-V1  (5 Workspace)
                     └─ OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1  (RTE 게시 표준)
   ↓
Store Side Standards ┐
                     └─ STORE-MENU-CANONICAL-TREE-V1       (본 문서 — 매장 축 정렬)
   ↓
영역별 Freeze / Baseline / IR
```

본 baseline 은 `OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1` 의 매장 측 대응 baseline 이다. 운영자 게시 표준이 "HUB 측 어떻게 만드는가" 를 정의했다면, 본 baseline 은 "내 매장에서 어떻게 받아 쓰는가" 의 메뉴·축 표준이다.

---

## 11. 검증

| 검증 | 결과 |
|------|------|
| 매장 HUB 6 항목 정의 | ✅ §2.1 |
| HUB ↔ 내 매장 메뉴 매핑표 | ✅ §3 |
| 가져가기 / 사본화 기준 (4 원칙) | ✅ §4.2 |
| 출처 표시 기준 (4 종 + 기존 명칭 호환) | ✅ §5 |
| 항목별 구현 상태 재분류 + 우선순위 | ✅ §6 |
| 설문 제외 명시 | ✅ §7 |
| Drift Guard 8건 | ✅ §8 |
| 후속 WO 권장 순서 (4 Phase) | ✅ §9 |
| 우선순위 체인 위치 | ✅ §10 |

---

## 12. 구현 로그 (W9 — 메뉴 축 정렬)

### 12.1 WO-O4O-MY-STORE-PRODUCT-CENTERED-ACTIVATION-V1 1차 (2026-06-05)

§9.3 W9 의 1차 구현. **메뉴 재배치 한정** — 신규 화면 제작 없음, 모든 항목 subPath(라우트) 불변, 섹션 그룹/순서/라벨만 정렬.

**적용 파일:** `packages/store-ui-core/src/config/storeMenuConfig.ts` (3개 config)

**공통 축 (KPA 기준):**

```text
(무라벨)        홈 / 대시보드
운영           공급자(O4O) 상품 · 주문 · [매출/정산]
활성화          내 매장(약국) 상품 ★ · [자체 상품] · [상품 상세설명] · 블로그 · POP · QR
자료함          콘텐츠 · 자료 · 매장 제작 자료
디지털 사이니지   플레이리스트 · 동영상 · 스케줄 · TV 재생   (변경 없음)
채널/마케팅     채널 관리 · 태블릿 · 상담요청 · [펀딩/퍼널 등]
분석           마케팅 분석
[경영(GP)]      약국 경영 · 정산
설정           매장(약국) 정보 · 매장 설정
```

**핵심 이동:** `내 매장(약국) 상품` 을 commerce(운영) 그룹에서 분리해 **"활성화" 그룹의 앵커**로 이동, 제품 파생 콘텐츠(블로그/POP/QR/상품설명)를 그 아래로 모음. 사이니지는 제품 파생이 아니므로 분리 유지(SMT 드리프트 가드 정합).

**라벨:** KPA/GlycoPharm = "약국 운영/약국 활성화/약국 자료함", K-Cosmetics = "매장 운영/매장 활성화/내 자료함".

**1차 범위 외 (2차 후보):**
- 제품 row action 통일(상품설명/POP/QR/블로그/활용자료) — 화면 로직이라 분리
- KPA `상품 상세설명` 사이드 노출 — 라우트 마운트 확인 후 활성화에 추가
- 항목 라벨 전면 통일(내 매장 상품 ↔ 내 약국 제품 등)

**검증:** `store-ui-core` typecheck PASS (`npx tsc --noEmit`, EXIT 0).

---

**작성:** O4O Platform Team
**상태:** Active — 매장 HUB ↔ 내 매장 메뉴 같은 축 정렬 기준 (CLAUDE.md 등록 대기)
