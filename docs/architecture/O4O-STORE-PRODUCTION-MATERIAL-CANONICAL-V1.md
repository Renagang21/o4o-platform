# O4O Store Production Material — Canonical Definition

> **WO-O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-DOCUMENTATION-V1**
> **Date: 2026-05-09**
> **Status: Active (logical canonical only — physical rename 미확정)**

---

## 0. 이 문서의 목적

O4O 공통 Store capability 관점에서 **"Store Production Material"** 이라는 logical canonical 개념을 정의하고,
현재 physical implementation 인 `kpa_store_contents` table 을 **legacy physical name** 으로 명시 관리한다.

본 문서는 다음을 방지/제공하기 위해 작성되었다.

- 성급한 rename 제안 방지
- logical canonical 과 physical implementation 의 분리 원칙 제공
- AI / Codex / Claude Code 작업 시 우선 참조 기준 제공
- 반복적인 rename 논쟁 방지

> **본 문서는 개념 canonical 만 다룬다. table / entity / migration / API path / controller rename 은 본 문서의 범위가 아니다.**
> 관련 정적 조사는 [`IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1`](../archive/investigations/IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1.md) 참조.

---

## 1. 핵심 정책 선언

```text
logical canonical:        Store Production Material
current physical table:   kpa_store_contents
status:                   legacy physical table name
```

이 선언이 의미하는 바:

- **현재 table / entity rename 은 수행하지 않는다.**
- 기능 재사용은 유지한다 (KPA / GlycoPharm / K-Cosmetics 3 서비스 공통 사용 중).
- canonical 개념만 공통화한다 — DB / 코드 식별자는 기존 그대로 둔다.
- `kpa_store_contents` 라는 prefix 만 보고 KPA 전용 구조로 해석하지 않는다.

---

## 2. Store Production Material 이란

**Store Production Material** 은 매장(Store)이 자기 손으로 가공·작성하여 보관하는 *결과물 직전 단계의 가공된 자료* 다.

### 2.1 의미 분해

| 어휘 | 뜻 |
|------|-----|
| **Store** | 매장(약국 / 화장품 매장 등) — `organization_id` 단위 |
| **Production** | 매장이 *제작*한다는 행위 — 단순 수집/재공유가 아니라 *가공/편집/생성* |
| **Material** | 다음 단계 결과물(POP / QR / Blog / 상품설명 등)이 가져다 쓰는 *재료* — 결과물 그 자체가 아님 |

### 2.2 포함되는 자료 예시

- POP 제작용 원본
- QR 제작용 원본
- 블로그 제작용 원본
- 상품 상세설명 제작용 원본
- AI 정리 결과 (`product_ai_content` 등 AI pipeline 출력 중 매장에 귀속되는 것)
- 직접 작성된 자료 (`source_type='direct'`)
- 커뮤니티/허브 콘텐츠를 매장이 가져와서 편집한 결과 (`source_type='snapshot_edit'`)

### 2.3 포함되지 *않는* 것

| 분류 | 예시 | 이유 |
|------|------|-----|
| 외부 입력 raw asset | 자료함 파일 (`store_library_items`), 가져온 snapshot 원본 (`o4o_asset_snapshots`) | 가공되지 않은 *원천 자료* — Material 의 *입력* 일 뿐 |
| 결과물 | 발행된 POP, QR 코드, 블로그 글, 상품 상세 페이지 | 결과물(`store_execution_assets` 류)이며 Material 이 *출처* 가 됨 |
| 커뮤니티 콘텐츠 | `forum_post`, `kpa_contents` | 별도 도메인 (커뮤니티 / Hub) — 매장 귀속이 아님 |
| LMS Template-copy | `packages/interactive-content-core` 의 `StoreContent` (table `store_contents`) | LMS Template → Store 복제 흐름의 별도 도메인 — 본 canonical 과 무관 |

---

## 3. Canonical 흐름

```text
[입력 — 가공되지 않은 원천]
 ├─ 가져온 콘텐츠 (snapshot)              ← o4o_asset_snapshots
 ├─ 가져온 강의 (lesson reference)
 ├─ 매장 자료 (file / external link)      ← store_library_items
 └─ 직접 입력 (direct content)
        │
        ▼
[편집 / AI 정리]
 ├─ snapshot 편집  (source_type = 'snapshot_edit')
 ├─ direct 작성   (source_type = 'direct')
 └─ AI 정리      (product_ai_content 등)
        │
        ▼
[Store Production Material]               ← 본 canonical 개념
 (현재 physical: kpa_store_contents)
        │
        ▼
[사용처 결과물 생성]
 ├─ POP / QR / 블로그 / 상품 상세설명 ...
        │
        ▼
[결과물 → Material reference]
 (결과물이 source 로서의 Material 을 참조)
```

흐름 해석:

