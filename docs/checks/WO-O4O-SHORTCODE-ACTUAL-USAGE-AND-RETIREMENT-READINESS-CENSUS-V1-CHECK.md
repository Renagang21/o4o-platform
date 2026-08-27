# WO-O4O-SHORTCODE-ACTUAL-USAGE-AND-RETIREMENT-READINESS-CENSUS-V1 — CHECK

WO: shortcode 실사용 · 은퇴 준비도 census · 일자: 2026-08-27 · 상태: **완료 (read-only census)**
채널: Cloud SQL Auth Proxy(:5442) → production `o4o_platform`, **모든 문장을 `BEGIN READ ONLY; … ROLLBACK;`** 안에서 실행. DB write **0**. runtime 수정 0. shortcode 등록·삭제 0. editor UI 수정 0.

## 0. 결론

> **최종 판정 = `RETIRE_READY`**
>
> production 전체 public schema 의 **text · varchar · json · jsonb 컬럼 1,582개를 전수 스캔**했고
> shortcode 저장 사용은 **0건**이다. 서비스 web 앱의 renderer 소비처 0, 외부 contract 0,
> `cosmetics-seller-extension` 설치 0. shortcode 는 **admin editor 안에서만 노출되는 미사용 기능**이다.

## 1. 기준선

| 항목 | 값 |
|---|---|
| branch | `main` |
| 시작 HEAD | `5156c3521` |
| `origin/main` (조사 시작 시점) | `063e811a5` |
| `git status --short` | 변경 0 |

## 2. Production DB 조사 방식

| 항목 | 값 |
|---|---|
| 경로 | `bin/cloud-sql-proxy-v2.exe` → `127.0.0.1:5442` → `netureyoutube:asia-northeast3:o4o-platform-db` |
| 계정 | `o4o_api_v2` (BUILT_IN). `o4o_api` · `postgres` 는 이 비밀번호로 인증 실패 — 사용하지 않음 |
| 자격증명 | Secret Manager `o4o-db-password` (사용자 승인, 이번 read-only census 한정). **값은 로그·문서·commit 어디에도 남기지 않았다** |
| 트랜잭션 | 전 문장 `BEGIN READ ONLY; … ROLLBACK;` |
| 실행 SQL 종류 | `SELECT` · `information_schema` inspect · `count` 뿐. **INSERT/UPDATE/DELETE/ALTER/migration 0** |
| public schema table 수 | 276 |

## 3. 조사한 tables / columns

**컬럼 단위 전수 스캔.** 테이블을 추정하지 않고 `information_schema.columns` 에서
`text` · `character varying` · `json` · `jsonb` 컬럼 **1,582개**를 뽑아 `query_to_xml(format(...))` 로
컬럼마다 `count(*)` 를 돌렸다 (스킵·샘플링 0, 오류 0).

## 4. shortcode 저장 hit — **전부 0**

검색 정규식: `(\[(acf_field|cpt_field|cpt_list|meta_field|preset)\b)|o4o/shortcode|core/shortcode|"shortcode"`

| 항목 | 전체 | 실제 business | 최근 90일 | 최근 30일 |
|---|--:|--:|--:|--:|
| shortcode block (`o4o/shortcode` · `core/shortcode`) | **0** | 0 | 0 | 0 |
| `acf_field` | **0** | 0 | 0 | 0 |
| `cpt_field` | **0** | 0 | 0 | 0 |
| `cpt_list` | **0** | 0 | 0 | 0 |
| `meta_field` | **0** | 0 | 0 | 0 |
| `preset` | **0** | 0 | 0 | 0 |

hit 가 0이므로 §5 분류(REAL / LEGACY / DEMO / SEED / FIXTURE / TEST / SAMPLE / SYSTEM_GENERATED)와
§8 최근 30·90일 생성 이력은 **분류 대상 자체가 없다**.

### 스캔이 빈 테이블을 돈 것이 아니라는 근거

| 테이블 | rows |
|---|--:|
| `store_tablet_screen_blocks` | 184 |
| `cms_contents` | 129 |
| `cms_content_slots` | 30 |
| `kpa_contents` | 16 |
| `kpa_store_contents` | 15 |
| `guide_contents` | 13 |
| `store_multilingual_product_content_pages` | 12 |
| `store_tablet_corner_contents` | 10 |
| `forum_post` | 8 |
| `glycopharm_contents` / `cosmetics_contents` / `store_blog_posts` | 4 / 2 / 3 |
| `pages` · `content_templates` · `branch_posts` · `yaksa_posts` | 0 |
| `custom_posts` · `cms_pages` · `templates` · `template_parts` · `block_patterns` · `reusable_blocks` · `post_revisions` | **테이블 자체가 production 에 없음** |

`cms_contents."bodyBlocks"`(jsonb) 안의 block type 전수: `paragraph` 3 · `heading` 2 · `list` 2 — **shortcode block 0**.

## 5. Unknown token 전수 census (§11)

