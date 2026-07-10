# CHECK-O4O-KPA-TABLET-SUPPLIER-PRODUCT-SERVICEKEY-ALIGNMENT-V1

> WO: `WO-O4O-KPA-TABLET-SUPPLIER-PRODUCT-SERVICEKEY-ALIGNMENT-V1`
> 결과: **PARTIAL DONE** — 코드 정합(alias + ANY) 적용 · positive-path 실증 중단(운영 write 필요) · OPL service_key='neture' 별도 관찰 기록
> Date: 2026-07-10

---

## 1. 요약

KPA 태블릿 공개 supplier 상품 조회(`queryTabletVisibleProducts`)가 `service_key` 를 **단일 비교(`= $2`)** 로 필터하여, slug service_key(`kpa`)와 OPL service_key(`kpa-society`)가 다를 때 상품이 누락될 수 있다는 가설을 조사·정합했다.

- **코드 mismatch 확정**: B2C 형제 쿼리(`queryVisibleProducts`)는 이미 `serviceKeys[]` + `ANY($2::text[])` 인데, TABLET 쿼리만 단일 `= $2` 였다.
- **정합 적용**: TABLET 쿼리를 `resolveServiceKeys` alias 목록 + `ANY($2::text[])` 로 B2C 형제와 동일하게 맞췄다. count/data 양쪽, legacy/configured 양쪽 동일 기준.
- **단, WO 원래 가설(`kpa` vs `kpa-society`)은 현 데이터로 실증 불가**: 운영 DB 에 `kpa-society` OPL 이 0건, TABLET 승인 채널 0건. 현재 supplier=0 의 실제 원인은 **TABLET commerce gate 미통과 + OPL service_key='neture'** 이다.
- positive-path 실증은 OPL/offer/approval write 가 필요 → **WO §11 중단 기준**에 따라 중단.

---

## 2. 조사한 현재 serviceKey 구조 (read-only)

접속: cloud-sql-proxy(127.0.0.1:15432) → 프로덕션 `o4o-platform-db` / user `o4o_api` / SELECT only.

| 항목 | 결과 |
|------|------|
| `platform_store_slugs.service_key` 분포 | `kpa`(9), `glycopharm`(2), `cosmetics`(1). **`kpa-society` slug 없음** |
| `organization_product_listings` 전체 | **10건, 전량 `service_key='neture'`** |
| 위 10건 소유 org | 1곳. 그 org 의 slug service_key = **`kpa`** (네뚜레-약국) |
| `organization_channels` TABLET APPROVED | **0건 (전 서비스)** |
| TABLET 4중 게이트 통과 supplier listing | **0건** (service_key 무관, 채널 승인 자체가 없음) |

### 해석

- WO 가설의 `kpa` vs `kpa-society` mismatch 는 **현 데이터에 kpa-society OPL 자체가 없어 실증 불가**.
- 실제 관찰된 불일치는 오히려 **slug `kpa` vs OPL `neture`** (아래 §7 별도 관찰).
- 현재 KPA 태블릿 supplier 상품이 0인 근본 원인은 serviceKey alias 가 아니라 **① TABLET 채널 미승인 + ② OPL service_key='neture'** 이다. alias 정합(`['kpa','kpa-society']`)만으로는 `neture` OPL 이 매칭되지 않으므로, 이 수정으로 현재 노출 결과는 바뀌지 않는다(no-op on live data).

---

## 3. 실제 mismatch 여부

- **코드 레벨 mismatch: 확정.** TABLET 쿼리만 단일 `= $2`. B2C 형제는 `ANY`. 정책·계약상 `resolveServiceKeys` 가 존재하는 이유(slug↔OPL service_key 불일치 보정)에 비추어 TABLET 도 alias 를 써야 한다.
- **데이터 레벨 mismatch(kpa vs kpa-society): 미실증.** kpa-society OPL 0건.
- 따라서 이번 수정은 **방어적 정합(latent-bug 예방 + 형제 쿼리 일관성)** 성격이다. idle 공통영상 WO(`resolveServiceKeys('kpa')=['kpa','kpa-society']`)와 동일한 성격·패턴.

---

