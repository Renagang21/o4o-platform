# CHECK-O4O-KPA-STORE-LISTING-SERVICEKEY-CANONICALIZATION-AUDIT-V1

> WO: `WO-O4O-KPA-STORE-LISTING-SERVICEKEY-CANONICALIZATION-AUDIT-V1`
> 성격: **read-only 조사 (수정 없음)**
> 결론: **C — service_key 의미가 혼재되어 구조 분리 필요**
> Date: 2026-07-10

---

## 0. 요약 (결론 먼저)

KPA 매장(네뚜레-약국) 소유 OPL 10건이 `service_key='neture'` 로 저장된 것은 **데이터 오류(A)도, 의도된 origin 구조(B)도 아니다.**

`organization_product_listings.service_key` 값이 **누가 등록했는가(등록 사용자의 membership)** 로부터 파생되는데, **소비 측은 그 값을 매장의 소비 서비스 면(slug service_key)** 으로 해석한다. 두 의미가 한 컬럼에 겹쳐 있어 발생한 **의미 혼재(C)** 이다.

- 등록 경로: `POST /store-product-library/list` (master 기반, offer_id NULL) → `deriveListingServiceKey(req)` → **등록 사용자의 active service_memberships** 기준.
- multi-membership tiebreak 가 **`neture` 최우선** → neture membership 을 함께 보유한 KPA 매장 경영자가 등록하면 결정적으로 `neture` 로 태깅됨.
- 코드 주석 스스로 이를 **"임시 대체 (추후 user context 기반 도출로 교체)"** 라고 명시 → 확정된 의도 구조 아님(B 아님).
- 값이 무작위가 아니라 **결정적 산출** → 단순 데이터 오류 아님(A 아님).

---

## 1. 조사 방법 (read-only)

- 코드: OPL 생성 경로 전수 grep + 등록/파생 로직 정적 분석.
- DB: cloud-sql-proxy(127.0.0.1:15432) → 프로덕션 `o4o-platform-db` / user `o4o_api` / **SELECT only**. write(INSERT/UPDATE/DELETE/DDL) **0**.
- 대상 매장: 네뚜레-약국 org `9c87f46b-57a1-4afe-80bd-60782c49ce96` (slug service_key='kpa').

---

## 2. 확정 사실 (DB)

### 2.1 대상 10건의 성격

| 항목 | 값 |
|------|------|
| 건수 | 10 (전 플랫폼 OPL **전체가 이 10건뿐**) |
| service_key | 전량 `neture` |
| **offer_id** | 전량 **NULL** (master 기반 등록) |
| status | 전량 `pending` (엔티티 default, 유통 잔재 — 의미 없음) |
| is_active | true |
| source_type / requested_by / decided_by | 전량 NULL |
| 생성 시각 | 2026-07-10 03:02 ~ 05:26 |
| 상품 예시 | 리포좀 콜라겐, 맨 파워 포텐, 흑염소 진액 골드 (화장품/건기식) |
| 소유 org slug service_key | `kpa` (네뚜레-약국) |

### 2.2 매장 소유주 membership (핵심 증거)

org owner 2명 모두 **neture membership 을 포함한 multi-membership**:

| user | active service_memberships |
|------|----------------------------|
| `52a4c1e6…` | **kpa-society**, **neture** |
| `6967ebe0…` | glycopharm, k-cosmetics, **kpa-society**, **neture** |

→ `deriveListingServiceKey` 의 `MULTI_MEMBERSHIP_PRIORITY=['neture', …]` 에 의해 **둘 다 `neture` 로 파생**. 가설 실측 확정.

### 2.3 채널 상태

- 이 org: `organization_channels` **0건**, `organization_product_channels` **0건**.
- 전 서비스 TABLET 채널 APPROVED **0건**.

---

## 3. OPL service_key='neture' 생성 코드 경로 (WO 조사항목 1·2)

### 3.1 실제 경로 (이 10건)

`apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts`

- `POST /list` → `masterId` 만 전달(offer 없음) → **master 기반 분기(L269~316)**.
- INSERT(L289~297): `service_key = $4 = listingServiceKey`, `offer_id = NULL`, `ON CONFLICT (organization_id, service_key, master_id) WHERE offer_id IS NULL`.
- `listingServiceKey = deriveListingServiceKey(req)` (L281).

### 3.2 service_key 결정 로직 — `deriveListingServiceKey` (L72~87)

