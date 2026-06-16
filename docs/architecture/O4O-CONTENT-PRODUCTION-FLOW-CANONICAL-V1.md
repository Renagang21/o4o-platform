# O4O Content Production Flow — Canonical V1

> **상태:** Canonical (SSOT) — O4O 콘텐츠 제작 프로세스의 기준 문서.
> **범위:** POP / QR-code / 블로그 / 상품설명 / 사이니지 / 고객 안내문 등 매장 실행 콘텐츠 제작 전반.
> **성격:** 기준 정의 문서. 코드/DB/UI 변경 없음. 후속 제작·정비 WO 는 본 문서를 기준으로 판단한다.
> **자매 문서:** [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) (테이블·경계 정의) — 본 문서는 그 위의 **흐름(flow)** 기준.
> **근거 조사:** [`IR-O4O-CONTENT-PRODUCTION-EDITOR-TO-TARGET-OUTPUT-FLOW-AUDIT-V1`](../investigations/IR-O4O-CONTENT-PRODUCTION-EDITOR-TO-TARGET-OUTPUT-FLOW-AUDIT-V1.md) · 선행 POP/QR IR — 2026-06-16

---

## 0. 본 문서의 위치

이 문서는 "어떤 기능을 어떻게 만드는가"가 아니라, **"콘텐츠 제작이 거쳐야 하는 단계와 저장 모델"**을 고정한다.
POP / QR / 블로그 / 상품설명 / 사이니지 / 고객 안내문의 신규 구현·정비는 모두 본 문서의 6단계와 분리 원칙을 통과해야 한다.

충돌 시 우선순위: `CLAUDE.md` → `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`(테이블) → **본 문서(흐름)** → 대상별 WO.

---

## 1. Canonical 6단계

```text
1. 대상 선택      어떤 실행 콘텐츠를 만들 것인가
                  POP / QR-code / 블로그 / 상품설명 / 사이니지 / 고객 안내문 …

2. 자료 투입      편집기에 무엇을 넣는가
                  직접 작성 · 자료실 자료 · HUB 가져온 콘텐츠 · 상품 정보 · 기존 콘텐츠 · snapshot

3. 편집기 / AI    RichTextEditor · AiContentModal · 직접 수정 · AI 정리

4. 용도별 콘텐츠 저장   재사용·재편집 가능한 콘텐츠로 저장 (대상별 테이블)

5. 템플릿 적용    실사용 산출물을 만들 때 적용하는 양식

6. 실사용 산출물 생성   PDF · QR 이미지/PDF · 게시물 · 상품 상세 · 사이니지 표시물
```

**단계의 방향성:** 4(용도별 콘텐츠) → 6(산출물)은 **단방향**이다. 산출물에서 콘텐츠를 역복원하지 않는다. 재제작은 항상 4(저장된 콘텐츠)에서 다시 시작한다.

---

## 2. 핵심 분리 원칙 (가장 중요)

```text
용도별 콘텐츠와 산출물은 다르다.
```

### 2.1 용도별 콘텐츠 (재사용 대상)

- 사람이 **다시 수정하고 재사용**하는 대상.
- POP용 콘텐츠 · QR용 콘텐츠 · 블로그용 콘텐츠 · 상품설명용 콘텐츠 …
- **대상별 재편집 테이블**에 저장 (`store_pops` / `store_qr_codes` / `store_blog_posts` / `product_ai_contents` / `kpa_store_contents`).
- **최종 양식(템플릿)을 포함할 필요가 없다.** 텍스트·구조 수준으로 보존한다.

### 2.2 산출물 (실사용 결과물)

- 실제 사용되는 최종 결과물.
- PDF · 이미지 · 게시물 · 상품 상세 · 표시물.
- `store_execution_assets` (`sourceType=generated`, `usageType=pop/qr/signage/banner/notice`) 또는 대상별 출력 저장소에 저장.
- **재편집 대상이 아니다** (audit·재사용 표시용). 수정이 필요하면 §2.1 콘텐츠를 고쳐 다시 생성한다.

### 2.3 템플릿