## 4. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` | `queryTabletVisibleProducts` 시그니처 `serviceKey: string` → `serviceKeys: string[]`. count/data 쿼리 `opl.service_key = $2` → `opl.service_key = ANY($2::text[])`. base `params=[pharmacyId, serviceKeys]`. 캐시키 `sk: serviceKeys.slice().sort().join(',')` |
| `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` | 호출부 `resolved.serviceKey` → `resolveServiceKeys(resolved.serviceKey)` (helper 는 기존 import 사용) |

프론트/DB/migration/entity 변경 **0**. 응답 shape(`{ success, ...data, meta, localProducts, tabletDisplaySource, ... }`) 불변.

---

## 5. 적용한 helper / SQL 조건

```ts
// store-public-utils.ts (기존 helper 재사용, 신규 도입 없음)
resolveServiceKeys('kpa')        → ['kpa', 'kpa-society']
resolveServiceKeys('glycopharm') → ['glycopharm']
resolveServiceKeys('neture')     → ['neture']
```

```sql
-- count / data 공통 (legacy · configured 동일)
INNER JOIN organization_product_listings opl
  ON opl.offer_id = spo.id
  AND opl.organization_id = $1
  AND opl.service_key = ANY($2::text[])   -- (was: = $2)
  AND opl.is_active = true
```

---

## 6. count / data param mismatch 방지

이전 WO 에서 count/data params 개수 불일치로 500 이 난 이력이 있어 이번에도 강하게 검증.

- base `params = [pharmacyId, serviceKeys]` (length 2 → `$1`, `$2`). `$2` 를 스칼라→배열로 바꿔도 **params 개수 불변**.
- `ftIdx = params.length + 1` (category/q 조건 push 이후 계산) — `$2` 내용 변경과 무관.
- count: `countParams = configured ? [...params, firstTabletId] : params`. `$${ftIdx}`(cdisp.tablet_id) 참조는 **configured 일 때만**, 파라미터도 그때만 append → 일치.
- data: `dataParams = hasTablet ? [...params, firstTabletId] : params`. `$${ftIdx}`(disp.tablet_id) 참조는 **hasTablet 일 때만**, 파라미터도 그때만 append → 일치.

### DB 레벨 실측 (placeholder ↔ param 개수)

| 쿼리 형태 | 바인드 파라미터 | 결과 |
|-----------|----------------|------|
| legacy count `$1,$2(text[])` | `('9c87...','{kpa,kpa-society}')` | **0** (에러 없음) |
| configured count `$1,$2(text[]),$3(uuid)` | PREPARE `cnt(uuid,text[],uuid)` → EXECUTE | **0** (에러 없음) |
| 단일키 등가 | `ANY('{neture}'::text[])` vs `= 'neture'` | **10 == 10** |

→ params/placeholder mismatch 로 인한 500 재발 없음 확인.

---

## 7. 추가 관찰 (이번 WO 범위 밖 — 미수정)

**OPL service_key='neture' 문제**

- slug service_key 가 `kpa` 인 매장(네뚜레-약국) 소유의 supplier listing 10건이 **모두 `organization_product_listings.service_key='neture'`** 로 저장되어 있다.
- 이 때문에 KPA 매장의 B2C/TABLET 공개 상품 조회에서 `resolveServiceKeys('kpa')=['kpa','kpa-society']` alias 로도 **이 listing 들이 매칭되지 않는다**(neture 미포함).
- 즉 KPA 매장에 supplier 상품이 노출되지 않는 더 근본적 원인 후보이며, alias 정합만으로 해결되지 않는다.
- **이번 WO 에서는 수정하지 않음.** OPL 생성/service_key 결정 로직은 distribution/commerce 경계이며, 수정 시 OPL write + 정책 판단이 필요.

### 후속 WO 후보 (제안만)

1. **`WO-O4O-KPA-STORE-LISTING-SERVICEKEY-CANONICALIZATION-V1`** — KPA 매장 소유 OPL 의 service_key 가 `neture` 로 저장되는 경로 조사. 매장 공개 조회 기준 service_key(`kpa`/`kpa-society`) 와 정합할지, 아니면 조회측이 supplier-origin service_key(`neture`)까지 alias 에 포함해야 할지 정책 결정. (참조: `docs/investigations/IR-O4O-OPL-SERVICEKEY-CROSSSERVICE-CANONICALIZATION-AUDIT-V1.md`)
2. **TABLET 채널 승인 부재** — 전 서비스 TABLET 채널 APPROVED 0건. 태블릿 supplier positive-path 자체가 성립하지 않는 상태. 태블릿 상거래 채널 승인 흐름 점검 필요.

