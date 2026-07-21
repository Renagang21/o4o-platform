# CHECK-O4O-SUPPLIER-SCREEN-SET-POLICY-AND-TARGET-SCHEMA-V1

> WO: `WO-O4O-SUPPLIER-SCREEN-SET-POLICY-AND-TARGET-SCHEMA-V1`
> 선행: `CHECK-O4O-SUPPLIER-SCREEN-SET-AUTHORING-AND-HUB-PUBLISH-V1`(HOLD) · `ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1`
> 성격: 정책 정정 + 최소 스키마(게시 대상). **기능 구현·배포 없음** — 후속 `…-AUTHORING-AND-HUB-PUBLISH-V2` 선행 작업.
> Date: 2026-07-21

---

## 0. 결론

공급자 Screen Set 의 매장 HUB 제공을 **정책상 정식 허용**하고, **신규 status 값 없이**(기존 `draft`/`active`/`archived` 재사용) 게시 대상 매장 유형을 담을 `hub_target_store_type` nullable 컬럼 + 무결성 제약을 추가했다. **backfill 0 · 기존 운영자·매장 데이터 무변경 · 기존 status/owner scope 계약 유지.**

## 1. 조사·정정한 정책·ADR·역할 문서 (실행 1·4)

| 문서/코드 | 종전 문구 | 정정 |
|-----------|-----------|------|
| `ADR-O4O-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1.md` §4 Role 표 | `supplier 직접없음` | **`supplier 제한적 Screen Set Producer`** + 허용/금지 범위 명시 |
| 〃 §9 HOLD | `⑤공급자 미발동. H1·H2 확정 전 구현 착수 금지` | **⑤공급자 HOLD 해제**(공급자 트랙 한정). H1·H2 금지는 ①~④·⑥에 **계속 적용** |
| `ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1.md` §2 매트릭스 | supplier 상태 `(후속 정의, 예: supplier_template)` | **`draft`/`active`/`archived`**, `supplier_template` **미도입** |
| 〃 §3 D4 주석 | "supplier 는 후속에서 supplier_template 등 추가 시 status CHECK 확장" | **기존 허용값 재사용·status CHECK 무변경** 확정 |
| 〃 §8 미결 질문 | supplier status 명칭 / supplier_id 참조 정책 미결 | **둘 다 확정**(아래 §4·§9) + `hub_target_store_type` 항목 신설 |
| `IR-O4O-SUPPLIER-LIBRARY-POLICY-V1.md` | "공급자는 O4O 내부 Producer 가 아니다" | **canonical 한정**으로 적용 범위 정정. `/supplier/library` 판정(D+E)은 **그대로 유지**(자료함 재노출 아님) |
| `SupplierSpaceLayout.tsx:117` · `App.tsx:197` 주석 | 동일 문구 | **canonical 한정** 명시 + Screen Set 트랙은 별도 허용(메뉴 부활 아님) |

**전면 변경이 아니라 적용 범위 분리**로 정정했다 — canonical 승격 흐름(공급자→운영자 검수→canonical)은 **그대로 유지**된다.

## 2. 정정한 두 흐름 (실행 4)

```
공급자 상품 설명서 → 운영자 검수 → O4O canonical 설명서      (기존 유지, 변경 없음)
공급자 Screen Set  → 공급자 HUB 게시 → 매장 가져오기 → 매장 독립 사본   (신규 허용, canonical 아님)
```

## 3. 공급자 Producer 역할의 허용·금지

| 허용 | 금지 |
|------|------|
| 자기 상품 + 사용 허용 콘텐츠로 **공급자 소유 Screen Set** 제작 | O4O 공통 **canonical 콘텐츠 직접 생성·게시** |
| **인증된 대상 매장 HUB** 에 제공(게시/해제) | 일반 인터넷 공개 · **공개 URL·QR 발급** |
| 매장이 가져가 **독립 사본** 생성 | 매장 사본 **원격 수정·회수·자동 배포** |
| 포함 상품·콘텐츠의 소유권·승인·사용범위 **검증 대상** | Screen Set 전체에 대한 운영자 검수 요구(불요) |

## 4. 상태 계약 확정 (실행 2) — `supplier_template` 미사용