전 컬럼에 정규식 `\[[a-z][a-z0-9_-]{2,}[ \]"=]` 을 돌려 hit 컬럼을 뽑고, 그 안의 token 을 전수 추출했다.

hit 컬럼: `product_masters.tags`(190) · `shared_product_descriptions.content`(175) · `product_candidates.raw_payload`(17) · `shared_product_descriptions.summary`(12) · 기타 title/subject 6건.

상위 token: `inflammation` 89 · `endif` 62 · `new` 43 · `probiotic` 31 · `opi` 19 · `feeling` 12 · `mymeera` 12 · `liquid` 11 …

→ 전부 **제품 태그·마케팅 라벨·메일 HTML 의 `[endif]` 조건부 주석**이다. **shortcode token 0**.
runtime 등록 5종 외 실사용 shortcode도 **0**, `seller_*` 6종도 **0**, `[form …]` 도 **0**.

## 6. 서비스별 usage (§6)

| 서비스 | Stored usage | Editor | Renderer | 최근 사용 | 판정 |
|---|--:|---|---|---|---|
| KPA (`kpa-society` 53 · `kpa` 1) | **0** | 공통 admin editor 노출 | 소비처 0 | 없음 | `AVAILABLE_BUT_UNUSED` |
| GlycoPharm (66) | **0** | 동일 | 소비처 0 | 없음 | `AVAILABLE_BUT_UNUSED` |
| PharmacyHub (3) | **0** | 동일 | 소비처 0 | 없음 | `AVAILABLE_BUT_UNUSED` |
| K-Cosmetics | **0** | 동일 | 소비처 0 | 없음 | `AVAILABLE_BUT_UNUSED` |
| Neture (6) | **0** | 동일 | 소비처 0 | 없음 | `AVAILABLE_BUT_UNUSED` |

(`cms_contents` 최근 갱신: pharmacy-hub 2026-08-26 · glycopharm/neture 2026-07-30 — **콘텐츠 자체는 살아 있으나 shortcode 는 쓰지 않는다**.)
admin editor 는 서비스별 분기 없이 하나이며, **렌더 축은 서비스 전부 0** 이다.

## 7. Editor 노출 (§7)

| 표면 | 근거 | 판정 |
|---|---|---|
| BlockLibrary | `blockRegistry.getByCategory('widgets')` · `CATEGORY_ORDER` 에 `widgets` 포함 | VISIBLE |
| SlashCommandMenu | `blockRegistry.getAll()` / `search()` — 필터 없음 | VISIBLE |
| `allowedBlocks` 제한 | 저장소 전체 사용처 **0** | 제한 없음 |
| BlockInserter(Gutenberg) | `window.wp.blocks.getBlockTypes()` 기반 별도 registry — o4o 블록 미주입 | 무관 |
| post / page / template / pattern | 모드별 분기 없음(동일 registry). 단 `templates`·`block_patterns` 테이블은 production 에 없음 | 동일 |

→ **`VISIBLE_UNUSED`** (노출되지만 저장 사용 0).

## 8. Renderer 실제 도달성 (§9)

| 층위 | 결과 |
|---|---|
| `CODE_REACHABLE` | YES — `packages/block-renderer/src/renderers/index.ts` 가 `core/shortcode`·`o4o/shortcode` → `ShortcodeBlock` 매핑 |
| `PRODUCTION_ROUTE_REACHABLE` | **admin 미리보기 1곳뿐** — `apps/admin-dashboard/src/pages/preview/PostPreview.tsx` 가 `@o4o/block-renderer` 의 유일한 앱 소비처 |
| 서비스 web 앱 | `services/web-{neture,glycopharm,k-cosmetics,kpa-society,kpa-branch,pharmacy-hub,account}` 의 `@o4o/block-renderer` import **0**. `shortcode` 문자열 hit 는 전부 QR 제휴 `shortCode`(무관) |
| `packages/content-editor` `ContentRenderer` | shortcode 처리 없음 (HTML 렌더) |
| `packages/forum-core` `ForumBlockRenderer` | 자체 renderer 6종 + unknown fallback, shortcode 처리 없음 |
| api-server SSR / render endpoint | `apps/api-server/src/routes` 내 shortcode 참조 **0** |
| `ACTUAL_CONTENT_REACHED` | **0** — 렌더될 shortcode 콘텐츠가 production 에 존재하지 않는다 |

## 9. cosmetics-seller-extension (§10)

| 확인 | 결과 |
|---|---|
| shortcode 정의 | `packages/cosmetics-seller-extension/src/shortcodes/index.tsx` 6종 (`seller_dashboard` · `seller_display_management` · `seller_sample_management` · `seller_inventory_management` · `seller_consultation_log` · `seller_kpi_dashboard`) |
| frontend import | `apps/*` · `services/*` 에서 **0** |
| route mount | `register-routes.ts:394` — "Still disabled (Phase R2) … 라우트는 아직 마운트하지 않는다" |
| catalog | `appsCatalog.ts:309` `status: 'active'` (표기만) |
| **production 설치 실측** | `app_registry` 6행 = `annualfee-yaksa` · `digital-signage` · `digital-signage-core` · `membership-yaksa` · `partnerops` · `reporting-yaksa`. **`cosmetics-seller-extension` 없음** |
| 6종 shortcode 저장 사용 | **0** |

