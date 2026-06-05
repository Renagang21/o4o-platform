# IR-KPA-STORE-ASSET-DERIVATION-BLOG-SOURCE-CONTRACT-V1

> **조사 전용 (read-only).** 코드/API/DB/UI/migration 수정 없음. KPA 블로그 작성 흐름에서 원본(source)을 어떻게 전달해 `store_asset_derivations`에 `blog_post` 관계를 기록할지 **contract와 boundary 정합성**을 확정한다.

- **작성일**: 2026-06-05
- **작업 유형**: Investigation (IR) — contract 설계 판단
- **선행**: `WO-KPA-STORE-ASSET-DERIVATION-TABLE-V1`(`966062aa1`) · `WO-KPA-STORE-ASSET-DERIVATION-QR-BLOG-WRITEPATH-V1`(`ad57cdbd0`, QR 연결·블로그 deferral)
- **원칙**: `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md` (공통 모듈 변경 시 소비처 영향 매트릭스)

---

## 1. 목적 / 배경

QR relation write-path는 `libraryItemId`라는 명확한 source로 연결 완료. **블로그는** create body에 source 필드가 없고, boundary(`store_id`/`pharmacy.id` vs derivation `organization_id`)의 정합이 불확실해 직전 WO에서 **deferral**되었다. 본 IR은 두 blocker를 실측으로 해소하고 구현 가능 여부를 확정한다.

---

## 2. 핵심 결론

| 항목 | 결과 |
|------|------|
| **boundary 정합성** | ✅ **일치** — blog `store_id` = `OrganizationStore.id` = `organizations.id` = derivation/read `organization_id` |
| **source 전달 경로** | ✅ **canonical 경로 존재** — `location.state.production.source.items[]`(id/title/origin)를 블로그 페이지가 이미 수신 |
| **구현 가능 여부** | ✅ **가능** — optional `sourceItems` contract + 프론트 forwarding. migration/저장소 통합 없음 |
| **GP/KCos 영향** | 없음(additive optional, service_key 격리) — §6 매트릭스 |

→ **블로그 relation write-path는 안전하게 구현 가능.** 후속 WO 착수 조건 충족.

---

## 3. Boundary 정합성 (실측)

직전 WO의 deferral 사유였던 "blog boundary가 derivation organization_id와 다를 수 있다"는 **해소된다**.

```text
blog.controller resolvePharmacy(slug):
  slugService.findBySlug(slug) → record.storeId
  orgRepo.findOne(OrganizationStore, { id: record.storeId })   → pharmacy
  blog post.storeId = pharmacy.id

OrganizationStore 엔티티:  @Entity('organizations')   ← 테이블 = organizations
  → pharmacy.id = organizations.id

store-owner.utils isStoreOwner():
  organization_members.organization_id  (→ organizations.id FK)
  → requireStoreOwner 가 set 하는 req.organizationId = organizations.id

derivation read endpoint(GET /store/asset-derivations) 및 POP/QR write-path:
  organization_id = req.organizationId = organizations.id
```

**∴ blog `store_id` == derivation `organization_id` == `organizations.id`.** 동일 owner의 매장 데이터는 같은 org id를 공유하므로, `organization_id = pharmacy.id`로 기록한 blog derivation은 read endpoint(req.organizationId)에서 **정상 조회된다.**

> 근거: `apps/api-server/src/modules/store-core/entities/organization-store.entity.ts:26` `@Entity('organizations')`, `blog.controller.ts:77-81` resolvePharmacy, `utils/store-owner.utils.ts:92-99` organization_members.organization_id.

---

## 4. Source 전달 경로 (실측)

블로그 작성 진입은 **두 가지 shape**가 공존한다.