---

## 8. API 검증 결과

배포 전 baseline (프로덕션 public 엔드포인트, 네뚜레-약국 slug, UTF-8 인코딩):

| 엔드포인트 | http | 응답 |
|-----------|------|------|
| `GET /:slug/tablet/products` | **200** | `data:[]`, `meta.total:0`, `localProducts:[]`, `tabletDisplaySource:"legacy_fallback"`, `tabletDisplayTabletId:"f4b12ff9…"` |
| `GET /:slug/tablet/idle` | **200** | — |
| `GET /:slug/tablet/settings` | **200** | — |

- 이 매장은 tablet(f4b12ff9) 은 있으나 visible display 0 → **legacy_fallback 경로**가 실제 실행 경로. 내 DB 테스트의 legacy count(array param)=0 과 일치 → 배포 후에도 동일(빈 응답), 회귀·500 없음 예상.

---

## 9. supplier positive-path 검증 여부

- **미실증(중단).** TABLET 승인 supplier listing 0건 + kpa-society OPL 0건이라 positive-path 데이터가 존재하지 않음.
- 실증하려면 SupplierProductOffer/OPL 생성 + TABLET 채널 APPROVED write 가 필요 → **WO §11 중단 기준** ("supplier positive-path 를 만들려면 OPL/offer/approval 정책 변경이 필요함", "테스트 데이터 생성을 위해 운영 데이터 write 가 필요함") 에 해당.
- 사용자 지시에 따라 **테스트 데이터 생성하지 않음 / 운영 write 없음.**
- 대신 negative-path(빈 응답 200) + DB SQL 레벨 param 정합 + 단일키 등가로 정합성을 확인.

---

## 10. DB write 여부

- **write 0.** SELECT / PREPARE(세션 로컬) / EXECUTE 만 수행. INSERT/UPDATE/DELETE/DDL 없음.

---

## 11. typecheck 결과

- `apps/api-server` `pnpm run type-check` (`tsc --noEmit`): **변경 파일(store-public-utils / store-public-tablet.handler) 에러 0**.
- 잔존 에러는 전부 `src/scripts/drug-otc-*` 배치 스크립트의 중복 선언(`TS2451/TS2393`) — 본 변경과 무관한 사전 존재 이슈(병행 세션 산출물).
- web-kpa-society / GP / KCos: **프론트 파일 무변경**(백엔드 응답 shape 불변)이므로 별도 typecheck 불요. 단일키 서비스는 `resolveServiceKeys(key)=[key]` → `ANY([key])==（= key)` 로 동작 불변(DB 등가 실측 §6).

---

## 12. 배포 / smoke 결과

- 배포: main push → CI/CD 자동 배포 (본 CHECK 커밋 시점 기준 미배포).
- 배포 후 권장 smoke: 위 §8 3개 엔드포인트 200 재확인(빈 응답 유지, 회귀 없음). alias 정합은 현 데이터상 no-op 이므로 결과 동일 예상.

---

## 13. 완료 기준 대비

| 기준 | 상태 |
|------|------|
| KPA 태블릿 supplier 조회가 kpa/kpa-society alias 차이로 누락되지 않음 | ✅ 코드 정합(ANY + resolveServiceKeys). 단 현 데이터엔 kpa-society OPL 부재 |
| local/selected content/다국어/display source alignment 회귀 없음 | ✅ 응답 shape 불변, baseline 200 |
| visible display 제한 + legacy fallback 정상 | ✅ legacy 경로 baseline 200, configured count param 정합 실측 |
| typecheck 통과 | ✅ 변경 파일 에러 0 |
| CHECK 문서 작성 | ✅ 본 문서 |
| positive-path 실증 | ⏸ 중단(운영 write 필요, §9) |
| OPL='neture' | 🔭 별도 관찰·후속 WO 제안(§7), 미수정 |

---

*KPA tablet supplier serviceKey alignment · resolveServiceKeys + ANY($2::text[]) 정합(B2C 형제 일관) · positive-path 실증 중단(운영 write 필요) · OPL service_key='neture' 별도 관찰 → 후속 WO 후보 · DB write 0 · 변경 파일 typecheck 0 · baseline 200.*