```
값 출처 = req.user.memberships 중 status='active'
매핑(MEMBERSHIP_KEY_TO_LISTING_SERVICE_KEY):
  kpa-society → kpa
  glycopharm  → glycopharm
  neture      → neture
  k-cosmetics → cosmetics
single-membership → 그 값
multi-membership  → MULTI_MEMBERSHIP_PRIORITY=['neture','kpa-society','glycopharm','k-cosmetics'] 최우선 1개
```

- 즉 **매장의 소비 서비스(slug 'kpa')가 아니라 "등록 사용자의 membership"** 이 값을 결정한다.
- 주석(L56~58) 명시: *"기존 하드코딩이 'neture' 였으므로 마이그레이션 안전을 위해 neture 우선 유지. 추후 multi-membership full design 시 user context (URL/header) 기반 도출로 교체."* → **임시 대체 정책**.

### 3.3 OPL.service_key 는 코드 경로마다 **출처가 다르다** (혼재의 직접 증거)

| 경로 | service_key 출처 |
|------|-----------------|
| `store-product-library POST /list` (본건) | **등록 사용자 membership** (`deriveListingServiceKey`) |
| `auto-listing.utils` autoExpand* (offer 승인/신규 org) | **`organization_service_enrollments.service_code`** |
| `autoList*ForOrg` | 호출부가 넘긴 `serviceKey` 파라미터 |
| Backfill migration `20260411200000` | `product_approvals.service_key` |
| 엔티티 default | `'kpa'` |

→ 동일 컬럼에 **최소 3~4가지 서로 다른 의미의 값**이 유입된다. 이것이 C(구조 분리 필요)의 직접 근거.

---

## 4. supplier offer / listing / channel / slug / registry 간 serviceKey 의미 (조사항목 3)

**두 개의 네이밍 도메인이 존재하고, `resolveServiceKeys` 가 소비 시점에만 다리를 놓는다.**

| 레이어 | service_key 값 형식 | 의미 |
|--------|--------------------|------|
| `service_memberships` / registry | `kpa-society`, `k-cosmetics`, `neture`, `glycopharm`, `platform` | 사용자 자격/서비스 가입 |
| `platform_store_slugs` (소비 slug) | `kpa`, `glycopharm`, `cosmetics` | 매장 **공개 소비 면** |
| `organization_product_listings` | `kpa`, `cosmetics`, `neture`, `glycopharm` | (본건) 등록자 membership 파생 / (auto) enrollment |
| 소비 브리지 | `resolveServiceKeys('kpa')=['kpa','kpa-society']` | slug↔membership 형식 차 보정 |

- membership 형식(`kpa-society`)과 listing/slug 형식(`kpa`)이 다르며 `MEMBERSHIP_KEY_TO_LISTING_SERVICE_KEY` 로 매핑.
- **문제는 형식 차가 아니라 "축" 이 다르다는 것**: listing 은 *등록자 origin* 축, slug 은 *소비 면* 축. neture 는 origin 축에서는 유효(공급/운영 origin)하지만 소비 면 축에는 대응 slug 가 없다.

---

## 5. KPA 공개 조회가 neture OPL 을 포함해야 하는가 (조사항목 4)

**현재 구조에서는 "포함/제외" 판단이 성립하기 전에 축부터 정해야 한다.**

- 이 10건은 **KPA 매장 경영자가 자기 KPA 매장을 위해 등록**한 상품 → 의미상으로는 KPA 매장 면에 속해야 자연스럽다.
- 그러나 공개 supplier 조회(B2C `queryVisibleProducts` / tablet `queryTabletVisibleProducts`)는 **`INNER JOIN … ON opl.offer_id = spo.id`** 라 **offer_id NULL 인 이 10건을 service_key 와 무관하게 이미 전량 제외**한다.
- 게다가 채널 0건이라 4중 게이트(opc/oc APPROVED)에서도 제외된다.
- 반대로 소유주 관리뷰(`GET /store-product-library/` "내 매장 진열 목록")는 **organization_id 만** 필터(service_key 무필터) → 소유주에게는 정상 노출된다(그래서 관리 가능).

→ 결론: **지금 당장의 공개 노출 영향은 없다**(offer_id NULL + 채널 0 이 우선 차단). service_key='neture' 는 *잠재적* 의미 불일치이며, 만약 master 기반 OPL 을 slug service_key 로 공개 노출하는 경로가 생기면 그때 이 태그가 매장 면에서 상품을 숨긴다. "neture=origin 인가 소비 서비스인가" 가 먼저 확정되어야 포함 여부를 정의할 수 있다.