| 상황 | origin | status | hub_target_store_type |
|------|--------|--------|----------------------|
| 공급자 작성 중 | `supplier` | `draft` | NULL 허용 / 값 허용 |
| 공급자 **HUB 게시 중** | `supplier` | **`active`** | **필수** |
| 게시 해제 | `supplier` | `active → draft` | 값 **유지 가능** |
| 공급자 보관 | `supplier` | `archived` | NULL·값 **둘 다 허용**(유지 가능) |
| 운영자 원본(기존) | `operator` | `operator_template` | NULL 고정 |
| 매장(기존) | `store` | `draft`/`active`/`archived` | NULL 고정 |

- **기존 status CHECK 허용목록 변경 없음** — `('draft','active','archived','operator_template')` 그대로.
- **HUB 노출 조건 = `origin='supplier' AND status='active'`** (게시 해제·보관은 신규 가져오기만 차단, 기존 매장 사본 무영향).

## 5. `hub_target_store_type` 컬럼·제약 (실행 5·6)

migration **`20270211000000-AddScreenSetHubTargetStoreType.ts`**:
```sql
ALTER TABLE store_tablet_screen_sets ADD COLUMN IF NOT EXISTS hub_target_store_type VARCHAR(20);

ALTER TABLE store_tablet_screen_sets ADD CONSTRAINT "CHK_stss_hub_target" CHECK (
  (hub_target_store_type IS NULL
    OR (origin = 'supplier' AND hub_target_store_type IN ('pharmacy','non_pharmacy','all')))
  AND
  (origin <> 'supplier' OR status <> 'active' OR hub_target_store_type IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_stss_supplier_hub
  ON store_tablet_screen_sets (service_key, hub_target_store_type)
  WHERE origin = 'supplier' AND status = 'active' AND deleted_at IS NULL;
```
보장 의미: ①허용값 외 저장 금지 ②supplier 아닌 원본에 대상값 저장 금지 ③supplier+active 시 대상값 필수 ④기존 행 무변경 유효 ⑤owner scope 제약 유지(무접촉).

## 6. 약국·비약국 판별 기준 (실행 6)

- 현재 매장의 약국 여부는 **`organizations.type`** 기준(실측: `pharmacy` 6 / `store` 2 / `supplier` 6 / `association` 1 / `division` 1).
- `pharmacy` → 약국, `store` → 비약국. **`supplier`/`association`/`division` 등 매장이 아닌 조직 유형은 HUB 대상에서 제외**(후속 V2 앱 레이어에서 강제).
- `all` = 약국 + 비약국 **매장** 전체(비매장 조직 포함 아님).

## 7. supplier_id 계약 — 현행 유지 (실행 4)

- `store_tablet_screen_sets.supplier_id` → **`neture_suppliers.id`** (soft-ref, FK 없음). 본 WO 에서 **변경하지 않음**.
- `organization_id` 를 공급자 소유권에 **재사용하지 않음**(F6 Store Ops 경계 보존).
- 로그인 사용자 ↔ supplier 대조(`neture_suppliers.user_id`)는 **후속 V2 API 에서 강제**.
- `WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1`(Design Phase, supplier→organizations SSOT 이관)은 **별도 작업으로 유지**하며 본 계약을 무효화하지 않는다. 이관이 실제 적용되면 본 계약 재검토 필요(문서화 완료).

## 8. 의약품 약국 전용 — **후속 V2 애플리케이션 가드 계약**

의약품 포함 여부는 **Screen Set 블록(content_list/product_list) 내용 조사**가 필요하므로 DB CHECK 에 넣지 않았다. 후속 V2 가 다음을 앱 레이어에서 강제한다:

- **게시(`draft → active`) 시점**과 **대상 변경 시점**에 블록 내 상품·설명서를 조사해 **의약품 포함이면 `hub_target_store_type='pharmacy'` 만 허용**(`non_pharmacy`/`all` 거부).
- 의약품 판별 기준은 상품 분류(전문/일반의약품)를 사용하며, 판별 불가 시 **보수적으로 pharmacy 강제 또는 게시 거부**.
- HUB 조회 시에도 현재 매장 `organizations.type` 과 `hub_target_store_type` 을 대조해 **이중 방어**.

