# CHECK-O4O-SD-CLASS-COMMON-CONTRACT-UNIFY-V1 — `sd-*` 클래스 계약 공통 승격

WO: `WO-O4O-SD-CLASS-COMMON-CONTRACT-UNIFY-V1` · 일자: 2026-07-15 · 상태: 완료
진입: [DOCUMENT-INDEX](../guides/common/DOCUMENT-INDEX.md) · 결과물: [STORE-DESCRIPTION-CLASS-CONTRACT](../guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md) (CR-020)

> **문서 정리 전용.** 코드·DB·디자인 변경 0. 규칙 신설 0 — 기존 계약의 **SSOT 위치만 이동**.

---

## 1. 조사 결과 — 사용 범위

저장소 전체(`node_modules`·`dist` 제외) `sd-card|sd-hero|sd-body|sd-core|sd-theme-` 검색: **21 파일**.

### 1-1. 정의 위치

| 항목 | 결과 |
|---|---|
| CSS 정의 지점 | **`packages/content-editor/src/components/ContentRenderer.tsx:137-225` — 유일** |
| 중복·상이 정의 | **없음** (`.sd-card{` 정의가 있는 파일 = 위 1개) |
| 제품군별 재정의 | **없음** |
| 정의 이름에 제품군 흔적 | **없음** — variant `store-description`, 래퍼 `.store-desc-content`, 토큰 `--sd-*`. 어디에도 HFF·건기식 토큰 없음 |

### 1-2. 문서화 위치 (승격 전)

| 문서 | 성격 |
|---|---|
| `products/health-functional-food/AGENT-KICKOFF.md §5` | **계약 어휘 전문** ← 제품군 문서인데 공통 계약을 보유 (= 승격 대상) |
| `work-orders/WO-O4O-STORE-DESCRIPTION-RENDERER-DESIGN-SYSTEM-V1.md §2` | 설계 근거 (역사 문서, 유지) |
| `guides/OTC-DESCRIPTION-DESIGN-GUIDE.md §1·§2` | 계약 복사본 ← 2번째 복사 발생 (= 참조로 교체 대상) |

### 1-3. 콘텐츠 사용 (저자 산출물)

| 제품군 | 파일 | 비고 |
|---|---|---|
| 건강기능식품 | `examples/*.semantic.html` 2 + `pilot-probiotics/drafts/*.html` 10 | 현재 유일한 **저자 산출물** |
| 그 외 제품군 | **0** | drug·general-food·medical-device 에 `sd-card` 콘텐츠 없음 |

### 1-4. 계약 이탈 여부

HFF 콘텐츠가 실제 사용한 class **20종** — **전부 계약 어휘 내. 이탈 0.**

```text
sd-badge sd-badges sd-body sd-card sd-chips sd-core sd-cta sd-cta-k sd-foot sd-hero
sd-intake sd-intro sd-item sd-meta sd-spec sd-tag sd-theme-green sd-theme-red sd-who sd-why
```

(`sd-scan` 은 렌더러 전용이라 콘텐츠 미사용 — 정상)

### 1-5. 소비 표면 (제품군 게이트 여부)

| 표면 | 제품군 한정? |
|---|---|
| KPA 설명서 모달 (`StoreDescriptionViewModal.tsx:169`) | **아니오** — 매장 취급 상품 전체 |
| Neture 상품 랜딩 (`ProductLandingPage.tsx:275`) | **아니오** — 상품 전체 |

렌더러 WO 의 적용 대상도 `shared_product_descriptions` STORE/B2B — **제품군 중립 테이블**이다.

---

## 2. 판정 — **공통 승격**

WO 기준: *"OTC 포함 2개 이상 제품군에서 사용 **또는 향후 공통 설명서 디자인 계약으로 사용** → common 승격"* / *"특별한 HFF 전용 근거가 없다면 공통 승격"*.

| # | 근거 | 판정 방향 |
|---|---|---|
| 1 | 정의(코드)가 **제품군 중립** — 이름·토큰·variant 어디에도 HFF 없음 (§1-1) | 공통 |
| 2 | 소비 표면이 **제품군을 가리지 않음** (§1-5) | 공통 |
| 3 | 저장 테이블이 제품군 중립 (`shared_product_descriptions`) | 공통 |
| 4 | **OTC 디자인 GUIDE(2026-07-15)가 이미 의존** → 2번째 제품군 진입, 복사본 발생 (§1-2) | 공통 |
| 5 | 제품군별 재정의·예외 **0** (§1-1, §1-4) | 공통 |
| 6 | 저자 산출물이 현재 HFF 뿐 (§1-3) | HFF 유지(유일한 반대 근거) |

