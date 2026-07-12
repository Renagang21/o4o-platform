# O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT

Status: **BASELINE AMENDMENT** — F12 `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1` 를 개정한다.
Date: 2026-07-09
근거 WO: `WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1` (사업 방향: `Product → Content → QR → Product Landing`)

> ⏩ **후속 개정 (2026-07-12)**: 본 V2 가 전제한 `/p/{key}` **공개 열람**은 `V3-AMENDMENT`([O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT](O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT.md))에서 **로그인 회원 전용 본문 열람**으로 개정되었다(불변식 #3 개정 + #8·#9 신규). 고정 URL·기본 QR 은 그대로 유지. 결정: `ADR-0002`. 본 V2 원문은 보존한다.

> F12 V1 은 절대 기준이 아니며 사업 방향에 맞춰 개정될 수 있다(V1 §4 거버넌스: "구조 변경은 본 Baseline 을 개정하는 명시적 WO 필수"). 본 문서가 그 명시적 개정이다. **V1 의 6 불변식은 유지**하되, 아래 항목만 확장/명확화한다.

---

## 1. 개정 배경

V1 은 공개 진입점을 **Resource 단위 `/r/{resourceId}`**(설명 등 개별 자산)로만 규정했다. 그러나 사업 방향은 **제품 단위 대표 QR → 확장 가능한 Product Landing**(설명·공급자·매장·관련 콘텐츠·관련 제품을 담는 화면)이다. 제품 Landing 은 Resource(설명) 하나에 대응되지 않으므로 **제품 단위 공개 permalink** 가 필요하다.

---

## 2. 개정 내용

### 2.1 Freeze #3 확장 — 제품 단위 permalink 추가

- **유지**: Resource permalink `/r/{resourceId}` (설명 등 개별 Resource 단위).
- **추가**: **Product Landing permalink `/p/{productLandingPublicKey}`** — ProductMaster 당 1개의 안정 공개키(opaque). 제품 단위 대표 진입점.
  - 내부 UUID·barcode 비노출(opaque public_key). 영구·재사용 금지(tombstone=soft delete) — Resource 와 동일 원칙.

### 2.2 Freeze #4 유지·명확화 — QR 이미지 비저장

- **유지**: "QR = 대상 URL 인코딩, **QR 이미지는 비저장·동적생성**." 
- **명확화**: 저장하는 것은 **Product Landing 신원(`product_landings.public_key`)** 이지 QR 이미지가 아니다. 제품 대표 QR = `neture.co.kr/p/{public_key}` 의 동적 인코딩. → **F4 위반 아님**(QR 이미지 자산화 없음).

### 2.3 Freeze #6 유지 — ProductMaster 무FK

- **유지**: ProductMaster 는 Landing/Resource 를 모른다. `product_landings.product_master_id` 는 **Landing → Master 단방향** 참조(master 스키마 무변경). ProductMaster 에 landing_id FK 신설 금지.

### 2.4 신규 계층 표기

- **Product Landing = 계층 1(Product Resource) 옆의 제품 단위 진입/구성 계층**. Resource(설명 등)를 **소비/구성**하되 소유하지 않는다. 매장 실행 자산(계층 2)과 무관(F5 유지).

---

## 3. 불변식 (V2 확정)

| # | 불변식 | 상태 |
|:-:|---|---|
| 1 | DESCRIPTION Resource = `shared_product_descriptions` | V1 유지 |
| 2 | canonical = (master, resourceType, descriptionType) 당 1개 | V1 유지 |
| 3 | Resource permalink `/r/{id}` **+ Product Landing permalink `/p/{key}`** | **확장** |
| 4 | QR 이미지 비저장·동적생성 (저장은 Landing 신원 public_key) | 유지·명확화 |
| 5 | 계층 1(Resource/Landing) ↔ 계층 2(Store Production Material) 분리 | V1 유지 |
| 6 | ProductMaster 는 Resource/Landing 를 모른다(단방향 참조) | V1 유지 |
| **7** | **ProductMaster 당 Product Landing 1개 · 대표 QR 1개** (UNIQUE) | **신규** |

---

## 4. 파생 규칙

- **모든 ProductMaster 는 Product Landing/QR 대상**이다(설명 유무 무관). 설명이 없으면 Landing 이 "상세 설명 준비 중"을 렌더한다 — "설명 없으면 QR 없음"은 **명시적으로 폐기**.
- Landing 노출은 `exposure_state` 게이트(행정처분/회수 등) 통과 시에만.
- **의약품 의료 내용 자동 생성 금지**(V1 상위 규칙·CLAUDE.md) 유지 — Landing 은 컨테이너이며 콘텐츠는 grounding 규칙대로 채운다.

---

## 5. 거버넌스

- 본 V2 확정 후 후속 구현 WO 착수 가능: Product Landing 스키마/라우트(Phase 2) → 전 제품 Landing/QR 발급(Phase 3, dry-run·승인·batchId) → on-create → content-composition → 노출 게이트.
- V1 의 나머지 불변식·2계층 구조는 재설계 대상이 아니다. 본 개정 범위(§2) 외 구조 변경은 다시 명시적 WO 필요.