## 9. dry-run 검증 (실행 3·10) — ✅ 15 pass / 0 fail

TEMP replica(세션 로컬, prod 무변경, ROLLBACK) + **기존 프로덕션 36행 전량 적재 → 신규 제약 통과**(백필 0 근거).

**허용 9**: supplier+draft+NULL · supplier+draft+pharmacy · supplier+active+pharmacy · supplier+active+non_pharmacy · supplier+active+all · supplier+archived+NULL · **supplier+archived+all**(보관 시 값 유지) · operator+operator_template+NULL · store+active+NULL
**거부 6**: supplier+active+**NULL** · supplier+active+**임의문자열** · operator+operator_template+**pharmacy** · store+active+**all** · 비supplier origin+대상값 · **`supplier_template` status**(기존 status CHECK 유지)

## 10. 프로덕션 적용·사후검증 (실행 7·8·9) — ✅ PASS (배포 b11088807, 2026-07-21)

| # | 항목 | 결과 |
|---|------|------|
| 1 | migration 적용·컬럼 타입/nullable | CI/CD "Deploy API Server" **success** → `typeorm_migrations` 에 `AddScreenSetHubTargetStoreType20270211000000` 기록. 컬럼 `hub_target_store_type` = **character varying(20) · is_nullable=YES · default 없음** ✅ |
| 2 | `CHK_stss_hub_target` 실제 정의 | 배포된 정의 = 설계와 일치(허용값 `pharmacy/non_pharmacy/all` + `origin='supplier'` 전용 + `origin<>'supplier' OR status<>'active' OR NOT NULL`), **`convalidated=t`**(NOT VALID 아님) ✅ |
| 3 | 허용 9·거부 6 **프로덕션 재검증** | 실 테이블 `BEGIN…ROLLBACK` probe → **15 pass / 0 fail** ✅ (검증 후 행 수 36 불변 = write 0) |
| 4 | 기존 36행 계속 유효 | 제약 적용 상태에서 위반 행 **0** ✅ |
| 5 | 백필 0 | 총 36행 중 `hub_target_store_type IS NOT NULL` = **0** ✅ |
| 6 | status·owner scope CHECK 불변 | `CHK_..._status` = `('draft','active','archived','operator_template')` 그대로 · `CHK_stss_owner_scope` 3-way 그대로 · `CHK_..._origin` 그대로, 모두 `convalidated=t` ✅ |
| 7 | 신규 부분 인덱스 | `idx_stss_supplier_hub (service_key, hub_target_store_type) WHERE origin='supplier' AND status='active' AND deleted_at IS NULL` · **`indisvalid=t`, `indisready=t`** ✅ |
| 8 | 운영자·매장 행 수·핵심 필드 불변 | 분포 = operator/operator_template **9** · store/active **12** · store/archived **12** · store/draft **3** = **36**(migration 전 dry-run 적재 수와 동일) ✅ |
| 9 | 태블릿·QR 흐름 영향 | 공개 타블렛 `mode=screen_set`, sections **5**(idle 포함), content_list **5카드** / Screen Set QR `landingType=screen_set`, sections 4(idle 제외), content_list **5카드** — **회귀 0** ✅ |
| 10 | **멱등성(정직 기록)** | `ADD COLUMN IF NOT EXISTS` → no-op(**멱등**) · `CREATE INDEX IF NOT EXISTS` → no-op(**멱등**) · **`ADD CONSTRAINT` → `duplicate_object` 오류(비멱등)** — PostgreSQL 이 `ADD CONSTRAINT IF NOT EXISTS` 를 지원하지 않기 때문. 실제 재실행은 `typeorm_migrations` 기록으로 차단되므로 운영상 문제 없음. **수동 재적용·스키마 동기화 시에는 제약 존재 여부를 먼저 확인해야 한다.** |
| 11 | typecheck·test·build | api-server(내 파일) tsc **0** · web-neture tsc **0** · 인접 테스트 `store-public-tablet-screen`·`store-tablet-idle-block`·`store-public-tablet-content-resolve` **23 PASS** ✅ |
| 12 | CHECK 갱신·commit·push | 본 절 갱신 + pathspec 커밋(아래) ✅ |