**결론: 승격.** 근거 6은 **"HFF만 쓴다"가 아니라 "HFF가 먼저 썼다"**는 사실일 뿐이다. 계약의 성질(1·2·3)도, 실제 2번째 소비자(4)도 이미 공통이다. **HFF 전용 근거는 하나도 발견되지 않았다.**

### 2-1. 공통 vs HFF 전용 분리

| 항목 | 귀속 | 이유 |
|---|---|---|
| `sd-*` 어휘·구조 | **공통** | 제품군 무관 |
| `<style>`·인라인 style·임의 class 금지 | **공통** | sanitizer·렌더러 동작 |
| 반응형 = 렌더러(`@container`) 담당 | **공통** | 렌더러 동작 |
| `sd-theme-*` **메커니즘** | **공통** | 렌더러 기능 |
| `sd-core` 다단 빈 칸 **현상** | **공통** | 계약의 성질. 대응은 제품군 결정 |
| `sd-theme-*` **카테고리 배정**(홍삼=red, 유산균=green) | **HFF** | HFF 카테고리 관습 |
| 빈 칸에 대한 **"그대로 둔다" 결정** | **HFF** | HFF 표면 특성 기반 판단 |
| 10단 랜딩 구조 · 번호·라벨 금지(HFF-R07) | **HFF** | 작성 관습 (계약 아님) |
| 반응형 실측 근거(REVIEW-V1 §3-1) | **HFF** | HFF 파일럿 실측 |

---

## 3. 적용 내역

| # | 문서 | 변경 |
|---|---|---|
| 1 | `guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md` | **신규** — 계약 SSOT (V1). 내용은 기존 계약 그대로, 신규 규칙 0 |
| 2 | `guides/common/CONTENT-RULE-REGISTRY.md` | **CR-020** 등재 (다음 번호 = CR-021) |
| 3 | `guides/common/DOCUMENT-INDEX.md` | 5-a 항목으로 등재 |
| 4 | `guides/products/health-functional-food/AGENT-KICKOFF.md §5` | 계약 전문 **제거 → 링크**. HFF 전용 5건만 잔존 (§2-1) |
| 5 | `guides/OTC-DESCRIPTION-DESIGN-GUIDE.md` (V0.2 → **V0.3**) | §1·§2 계약 복사본 **제거 → 참조** |
| 6 | 본 CHECK | 신규 |

### 3-1. 위치 선택 근거 (`content-authoring/` vs `common/`)

`common/` 은 현재 **메타 문서**(DOCUMENT-ARCHITECTURE·WORKFLOW·CHECK 표준·Registry)를 담는다. `sd-*` 계약은 **콘텐츠를 어떤 형식으로 쓰는가** = 작성 규칙이므로, [DOCUMENT-INDEX](../guides/common/DOCUMENT-INDEX.md) 5축의 **`content-authoring/`("콘텐츠 유형 공통 작성 원칙")** 에 배치했다. 두 축 모두 전 제품군이 상속하므로 **common-first 원칙은 충족**한다.

---

## 4. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 사용 범위 조사 결과 기록 | ✅ §1 |
| 승격/유지 판단 근거 명시 | ✅ §2 (반대 근거 1건 포함) |
| 공통 승격 시 **SSOT 한 곳만** 유지 | ✅ §5 검증 |
| 문서 버전과 변경 이력 일치 | ✅ §5 검증 (OR-005) |
| 코드 변경 | ✅ **0** |
| DB 작업 | ✅ **0** |

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| 계약 어휘를 **규정으로** 보유한 Guide | **1개** (STORE-DESCRIPTION-CLASS-CONTRACT). HFF `§5`·OTC `§1·§2` 는 링크만 |
| (구분) 예제 HTML 12 · REVIEW-V1 의 `sd-*` 등장 | **계약 복사 아님** — 콘텐츠 인스턴스 / 검수 근거. 정리 대상 아님 |
| 링크 대상 실존 | ✅ 계약·CR·DR·DOCUMENT-ARCHITECTURE·렌더러 WO 전부 확인 |
| CR-020 ↔ SSOT 문서 상호 참조 | ✅ |
| 버전·이력 일치 (OR-005) | ✅ 계약 V1 / OTC GUIDE V0.3 |
| 코드 diff | **없음** (문서만) |

> **미이관 잔여**: 없음. HFF `§5` 잔여 항목은 전부 §2-1 에서 HFF 귀속으로 판정된 것.

---

## 6. 후속 (이번 범위 밖)

- 계약 어휘 자체의 확장(예: OTC **주의사항·금기 전용 class** 부재 — [OTC 디자인 GUIDE §8-A](../guides/OTC-DESCRIPTION-DESIGN-GUIDE.md))은 **문서가 아니라 렌더러 WO**.
- 미전환 소비 표면(태블릿 키오스크 variant 미지정 / 다국어 랜딩 렌더러 미사용 — 같은 문서 §8-B)도 코드 WO.