---

## 6. TABLET 채널 승인 부재와의 관계 (조사항목 5)

**직교(독립) 문제다.** 이 10건이 공개 태블릿/스토어에 안 뜨는 사유는 3중이며 각각 독립:

1. `offer_id IS NULL` → supplier 쿼리의 offer INNER JOIN 실패
2. `organization_product_channels` 0건 → opc INNER JOIN 실패
3. `organization_channels` (TABLET/B2C) APPROVED 0건 → oc INNER JOIN 실패

→ service_key 를 'kpa' 로 바꿔도 위 3중 때문에 안 뜬다. 반대로 채널을 승인해도 offer_id NULL 이면 안 뜬다. **serviceKey 이슈와 TABLET 승인 부재는 서로 다른 층위**이며, 어느 하나만 고쳐도 positive-path 는 성립하지 않는다.

---

## 7. 결론: A / B / C

### ✅ C — service_key 의미가 혼재되어 구조 분리가 필요

근거:
1. OPL.service_key 값이 **등록자 membership 축**(derive)에서 나오는데 소비 측은 **매장 소비 면 축**(slug)으로 해석 → 축 불일치.
2. 동일 컬럼에 **derive / enrollment.service_code / 호출 파라미터 / backfill migration 등 3~4가지 출처**가 유입 → 단일 의미 컬럼 아님.
3. 값이 결정적으로 산출됨(multi-membership neture-priority 실측 확정) → 단순 오류(A) 아님.
4. 코드 주석이 **명시적으로 임시 대체**임을 선언, 소비 면과 모순되는 값을 냄 → 의도된 최종 구조(B) 아님.

### A 아닌 이유
데이터가 우연히 잘못 들어간 게 아니라, derive 로직 + owner 의 실제 multi-membership 이 만나 **재현 가능하게** 'neture' 를 만든다.

### B 아닌 이유
"neture origin listing 이 의도된 구조" 라면 소비 면(slug 'kpa')과의 연결 규칙이 있어야 하는데 없다. 오히려 코드가 스스로 "추후 user context 기반으로 교체" 라 명시.

---

## 8. 하지 않은 것 (WO 금지 준수)

- OPL service_key 수정 ❌ / alias helper 수정 ❌ / TABLET approval 생성 ❌
- 운영 DB write ❌ / 테스트 데이터 생성 ❌ / API 동작 변경 ❌
- 전부 read-only(SELECT) + 정적 분석만 수행. **DB write 0.**

---

## 9. 후속 WO 후보 (제안만 — 이번 범위 밖)

1. **`WO-O4O-STORE-LISTING-SERVICEKEY-AXIS-SEPARATION-DESIGN-V1`** (설계 WO)
   - OPL.service_key 를 "소비 면(store/slug context)" 기준으로 도출하도록 재설계.
   - `deriveListingServiceKey` 의 membership-priority 임시 정책을 store service context 기반으로 교체(주석이 예고한 방향).
   - origin(공급/운영, neture 포함)을 보존해야 하면 **별도 컬럼(예: `origin_service_key` / `listing_origin`)** 으로 축 분리.
2. **`WO-O4O-OPL-SERVICEKEY-SOURCE-UNIFY-AUDIT-V1`**
   - derive / enrollment.service_code / backfill 등 다중 출처를 하나의 canonical 규칙으로 수렴. 기존 10건 재태깅 정책(마이그레이션) 판단.
3. (참고) TABLET/B2C 채널 승인 흐름 점검 — 별개 층위(§6). supplier positive-path 성립 조건 정리.

> **주의**: 위 1·2 는 `resolveServiceKeys` alias, distribution/commerce 경계, RBAC membership 정책과 얽히므로 Shared Module Change Protocol 대상. 반드시 소비처 전수(admin/operator/store/tablet/B2C) 영향 확인 후 착수.

---

*KPA 매장 OPL service_key='neture' 근본원인=deriveListingServiceKey 가 등록자 multi-membership(neture 최우선)에서 파생 · 소비 측은 slug('kpa') 기준 · 축 혼재 → 결론 C · 현 공개영향 없음(offer_id NULL+채널0 우선차단) · DB write 0 · 후속 설계 WO 2종 제안.*