→ **`LEGACY_PACKAGE`** (카탈로그 표기만 active, 설치·마운트·사용 전부 0).

## 10. 기타 token 축 (코드)

| 축 | 내용 |
|---|---|
| `packages/shortcodes/src/metadata.ts` | 16 token 광고(`product_grid` `featured_products` `product_carousel` `product_categories` `cart` `checkout` `order_detail` `my-orders` `wishlist` `login` `signup` `account` `social_login` `find_id` `find_password` `business_register`) — registry 아님, runtime 등록 **0**, 저장 사용 **0** |
| AI 경로 | `services/ai/shortcode-registry.ts` → `block-registry-extractor.ts` → `reference-fetcher.service.ts` → `SimpleAIGenerator.ts`. AI 가 위 16종을 참조해 `o4o/shortcode` 블록을 생성할 수 있으나 렌더 계약이 없다. **실제 생성물 저장 사용 0** |
| commerce 경계 | 16종에 `cart` · `checkout` · `order_detail` 포함 — `O4O-STORE-COMMERCE-BOUNDARY-V1` 금지선 대상. 등록·사용 모두 0 이라 현 상태가 경계와 일치 |
| `[form …]` | `FormsController.ts:228,403` 이 문자열을 응답으로 생성하지만 `form` shortcode 미등록, 저장 사용 0 |
| 죽은 admin 화면 | `pages/documentation/Shortcodes.tsx` · `components/ShortcodeReference.tsx` — importer/route **0** |

## 11. 외부 / public contract (§12)

| 확인 | 결과 |
|---|---|
| `@o4o/shortcodes` package.json | `private`/`publishConfig` 없음, npm publish 워크플로 없음 |
| repo 밖 consumer 증거 | **0** — 소비처 전부 workspace 내부 |
| 외부 배포 template · partner/supplier 사용 | 근거 **0** |

→ **external contract = 없음**.

## 12. Traffic / telemetry (§13)

shortcode 전용 render endpoint · preview route · editor usage event 가 저장소에 **존재하지 않는다**.
§13 지침대로 새로 만들지 않았다. → 보조 증거 없음(판정에 사용하지 않음).

## 13. 판정

| 축 | 값 |
|---|---|
| actual stored usage | **0** |
| service-specific consumer | **0** |
| actual production render usage | **0** |
| external contract | **0** |
| editor exposure | VISIBLE_UNUSED |
| cosmetics-seller-extension | LEGACY_PACKAGE |
| **최종 판정** | **`RETIRE_READY`** |
| UNKNOWN | **0** |
| production DB write | **0** |

## 14. 은퇴 범위 사전 census (§16 — 이번 WO 삭제 0)

shortcode 관련 non-doc tracked 파일 **60개**.

| 축 | 대상 |
|---|---|
| package | `packages/shortcodes` (37) · `packages/block-renderer/src/renderers/special/ShortcodeBlock.tsx` · `packages/cosmetics-seller-extension/src/shortcodes/index.tsx` |
| admin block/editor | `blocks/definitions/shortcode.tsx` · `components/editor/blocks/ShortcodeBlock.tsx` · `utils/block-icons.tsx`(항목 1) · `blocks/registry/DynamicRenderer.tsx`(매핑 1) |
| admin loader/registration | `utils/shortcode-loader.ts` · `utils/register-dynamic-shortcodes.ts` · `utils/shortcode-parser.ts` · `components/shortcodes/**`(3) · `App.tsx` bootstrap 2줄 |
| admin 기타 | `features/cpt-acf/*Shortcode*Renderer.tsx`(3) · 죽은 문서 화면 2 · `pages/test/PresetIntegrationTest.tsx` |
| AI | `services/ai/shortcode-registry.ts` · `block-registry-extractor.ts`(부분) · `SimpleAIGenerator.ts`(부분) |
| renderer 매핑 | `packages/block-renderer/src/renderers/index.ts`(2줄) · `metadata.ts`(항목 1) |
| tooling/test | `scripts/verify-shortcodes.ts` · `scripts/audit/check-shortcode-registry.ts` · `scripts/cms/normalize-blocknames.ts`(부분) · spec 4종 |

주의: `normalize-blocknames.ts` 는 block 정규화 전반을 담당하므로 shortcode 항목만 제거한다(파일 삭제 아님).

## 15. 다음 WO

`WO-O4O-SHORTCODE-DOMAIN-RETIREMENT-V1` 준비 가능. 이번 WO 에서는 **아무것도 삭제하지 않았다.**