| 진입 | navigate state shape | 블로그 페이지 수신 | source 활용 |
|------|----------------------|:------------------:|-------------|
| **(canonical) 내 자료함 → 제작 시작 → 블로그** | `state.production.source.items[]` (각 `{id, title, description, origin}`) | ✅ **수신**(`PharmacyBlogPage.tsx:155-163`) | 에디터 prefill(description/starterHtml) — **create 시 id 미보존** |
| **(Phase 1) 매장 제작 자료 row → 블로그 글쓰기** | `state.source.{kind:'production-material', itemId, title, purpose}` | ❌ 미수신(다른 shape) | 없음 |
| **(일반) 내 자료함 콘텐츠 quick "블로그 글쓰기"** | state 없음(`navigate(c.to)`) | — | 없음(일반 진입) |

핵심:
- **canonical 경로의 `production.source.items[].origin`** 은 POP write-path와 **동일 origin 어휘**(`library` / `snapshot` / `direct`)를 갖는다 → derivation `source_kind` 매핑 재사용 가능.
- 단, 블로그 페이지는 이 items를 **에디터 prefill에만 쓰고 create 호출에 전달하지 않는다.** `createBlogPost` client body = `{title, content, excerpt, slug}` 뿐.

> 근거: `PharmacyBlogPage.tsx:155-163`(`state.production.source.items`), `StoreLibraryContentsPage.tsx:145`(quick `navigate(c.to)` 무state), `StoreProductionMaterialsPage.tsx:271`(`state.source` Phase1 shape), `api/blogStaff.ts:60-66`(create body).

---

## 5. Source Contract 권장안

### 5.1 백엔드 (blog create, service-neutral)
`POST /stores/:slug/blog/staff` body에 **optional `sourceItems`** 추가:
```ts
sourceItems?: { kind: string; id: string; title?: string }[]
```
- 생성 성공(`blogRepo.save`) 후, `sourceItems`가 있으면 best-effort `recordDerivations({ serviceKey, organizationId: pharmacy.id, derivedKind:'blog_post', derivedId: saved.id, derivedTitle: saved.title, sources: sourceItems })`.
- 없으면 기존 동작 그대로(관계 미기록). **back-compat 100%**.
- `kind`는 derivation `source_kind` 화이트리스트로 검증(서비스가 이미 검증 — invalid skip).

### 5.2 프론트 (PharmacyBlogPage)
- canonical 진입 시 받은 `production.source.items`를 **state로 보존**.
- 해당 draft의 **최초 create 호출**에만 `sourceItems` 포함:
  ```ts
  sourceItems = items.map(i => ({ kind: originToKind(i.origin), id: i.id, title: i.title }))
  // origin→kind: snapshot→content_snapshot, direct→content_direct, library→store_execution_asset
  ```
- `createBlogPost` client body에 optional `sourceItems` 추가.
- update/publish/archive/delete에는 미포함(생성 시점 1회만).

### 5.3 Phase 1 production-materials "블로그 글쓰기" 정합(권장)
- 현재 `state.source.{kind:'production-material',itemId}` shape는 블로그 페이지가 무시 → source 전달 안 됨.
- **권장**: Phase 1 production-materials의 블로그 진입을 **canonical `production.source.items` shape로 정렬**(또는 블로그 페이지가 `state.source`도 함께 읽도록). WRITEPATH WO에서 소규모 처리.
- 일반 콘텐츠 quick "블로그 글쓰기"(state 없음)는 source 없이 일반 작성 — 그대로 유지(억지 연결 금지).

### 5.4 origin → source_kind 매핑 (POP과 동일 기준)
| production item origin | derivation source_kind |
|------------------------|------------------------|
| `snapshot` | `content_snapshot` |
| `direct` | `content_direct` |
| `library` | `store_execution_asset` |

---

## 6. Consumer Impact Matrix (Shared Module 규칙)

`blog.controller.ts` 는 **serviceKey 파라미터로 다서비스 공유**(KPA `kpa`, GlycoPharm `glycopharm` 기본). `store_asset_derivations`/`recordDerivations`도 공통.