- 재사용 콘텐츠 자체가 **아니라**, **산출물 생성 시점에 적용하는 양식**이다.
- `templateId` 는 **산출물 메타(`store_execution_assets.sourceMetadata`)에만** 저장될 수 있고, **재사용 콘텐츠 테이블에는 저장하지 않는다.**
- AI 생성 시 `systemPromptOverride` / `starterHtml` / `forcedOptions` 로 콘텐츠 작성을 보조할 수 있으나, 이는 **양식 강제가 아니라 작성 가이드**이며 콘텐츠에 영구 결합되지 않는다.

---

## 3. 공통 제작 골격 (현재 구현 — 준수 대상)

3개 서비스(KPA reference · GlycoPharm · K-Cosmetics)가 공유하는 골격이며, 신규 대상은 이 골격을 재사용한다.

| 골격 | 위치 | 역할 | 단계 |
|------|------|------|:--:|
| 대상 선택 진입 | `packages/store-ui-core/src/components/StartProductionModal.tsx` · `ProductionTypeSelectorModal.tsx` | 2-step(대상→템플릿). targets = pop/qr/blog/product-description | ①⑤ |
| Router state 표준 | `@o4o/types/production.ts` (`ProductionRouterState{ source, target, selectedTemplateId }`) | "자료함 → 제작 시작 → 대상" 라우팅 | ①② |
| 공통 편집기/AI | `packages/content-editor/src/components/AiContentModal.tsx` | initialMode = pop/blog/store_qr/title_suggest | ③ |
| RichTextEditor | `@o4o/content-editor` | manual 편집 | ③ |
| 템플릿 레지스트리 | `productionTemplates.ts`(KPA) / `@o4o/types/production-template`(GP·KCos) | seed 템플릿 + systemPromptOverride/starterHtml/forcedOptions | ⑤ |
| 산출물 테이블 | `store-execution-asset.entity.ts` | generated/uploaded 결과물(재편집 대상 아님) | ⑥ |

---

## 4. 저장 위치 기준 (대상별)

| 대상 | ④ 용도별 콘텐츠 (재편집) | ⑥ 산출물 |
|------|------|------|
| **POP** | `store_pops` (author_role='store') | `store_execution_assets` (`usage_type='pop'`) — PDF |
| **QR** | `store_qr_codes` (콘텐츠+랜딩설정 통합 엔티티) | QR 이미지/PDF on-demand · POP 삽입 QR |
| **블로그** | `store_blog_posts` (콘텐츠=게시물 이중 역할) | 게시글 렌더링 (status=published) |
| **상품설명** | `product_ai_contents` (`product_description`) | **상품 상세 노출 경로 미정의 — 후속 필요** |
| **사이니지** | 별도 패러다임 (`store_playlists`/media 조립, 텍스트 콘텐츠 개념 부재) | `/public/signage` 재생 |
| **고객 안내문** | **부재 — 구현/보류 결정 필요** | 부재 |

> `store_execution_assets` 는 항상 **산출물**이다. 재편집 대상은 위 표의 좌측 대상별 테이블이다 (자매 문서 §8.7 통합 금지 기준과 동일).

---

## 5. POP — Canonical 모범 사례

POP 은 6단계와 분리 원칙을 모두 충족하는 **참조 구현**이다. 신규 대상은 이 흐름을 본뜬다.

```text
운영자 발행
→ HUB 노출
→ 내 약국/내 매장으로 가져오기 (도메인 import = 복사 단절)
→ 사본 관리
→ 편집기 / AI 정리 (AiContentModal initialMode='pop')
→ POP 콘텐츠로 저장          ← store_pops (재사용 콘텐츠)
→ 템플릿 적용 (layout/template, 생성 시점)
→ PDF 생성                   ← store_execution_assets usage_type='pop' (산출물)
→ production-materials 표시
→ 다시 수정 / 재제작 (store_pops 에서 재시작)
```

**모범 포인트:**

```text
store_pops          = 재사용 가능한 POP 콘텐츠 (양식 미포함)
store_execution_assets = PDF 산출물 (재편집 대상 아님)
templateId          = 산출물 메타에만 저장 가능
재사용 콘텐츠에 최종 양식까지 포함할 필요 없음
```