- Material 은 **편집 직후, 결과물 생성 직전** 의 단계.
- 결과물(POP/QR/Blog/상품설명)은 Material 을 *source* 로 참조한다 (참조 컬럼 추가는 후속 WO 후보).
- 같은 매장이 같은 source 로 여러 결과물을 만들 수 있다 — Material 은 1:N 관계의 *왼쪽* 에 위치.

---

## 4. Logical canonical vs Physical implementation

본 문서가 **가장 강조하는** 분리 원칙.

| 층 | 식별자 | 비고 |
|----|-------|-----|
| **Logical canonical** | `Store Production Material` | service-neutral, 공통 Store capability 어휘 |
| **Physical entity (TS)** | `KpaStoreContent` | 현재 코드 식별자 — 변경하지 않음 |
| **Physical table (PG)** | `kpa_store_contents` | 현재 DB 식별자 — 변경하지 않음 |
| **Physical controller** | `createStoreContentController` (`o4o-store/controllers/store-content.controller.ts`) | 이미 KPA prefix 없음 — 공통 컨트롤러 |
| **External API path** | `/api/v1/{service}/store-contents` | 외부 호환 — 변경하지 않음 |

> **logical 과 physical 을 혼동하지 말 것.**
> 이 분리가 깨지면 (1) 운영자/신규 개발자가 KPA 전용 구조로 오해하거나,
> (2) 단순 prefix 제거를 시도하다가 LMS 도메인의 별도 `store_contents` table 과 이름 충돌하는 사고가 발생한다.

---

## 5. Legacy physical name 선언

```text
kpa_store_contents 는 현재 legacy physical table name 으로 간주한다.
```

선언의 함의:

- **사실관계** — 컨트롤러(`createStoreContentController`) 가 KPA / GlycoPharm / Cosmetics 3 서비스에 공통 마운트되어 동일 table 을 공유하고 있다. 컨트롤러 / 라우트 / 디렉토리 수준의 공통화는 이미 완성되어 있다.
- **해석 규칙** — table 이름의 `kpa_` prefix 는 *역사적 잔존* 이며, 현재 의미는 service-neutral 이다.
- **금지 행위** —
  - 본 table 을 KPA 전용 구조로 가정한 신규 코드 작성 금지.
  - prefix 만 근거로 한 단순 rename 제안 금지 (충돌 위험 — §6 참조).
  - 본 canonical 을 우회한 별도 KPA 전용 table 신설 금지 — 공통 capability 는 이미 본 entity 가 담당.
- **rename 우선순위** — 장기 후보로 인지하되, 현 시점에는 *안정성 우선*. rename 은 별도 WO 승인 후에만.

---

## 6. Rename 정책

### 6.1 정적 조사 결과 (요약)

[`IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1`](../archive/investigations/IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1.md) 의 핵심 사실:

| 항목 | 결과 |
|------|------|
| `store_contents` 단순 prefix 제거 | **충돌** — `packages/interactive-content-core` 의 LMS Template-copy entity (`@Entity('store_contents')`) 가 이미 점유 중 |
| 공통 컨트롤러 공유 서비스 | 3개 (KPA / GlycoPharm / Cosmetics) |
| FK 참조 | **0건** |
| seed 데이터 | **0건** |
| Raw SQL 직접 참조 | 2 군데 (`asset-render-filter.ts:120`, `published-assets.controller.ts:123`) |
| 외부 API path 변경 필요 | 없음 |
| 권장 옵션 (IR 결론) | Option 2 — code rename 먼저, table rename 은 2단계 |

### 6.2 현재 정책

```text
현 시점에는 rename 보다 안정성 우선.
table / entity / API / controller / frontend 식별자 모두 그대로 유지한다.
```

근거:

- Cloud Run dual-execution 마이그레이션 윈도우의 short-term 위험 존재.
- `share_*` legacy 컬럼 cleanup 등 인접 부채와 분리 진행이 안전.
- 기능적 공통화는 이미 완료되어 있어 rename 의 *기능적 이득* 은 제한적.

### 6.3 향후 rename 후보 (확정 아님)

```text
store_production_materials
```

단:

- **현재는 canonical 이름일 뿐**, 실제 table rename 계획이 확정된 것은 아니다.
- 향후 rename WO 가 별도 승인되어야 비로소 후보 → 결정으로 격상된다.
- 후보 이름이 다른 도메인의 table / entity / API path 와 충돌하지 않는지 재검증을 요한다.

### 6.4 rename 제안 시 절차

본 canonical 문서를 거치지 않은 rename 제안은 reject 사유가 된다. 제안 시:

1. 본 문서의 §4 (logical vs physical 분리) 를 우선 인용.
2. IR `RENAME-AUDIT-V1` 의 사용처 inventory / 충돌 분석을 갱신 또는 재검증.
3. dual-execution 윈도우 처리 전략을 명시.
4. 인접 cleanup (`share_*` 컬럼, KPA-hardcoded guard) 과 *분리* 한 단일-책임 WO 로 제안.

---

## 7. 현재 재사용 구조

본 entity / table 은 이미 다음 서비스에서 공통 사용 중이다.