| 소비처 | blog.controller 사용 | optional `sourceItems` 추가 영향 | 비고 |
|--------|:--------------------:|----------------------------------|------|
| **KPA-Society** | ✅ (`kpa`) | 본 작업 대상(프론트 forwarding 추가) | service_key='kpa' |
| **GlycoPharm** | ✅ (`glycopharm`) | **없음** — optional, 미전달 시 기존 동작. 프론트 미연동 | 추후 동일 패턴 확장 가능 |
| **K-Cosmetics** | △ blog 사용 여부 확인 | **없음**(미전달) | 매장 블로그 사용 시에도 additive |
| **Neture** | 미사용 | 없음 | 매장 블로그 비대상 |
| derivation read endpoint | 공통 | blog_post 조회 가능(boundary 일치) | org 격리 동일 |

→ **공통 컨트롤러 변경이지만 additive/optional + service_key 격리**로 GP/KCos 무영향. WRITEPATH WO의 CHECK 문서에 본 매트릭스 재확인 필수.

---

## 7. 구현 가능/불가 판단

**가능.** 두 blocker(boundary·source 전달) 모두 해소:
- boundary: `organizations.id`로 일치(§3).
- source: canonical `production.source.items` 경로 존재 + origin 어휘 재사용(§4·§5).
- 변경 범위: 백엔드 blog create optional 필드 + 프론트 forwarding + client 필드 + Phase1 shape 정합. **migration/저장소 통합 없음.**
- 위험: LOW (additive, best-effort, back-compat). 블로그 hard delete 정책 무변경(관계 cleanup은 별도 후속 — relation 잔존 허용).

---

## 8. 후속 WO 초안 — WO-KPA-STORE-ASSET-DERIVATION-BLOG-WRITEPATH-V1

```text
목표: 블로그 최초 작성 시 원본(production.source.items)→blog_post 관계 기록.

범위:
- 백엔드 blog.controller POST /stores/:slug/blog/staff: optional sourceItems 수신 →
  recordDerivations(blog_post, organizationId=pharmacy.id) best-effort.
- 프론트 PharmacyBlogPage: production.source.items 보존 → 최초 create에 sourceItems 전달.
- api/blogStaff.ts createBlogPost: optional sourceItems 필드.
- Phase1 production-materials "블로그 글쓰기"를 canonical production.source.items shape로 정렬(소규모).
- service_key + organization_id 기준. 기존 store_asset_derivations 재사용. 신규 DB/migration 없음.

검증:
- KPA: 제작 시작 → 블로그 작성 → blog_post derivation(source_kind 정확) 기록 확인(API smoke).
- 기존 블로그 작성/수정/발행/삭제(소스 없는 일반 진입 포함) 회귀 없음.
- read endpoint(req.organizationId)로 blog_post relation 조회 정상(boundary 일치).
- GP/KCos blog create 회귀 없음(optional 미전달).

금지: blog hard delete 정책 변경 / 저장소 통합 / GP·KCos 프론트 수정 / migration.
```

이후: **QR/블로그 relation viewer 확장**(POP 전용 "원본 보기"를 derivedKind 파라미터화) → **IR-O4O-STORE-ASSET-DERIVATION-CROSSSERVICE-COMMONIZATION-V1**.

---

## 9. Out of Scope
코드/API/DB/migration/UI 수정 없음. relation write-path 구현·GP/KCos 수정·blog hard delete 정책 변경 없음. StoreSidebar/storeMenuConfig/menuCapabilityMap/HeroBannerSection 무접촉.

---

## 10. Evidence
- boundary: `modules/store-core/entities/organization-store.entity.ts:26`(`@Entity('organizations')`), `routes/o4o-store/controllers/blog.controller.ts:77-86`(resolvePharmacy/verifyOwner), `utils/store-owner.utils.ts:92-99`(organization_members.organization_id)
- source 경로: `services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx:155-163`(`state.production.source.items`), `StoreLibraryContentsPage.tsx:145`, `StoreProductionMaterialsPage.tsx:271`
- create client: `services/web-kpa-society/src/api/blogStaff.ts:60-66`
- derivation: `routes/o4o-store/services/store-asset-derivation.service.ts`(recordDerivations/kinds), `routes/platform/entities/store-asset-derivation.entity.ts`

*조사 전용. 코드/문구/라우트/DB 변경 없음.*