**데이터 write 0** — 사후검증은 read-only SELECT + ROLLBACK probe 만 사용했다.

## 11. 후속 V2 착수 계약 (실행 11)

후속 `WO-O4O-SUPPLIER-SCREEN-SET-AUTHORING-AND-HUB-PUBLISH-V2` 가 참조할 확정 계약:

| 항목 | 계약 |
|------|------|
| 소유권 | `origin='supplier'` · `organization_id=NULL` · `supplier_id=neture_suppliers.id` · `service_key=대상 서비스` · `created_by_user_id` |
| 상태 | 작성 `draft` / 게시 `active` / 해제 `active→draft` / 보관 `archived` (신규 status 없음) |
| 게시 대상 | `hub_target_store_type ∈ {pharmacy, non_pharmacy, all}`, **active 시 필수** |
| HUB 노출 | `origin='supplier' AND status='active' AND service_key=현재 서비스 AND deleted_at IS NULL AND 대상유형 ↔ organizations.type 일치` |
| 매장 사본 | 운영자 경로와 **동일 재사용**: org=매장·`origin='store'`·`status='active'`·`supplier_id=NULL`·`tablet_id=NULL`, 값 복사·FK 없음·반복 허용·코너 자동 미적용·provenance=`store_asset_derivations`(신규 kind `supplier_screen_set` 추가 예정) |
| 공개 | 공급자 원본 **공개 URL·QR 미발급**. 미리보기는 인증 화면 + 기존 draft preview 재사용 |
| 채널 | 타블렛 idle 포함 / QR idle 제외(기존 resolver 규칙) |
| 앱 가드 | §8 의약품 약국 전용 · 자기 상품·콘텐츠만 조회(Supplier ContentSourceAdapter) · 타 공급자/운영자/매장 자산 차단 |
| 메뉴 위치 | 선행 CHECK §2 후보표 기준 재검토(조건부 1순위 = 제품 관리 > 매장용 설명서 아래) |

## 12. 중지 조건 점검

| 조건 | 발생? |
|------|:-----:|
| 최상위 정책 문서를 정정할 수 없음 | ❌ (ADR 2건·IR 1건·코드 주석 2곳 최소 정정 완료) |
| 소유권 구조가 조사와 다름 | ❌ (실측 일치) |
| nullable 컬럼 1개로 약국/비약국/모두 표현 불가 | ❌ (3값 + NULL 로 충분) |
| 제약 추가로 기존 행 무효화 | ❌ (36행 dry-run 통과) |
| 백필 필요 | ❌ (NULL 기본값) |
| status 추가·의미 변경 필요 | ❌ (기존 값 재사용) |
| owner scope CHECK 전면 재설계 | ❌ (무접촉) |
| supplier_id 가 neture_suppliers.id 를 안 가리킴 | ❌ (현행 확인) |
| organizations.type 으로 약국 구분 불가 | ❌ (pharmacy/store 구분 가능) |
| migration 번호·동일 테이블 충돌 | ❌ (직전 20270210000000, 본건 20270211000000) |
| supplier deprecation 이미 적용됨 | ❌ (Design Phase, 코드 변경 0) |
| 기존 운영자·매장·타블렛·QR 기능 변경 필요 | ❌ (기능 코드 무변경) |

## 13. 변경 파일

```
apps/api-server/src/database/migrations/20270211000000-AddScreenSetHubTargetStoreType.ts  (신규 migration)
docs/architecture/ADR-O4O-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1.md       (Role 정정 + ⑤HOLD 해제)
docs/architecture/ADR-O4O-SCREEN-SET-OWNER-SCOPE-MODEL-V1.md                              (supplier 상태·대상·supplier_id 확정)
docs/investigations/IR-O4O-SUPPLIER-LIBRARY-POLICY-V1.md                                  (적용 범위 정정)
services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx                         (주석 정정 — 메뉴 변경 0)
services/web-neture/src/App.tsx                                                            (주석 정정 — 라우트 변경 0)
```
- **기능 코드 변경 0 · 데이터 백필 0 · 공급자 메뉴/라우트/화면 변경 0**(WO 제외 항목 준수).
- typecheck: api-server(내 파일) **0** · web-neture **0**.