| Service | Mount path | 컨트롤러 | 사용 형태 |
|---------|------------|---------|----------|
| KPA | `/api/v1/kpa/store-contents` | `createStoreContentController` | full read/write |
| GlycoPharm | `/api/v1/glycopharm/store-contents` | `createStoreContentController` | full read/write |
| K-Cosmetics | `/api/v1/cosmetics/store-contents` | `createStoreContentController` | full read/write |
| Neture | (미마운트) | — | — |

서비스 분리 메커니즘:

- **organization_id** — 모든 query 의 필수 조건. 이를 통해 매장 단위로 격리.
- **mount path** — 컨트롤러는 service-agnostic 이며, 라우트 마운트 경로가 service 를 구분.
- **serviceKey 컬럼은 본 entity 에 없음** — 현 시점 분리 메커니즘으로 충분. cross-service 통계 등의 요구가 발생하면 그때 컬럼화 검토.

> 컨트롤러 내부에 `isStoreOwner(dataSource, userId, 'kpa')` 등 KPA-hardcoded guard 가 잔존하는 것은 별도 부채이며 본 canonical 의 책임 범위 밖이다. 후속 WO 후보 — `WO-O4O-STORE-CONTENT-CONTROLLER-SERVICE-AGNOSTIC-V1`.

---

## 8. 주의사항 (작업자 / AI 공통)

다음 원칙을 위반하지 말 것.

1. **`/store` 는 공통 capability** — 특정 서비스 전용으로 해석하지 않는다.
2. **`kpa_` prefix 만 보고 KPA 전용 구조로 판단 금지** — 컨트롤러 / 라우트 / 디렉토리 수준에서 이미 공통화되어 있다.
3. **rename 제안 시 본 canonical 문서를 우선 참조** — IR 만 보고 곧장 코드를 수정하지 않는다.
4. **logical canonical 과 physical table 을 혼동하지 말 것** — 코드 / 주석 / 신규 entity 작성 시 둘을 명확히 구분.
5. **본 entity 와 LMS Template-copy `store_contents` 는 별개** — `packages/interactive-content-core` 의 `StoreContent` / `/api/v1/lms/store-contents` 는 본 canonical 과 무관한 도메인.
6. **별도 KPA 전용 table 신설 금지** — 공통 Store Production Material capability 는 본 entity 가 담당. 새로운 매장 제작 자료 유형은 `content_json` jsonb 흡수 또는 `source_type` 확장으로 처리.

---

## 9. 후속 WO 후보 (참고, 본 WO 범위 외)

본 문서가 *trigger* 가 되어 향후 검토 가능한 WO 후보들. 현 시점 확정 아님.

| WO 후보 | 단계 | 의존 |
|---------|:----:|------|
| `WO-O4O-STORE-CONTENT-PRODUCTION-MATERIAL-CODE-RENAME-V1` | (장기) | 본 canonical 인지 정착 후 |
| `WO-O4O-STORE-CONTENT-PRODUCTION-MATERIAL-TABLE-RENAME-V1` | (장기) | code rename 머지 후 |
| `WO-O4O-STORE-CONTENT-LEGACY-SHARE-COLUMNS-CLEANUP-V1` | (독립) | — |
| `WO-O4O-STORE-CONTENT-CONTROLLER-SERVICE-AGNOSTIC-V1` | (독립) | KPA-hardcoded guard 제거 |
| `WO-O4O-STORE-CONTENT-SOURCE-MATERIAL-REFERENCE-V1` | (독립) | 결과물 → Material reference 컬럼 추가 |

---

## 관련 문서

| 영역 | 문서 |
|------|------|
| Store Layer 구조 | [`docs/architecture/STORE-LAYER-ARCHITECTURE.md`](./STORE-LAYER-ARCHITECTURE.md) |
| O4O Store/Order 규칙 | [`docs/architecture/O4O-STORE-RULES.md`](./O4O-STORE-RULES.md) |
| Boundary Policy | [`docs/architecture/O4O-BOUNDARY-POLICY-V1.md`](./O4O-BOUNDARY-POLICY-V1.md) |
| Capability 조사 (자매 IR) | [`docs/archive/investigations/IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1.md`](../archive/investigations/IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1.md) |
| Rename 정적 조사 (자매 IR) | [`docs/archive/investigations/IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1.md`](../archive/investigations/IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1.md) |
| Execution Content Asset Policy | [`docs/archive/investigations/IR-O4O-STORE-EXECUTION-CONTENT-ASSET-POLICY-V1.md`](../archive/investigations/IR-O4O-STORE-EXECUTION-CONTENT-ASSET-POLICY-V1.md) |
| Store Library canonical | [`docs/archive/investigations/IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1.md`](../archive/investigations/IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1.md) |
| Community → Store copy flow | [`docs/archive/investigations/IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1.md`](../archive/investigations/IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1.md) |

---

*Updated: 2026-05-09*
*Version: 1.0*
*Status: Active (logical canonical only)*