구현 근거: `WO-O4O-POP-SAVE-AS-CONTENT-V1`(콘텐츠 저장) · `WO-O4O-POP-QR-SELECTOR-GP-KCOS-PARITY-V1`(산출물 시점 QR 결합).

---

## 6. 대상별 현재 상태

| 대상 | 상태 | 비고 |
|------|------|------|
| **POP** | ● Canonical 정합 | 모범 사례(§5) |
| **블로그** | ● 대체로 정합 | 콘텐츠=게시물 이중 역할(허용). 템플릿은 렌더 시 적용 |
| **QR** | ◐ 저장 구조 정합 | AI(qr_description)·통계 GP/KCos parity 후속. 단일 엔티티(콘텐츠+설정)는 자연스러움 |
| **상품설명** | ◐ 콘텐츠 저장 O / 산출물 X | ⑥ 상품 상세 노출 경로 미정의. 신규 진입점 자료함 경유만(블로그와 비대칭) |
| **사이니지** | ◐ 별도 패러다임 | 제작 골격 미편입, 편집기/AI/제작 템플릿 부재. canonical 편입 여부 후속 결정 |
| **고객 안내문** | ✗ 부재 | 3서비스 메뉴·페이지·저장·산출물 없음. 구현/보류 결정 필요 (operator `/operator/guide-contents`는 LMS 교육용으로 별개) |

판정(IR): **B(부분 정합) + D(기능별 drift) + E(서비스 drift)**. 최근 POP/QR 작업은 본 철학과 **충돌 없음**.

---

## 7. 후속 작업 판단 기준 (Gate)

콘텐츠 제작 기능의 신규 구현·정비는 아래 질문을 모두 통과해야 한다. 통과 못 하는 단계가 정비 대상이다.

```text
1. 이 기능은 어떤 대상인가?               (① 대상 선택)
2. 입력 자료는 무엇인가?                    (② 자료 투입)
3. 편집기/AI 정리 단계가 있는가?           (③ 편집·AI)
4. 재사용 가능한 용도별 콘텐츠로 저장되는가? (④ 대상별 재편집 테이블)
5. 템플릿은 언제 적용되는가?               (⑤ 산출물 생성 시점이어야 함)
6. 실사용 산출물은 어디에 저장되는가?       (⑥ store_execution_assets 또는 대상별 출력)
7. 서비스 간 parity는 맞는가?              (KPA/GP/KCos)
```

**Drift 신호:**
- 산출물만 저장하고 재사용 콘텐츠가 없다 → §2.1 위반 (C 경향).
- 템플릿이 재사용 콘텐츠에 영구 결합된다 → §2.3 위반.
- 대상마다 저장 모델이 제각각이다 → D(기능별 drift).
- KPA만 있고 GP/KCos에 없다 → E(서비스 drift).

---

## 8. 후속 WO 로드맵 (본 문서 이후)

| 순위 | WO | 범위 |
|:--:|------|------|
| P2 | `WO-O4O-PRODUCT-DESCRIPTION-PRODUCTION-FLOW-AUDIT-V1` | 상품설명 ⑥ 산출물 경로 확정 + 신규 진입점 + derivation parity |
| P2 | `WO-O4O-EDITOR-TO-TARGET-CONTENT-SAVE-STANDARD-V1` | "용도별 콘텐츠 저장" 공통 계약 표준화 (D 해소) |
| P3 | `WO-O4O-SIGNAGE-AND-NOTICE-PRODUCTION-FLOW-AUDIT-V1` | 사이니지 canonical 편입 여부 + 고객 안내문 구현/보류 결정 |
| P3 | `WO-O4O-QR-FLOW-ALIGNMENT-TO-CANONICAL-V1` | QR AI·통계 GP/KCos parity, 템플릿 레지스트리 경로 통일 (E 잔여) |

> POP/블로그는 이미 정합 → 별도 alignment WO 불요(모범 사례로 인용).

---

*Version: 1.0 · Status: Canonical · Date: 2026-06-16 · 6단계 제작 프로세스 + 용도별 콘텐츠↔산출물 분리 + 템플릿=산출물 시점 고정. POP=모범. 근거: IR-O4O-CONTENT-PRODUCTION-EDITOR-TO-TARGET-OUTPUT-FLOW-AUDIT-V1.*
