# WO-O4O-WORDPRESS-COMPAT-FIELD-AND-THEME-CONTRACT-FINAL-DISPOSITION-V1 — CHECK

> **상태**: **CLOSED_WITH_STOPS** (CI · 배포 5/5 success · 유보 4건 §7)
> **작성일**: 2026-09-10
> **선행 IR**: [`IR-O4O-MAIN-SITE-RETIRED-SOURCE-AND-WORDPRESS-LEGACY-FULL-CENSUS-V1`](../investigations/IR-O4O-MAIN-SITE-RETIRED-SOURCE-AND-WORDPRESS-LEGACY-FULL-CENSUS-V1.md) §3.3 #2 · #12 · §7 #2 — 이 WO 는 그 IR 이 "소비처별 판단 필요"로 넘긴 항목의 최종 처분이다.

---

## 1. 기준 SHA · 작업 기준 (§2)

```text
branch          : work/wordpress-compat-final-disposition-v1  (격리 worktree C:/tmp/o4o-wp-compat)
조사 기준 SHA    : 30c9e8cdb36115fbbfde7d7aea9048760588e48e  (= origin/main, 2026-09-10 시작 시점)
메인 worktree    : HEAD 1ba8a70f3 (origin 보다 docs 1 커밋 앞) · 다른 세션의 cosmetics 미추적 파일 3건 —
                   → 접촉하지 않기 위해 worktree 분리. 이 WO 의 변경 경로와 겹치는 파일 없음.
git status --short (worktree 시작 시) : clean
git worktree list : 12개 (기존 11 + 본 worktree). 기존 worktree 는 손대지 않았다.
```

## 2. 검색 범위 · 검색어 (§3)

**범위**: `apps/**` · `packages/**` · `services/**` · `scripts/**` · `.github/**` · root 설정 · `pnpm-lock.yaml`
(`node_modules` 제외). `archive/**` · `docs/archive/**` · 과거 CHECK 는 분리 집계.

**검색어** (WO §3 전부 + 같은 계열 발견분):

```text
featured_media · published_at · comment_status · ping_status
theme.json · themeJson · theme_json
"WordPress-style compatibility" · "WordPress compatibility" · "Gutenberg compatibility"
wordpress-block-parser · wordpress-runtime
+ 발견 추가: created_at / updated_at / sticky (같은 파일에서 같은 주석을 단 alias) ·
  window.wp · @wordpress/ · wp-json · wp_posts · schemas.wp.org · /themes/
```

**집계** (활성 소스 = `apps/**` + `packages/**` + `services/**` 의 `.ts/.tsx/.js/.json`, 주석 포함 raw):

| 검색어 | 활성 소스 | docs/archive/CHECK | 비고 |
|---|---:|---:|---|
| `featured_media` | **1** (`packages/types/src/cpt/post.ts:110`) | 3 | 선언 1건뿐 |
| `comment_status` | **1** (`cpt/post.ts:139`) | 3 | 선언 1건뿐 |
| `ping_status` | **1** (`cpt/post.ts:141`) | 3 | 선언 1건뿐 |
| `published_at` | **53** (엔티티 column · raw SQL · 마이그레이션) + **1** (`cpt/post.ts:126` alias) | 21 | §4-B 분리 |
| `theme.json` (파일) | **2** (`public/themes/{default,twenty-four}/theme.json`) | — | §5 |
| `theme.json` (코드 참조) | **0** | 3 | 로더 없음 |
| `themeJson` · `theme_json` | **0** | 0 | — |
| `WordPress-style compatibility` | **7** (전부 `cpt/post.ts`) | 0 | alias 7건의 주석 |
| `WordPress compatibility` | **1** (`editor/blocks/cover/types.ts:79` 주석) | 0 | §4-E |
| `Gutenberg compatibility` | **3** (editor `serialize.ts` · `ParagraphBlock` · `ListBlock` 주석) | 0 | §4-E |
| `wordpress-block-parser` | **0** 코드 · 4 (`RENDERING_COMPLEXITY.md`) | 1 | 삭제된 파일에 대한 문서 언급 |
| `wordpress-runtime` | **2** (dangling 주석 `vite-env.d.ts:35` · `blocks/index.ts:54`) | 0 | 존재하지 않는 파일 참조 |
| `window.wp` · `@wordpress/` · `wp-json` · `wp_posts` | **0** 런타임 (회귀 spec·vite 주석만) | — | 선행 WO 로 이미 0 |

## 3. 필드별 전수표 (§4 14계층)

| 필드 | 선언 | DB column | migration | DTO/schema | controller 응답 | service 변환 | API client | frontend R/W | serializer | seed/fixture | 테스트 | 운영 데이터 | 외부 API | 판정 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `featured_media` | 1 (`cpt/post.ts`) | **0** (어떤 entity 도 없음) | **0** (생성 이력 없음) | 0 | 0 (백엔드 Post 축 `6354e8755` 제거) | 0 | 0 | 0 | 0 | 0 | 0 | **없음** (column 자체 부재) | **불가** (제공 endpoint 없음) | **DEAD_WORDPRESS_COMPAT** |
| `comment_status` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 없음 | 불가 | **DEAD_WORDPRESS_COMPAT** |
| `ping_status` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 없음 | 불가 | **DEAD_WORDPRESS_COMPAT** |
| `published_at` (alias, `cpt/post.ts:126`) | 1 | — | — | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 불가 | **DEAD_WORDPRESS_COMPAT** (alias 만) |
| `published_at` (DB column) | 다수 | **9+ 테이블** (`forum_post` · `store_pops` · `store_videos` · `store_blog_posts` · `kpa_legal_documents` · `service_policy_documents` · `operator_qr_templates` · `operator_multilingual_product_content_groups` · `branch_posts`) | 12 | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | — | 있음 | ✓ (공개 legal 등) | **ACTIVE_O4O_CANONICAL** |
| `created_at` / `updated_at` (alias, `cpt/post.ts`) | 각 1 | — | — | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — | 불가 | **DEAD_WORDPRESS_COMPAT** (alias 만 · DB 컬럼명은 별개 정본) |
| `sticky` (alias, `Post` 직접 멤버) | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (`isSticky` 가 정본, `content.ts:47`) | 0 | 0 | 0 | 없음 | 불가 | **DEAD_WORDPRESS_COMPAT** |

**공통 근거**

- 백엔드 `Post`/`Page` 엔티티 · `PostController` · `postsController` · `pagesController` 는 `6354e8755`
  (Phase 8-3 Legacy Entity Removal) 에서 제거됐다. `@Entity('posts')` · `/api/v1/posts` 마운트 **0건**.
  → 프런트 `Post` TS 인터페이스의 필드는 **어떤 API 응답에도 실릴 수 없다.** 외부 소비자 위험 없음.
- `apps/api-server/src/database/migrations/**` 전수에서 `featured_media` · `comment_status` · `ping_status`
  **0건** — 컬럼을 만든 마이그레이션이 없다. `posts` 테이블 DROP 마이그레이션도 없다(= 있더라도 해당 컬럼은 없다).
- `Post` 소비처: `apps/admin-dashboard/src/types/post.types.ts` · `types/content.ts` 가 `@o4o/types/cpt` 로
  re-export/extend. **snake_case alias 를 읽거나 쓰는 코드 0** (camelCase `commentStatus`·`pingStatus` 도
  활성 런타임 소비는 0이나, WO 지정 대상이 아니고 일반 CMS 필드로 보존).
- 제거 후 `type-check:frontend` · admin `type-check` · api-server `tsc` 전부 **0 error** → 어떤 대입·접근도 없었음이 컴파일러로 증명.

## 4. 판정 근거 상세

### 4-A. `featured_media` → REMOVED
현행 정본은 `featuredImageId` · `featuredImage{id,url,alt}` (같은 인터페이스 바로 위). snake↔camel 변환기도 없다. 제거.

### 4-B. `published_at` → ALIAS_REMOVED (정본 보존)
WO §5-B 의 4분류 결과:

| 분류 | 해당 | 처리 |
|---|---|---|
| WordPress compatibility alias | `cpt/post.ts:126` 1건 | **제거** |
| DB naming convention | 9+ 엔티티의 `@Column({ name: 'published_at' })` · raw SQL | **보존** |
| 현행 게시 lifecycle 정본 | `hub-content.service.ts` (12곳) · legal-documents · store-pop 등 | **보존** |
| camelCase `publishedAt` 변환용 | 엔티티 property `publishedAt` ↔ column `published_at` (TypeORM 매핑) | **보존** |

### 4-C. `comment_status` → REMOVED
댓글 허용 정본은 `Post.settings.allowComments` (같은 파일) · forum 은 `forum-core` 의 `CommentStatus` enum(`published/pending/deleted`, **다른 개념**)이 정본. `commentsEnabled`/`allowComments` 계열 대체 존재. 제거.

### 4-D. `ping_status` → REMOVED
pingback/trackback 은 O4O 에 개념 자체가 없다. import/export 기능 0. 제거.

### 4-E. 주석 정정 (ACTIVE_O4O_CANONICAL — 필드 보존, 명칭만)
| 파일 | 대상 | 처리 |
|---|---|---|
| `editor/slate/utils/serialize.ts` · `ParagraphBlock.tsx` · `ListBlock.tsx` | "for Gutenberg compatibility" | 활성 editor(블록 registry → `blocks/definitions/*` 가 import). 실제 계약은 "블록 content 저장 형식 = HTML" → 그렇게 명문화 |
| `editor/blocks/cover/types.ts:79` | "WordPress compatibility" 아래 `dimRatio` · `customOverlayColor` · `overlayColor` · `hasParallax` | `blocks/definitions/cover.tsx` registry 속성 스키마에 `dimRatio`·`hasParallax` 가 default 와 함께 선언 → **저장된 블록 JSON 에 존재 가능**. **ACTIVE_EXTERNAL_COMPAT(저장 데이터) → 필드 보존**, 주석만 정정 |
| `vite-env.d.ts:35` · `blocks/index.ts:54` | "declaration is in wordpress-runtime-setup.ts" | 그 파일은 **존재하지 않는다**(dangling). 주석 제거/정정 |

## 5. `theme.json` 파일별 소비표 (§6)

| 파일 | 분류 | import/loader | build 포함 | API 전달 | appearance-system | DB theme/config | WP schema | 처리 |
|---|---|---:|---|---|---|---|---|---|
| `public/themes/default/theme.json` | **DEAD_ASSET** (WP schema 어휘) | **0** | public 정적 복사(요청 0) | 없음 | 미소비 | 무관 | `$schema: schemas.wp.org/trunk/theme.json` | **제거** |
| `public/themes/twenty-four/theme.json` | **DEAD_ASSET** | 0 | 동상 | 없음 | 미소비 | 무관 | 동상 | **제거** |
| `public/themes/default/layout.json` | **DEAD_ASSET** (O4O 자체 schema URL) | 0 | 동상 | 없음 | 미소비 | 무관 | — | **제거** (참조하는 `previews/*.png` 4장은 존재조차 하지 않았다) |
| `public/themes/default/zones.json` · `twenty-four/zones.json` | **DEAD_ASSET** | 0 | 동상 | 없음 | 미소비 | 무관 | — | **제거** |
| `public/themes/twenty-four/style.css` | **DEAD_ASSET** | 0 (`index.html` · vite.config · CSS `@import` 어디에도 없음) | 동상 | 없음 | 미소비 | — | — | **제거** |

**appearance-system 판정**: `packages/appearance-system/src` = `tokens.ts` · `css-generators.ts` · `inject.ts` — O4O 토큰 → CSS 변수 생성기. `theme.json`·`/themes/` 참조 **0**. → `O4O_APPEARANCE_CONFIG` 로 **보존**, WordPress 와 무관하므로 손대지 않음.

**연결 UI**: `AdminDashboard.tsx` 의 `/themes/customize`(테마 커스터마이저 — theme.json 의 유일한 개념적 소비처) · `/themes` 링크는 **라우트가 없다**(`routes/**` 에 `path="/themes` 0건). "WordPress 6.4.2 실행 중" 문구와 함께 제거.

**별도 축 (건드리지 않음)**: `apps/api-server/src/entities/Theme.ts` (`themes` 테이블 — 테마 마켓플레이스 성격, `database/entities.ts` 등록만 있고 서비스·컨트롤러 소비 0). `theme.json` 과 무관한 DB 축이므로 이 WO 범위 밖 → §11 후속.

## 6. 운영 DB read-only 결과 (§7)

| 시도 | 결과 |
|---|---|
| Cloud SQL Auth Proxy v2 터널 (port 5456) | ✅ 연결 |
| `psql` `o4o_api` 인증 | ❌ **password authentication failed** — `apps/api-server/.env` 자격정보가 프로덕션과 불일치 (전일 확인된 상태 그대로) |

**§7 fallback 적용** — migration · entity · repository · API 흐름으로 판정:

- 대상 3필드(`featured_media`·`comment_status`·`ping_status`)는 **어떤 migration 도 만들지 않았고 어떤 entity 도 선언하지 않는다.** 스키마는 migration 으로만 관리되므로 운영 DB 에 해당 column 이 존재할 수 없다. JSONB key 로 쓸 코드도 0.
- 따라서 "column 존재 여부 / null·비null / 최근 갱신" 조사 대상 자체가 없다.
- **DB write 0 · column 제거 0 · 데이터 삭제 0** (`PRODUCTION_DATA_CHANGE = ZERO`).
- 준비했던 read-only SQL(`information_schema.columns` 조회)은 자격정보 복구 후 후속 WO 에서 확인 가능 — 결과가 달라질 가능성은 위 근거로 0 에 가깝다.

## 7. 삭제 · 보존 · 유보 (§8 · §9)

### 삭제 (안전성 입증)
| 대상 | 근거 |
|---|---|
| `cpt/post.ts` snake_case alias 7건 | §3 · §4 |
| `public/themes/**` 6 파일 | §5 |
| `AdminDashboard.tsx` 데드링크 4건(`/themes/customize` · `/themes` · `/posts/new` · `/ecommerce/products`) + "WordPress 6.4.2 실행 중" | 라우트 부재 실측 · WP 환영 패널 잔재 |
| dangling `wordpress-runtime-setup.ts` 주석 2건 | 파일 부재 |

### 보존 (근거 기록)
| 대상 | 판정 |
|---|---|
| `published_at` DB column · 엔티티 매핑 · raw SQL (53곳) | ACTIVE_O4O_CANONICAL |
| `Post` camelCase 정본 7필드 · `CommentStatus`/`PingStatus` 타입 | ACTIVE_O4O_CANONICAL |
| `Post.settings.{allowComments,allowPingbacks,sticky}` · `PostQueryParams.sticky` | 일반 CMS 설정/질의 — WO 지정 대상 아님 |
| cover 블록 `dimRatio` 등 레거시 top-level 속성 | ACTIVE_EXTERNAL_COMPAT (저장 블록 데이터) |
| editor `serialize.ts` · `ParagraphBlock` · `ListBlock` (코드) | ACTIVE_O4O_CANONICAL — 주석만 정정 |
| `@o4o/block-renderer` · `forum-core` · CPT 엔티티/API · `/cpt-engine/*` | WO §3 보존 대상 — 접촉 0 |
| `packages/appearance-system` | O4O_APPEARANCE_CONFIG |
| 모든 migration | MIGRATION_HISTORY_ONLY — 수정 0 |
| `RENDERING_COMPLEXITY.md` 의 `wordpress-block-parser` 언급 | DOCUMENTATION_ONLY — 이미 "삭제됨" 표기 |

### 유보 (이번 WO 에서 손대지 않음 — §11 후속)
| 대상 | 사유 |
|---|---|
| `PostQueryParams` (`cpt/post.ts:252`) — `categories_exclude` · `tags_exclude` · `post_type` · `orderby` … | WP REST `/wp/v2/posts` 질의 파라미터 형태. 재수출 외 소비 **0** 이나 WO 지정 필드가 아니고 인터페이스 단위라 §13-8 경계 판단 → 후속 |
| `packages/types/src/post.d.ts` | `d2e37b255` 이후 추적된 빌드 산출물(.d.ts) — WP 잔재 아님, 위생 항목 |
| `AdminDashboard.tsx` (`/admin` Overview) 나머지 | **WordPress 대시보드 목업**: 하드코딩 stats(글 24·페이지 8·댓글 156·사용자 42) · `/comments` 데드링크 · 무지개 "배포 성공" 배너 · `href="#"` 가짜 뉴스 피드(2023-12 날짜). 이 WO 범위(필드·테마 계약) 밖 → **Overview canonicalization 별도 WO** |
| `apps/api-server/src/entities/Theme.ts` (`themes` 테이블) | 등록만 있고 소비 0 인 별도 DB 축. column/table 제거는 DB 작업 |

## 8. 변경 파일 (§9)

```text
M  packages/types/src/cpt/post.ts                                   alias 7건 제거 + 근거 주석
D  apps/admin-dashboard/public/themes/default/{theme,layout,zones}.json
D  apps/admin-dashboard/public/themes/twenty-four/{theme,zones}.json · style.css
M  apps/admin-dashboard/src/pages/AdminDashboard.tsx                 데드링크 4 + WP footer 제거
M  apps/admin-dashboard/src/vite-env.d.ts                            dangling 주석 정정
M  apps/admin-dashboard/src/blocks/index.ts                          dangling 주석 제거
M  apps/admin-dashboard/src/components/editor/slate/utils/serialize.ts   주석 정정
M  apps/admin-dashboard/src/components/editor/blocks/ParagraphBlock.tsx  주석 정정
M  apps/admin-dashboard/src/components/editor/blocks/ListBlock.tsx       주석 정정
M  apps/admin-dashboard/src/components/editor/blocks/cover/types.ts      주석 정정 (필드 보존)
A  apps/api-server/src/__tests__/wordpress-compat-field-and-theme-final-disposition.spec.ts
A  docs/checks/WO-O4O-WORDPRESS-COMPAT-FIELD-AND-THEME-CONTRACT-FINAL-DISPOSITION-V1-CHECK.md
```

§9 금지 사항 준수: fallback 추가 0 · `any` 0 · 새 deprecated alias 0 · migration 수정 0 · DB column 삭제 0 · `block-renderer` 접촉 0 · fixture 재추가 0.

## 9. 회귀 테스트 (§10)

`apps/api-server/src/__tests__/wordpress-compat-field-and-theme-final-disposition.spec.ts` — **21 tests**

| §10 계약 | 검사 |
|---|---|
| 삭제 필드 활성 선언 = 0 | `Post` 인터페이스 블록에 snake alias 7건 부재 · `featured_media`/`comment_status`/`ping_status` 활성 5루트 0 |
| runtime read/write = 0 | 동일 (속성 접근 · 객체 키 · 문자열 키) |
| theme asset loader/import = 0 | `public/themes` 부재 · `theme.json`/`/themes/{default,twenty-four}/`/`schemas.wp.org`/`zones.json`/`layout.json` 코드 참조 0 · Overview `/themes` 링크·"WordPress N.N" 0 |
| `@wordpress` dep = 0 | apps/packages/services 전 package.json 4 섹션 |
| `window.wp` = 0 · `wp-json`/`wp_posts` = 0 · `wordpress-runtime-setup` = 0 | 주석 제거 후 검사 + dangling 주석은 raw 검사 |
| block-renderer 보존 | 패키지 존재 + 활성 소비처 ≥1 |
| generic CMS 보존 | camelCase 7 정본 · `CommentStatus`/`PingStatus` · `ForumPost.published_at` · `store-pop.entity.published_at` · cover `dimRatio` |
| migration history 보존 | `CreateStorePops` · forum `001-create-forum-tables` 에 `published_at` 잔존 |

스캔은 `packages/types` · `appearance-system` · `block-renderer` · `admin-dashboard/src` · `api-server/src` 5루트로 한정하고
`__tests__`·`migrations`·`.d.ts`·산출물을 제외한다(전 저장소 스캔의 OOM·70초 비용 회피). 주석은 제거 후 검사.

## 10. 로컬 검증 (§11)

| 단계 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` (worktree) | ✅ exit 0 · 2m16s · lockfile 변경 없음 |
| `pnpm run build:packages` | ✅ exit 0 · 3m12s |
| `pnpm run type-check:frontend` | ✅ exit 0 · 5m45s |
| `pnpm --filter @o4o/api-server exec tsc --noEmit` | ✅ **exit 0 · 0 errors** |
| `pnpm --filter @o4o/admin-dashboard run type-check` | ✅ exit 0 |
| `pnpm --filter @o4o/admin-dashboard run build` | ✅ 41.7s · `dist/themes` **부재 확인** |
| 신규 spec (jest) | ✅ **21/21** |
| `legacy-wordpress-block-editor-retirement.spec.ts` | ✅ 88/88 |
| admin-dashboard vitest 전체 | ✅ **308/308** (15 files) |
| `@o4o/appearance-system` jest | ✅ 12/12 (script 가 POSIX `NODE_OPTIONS=` 인라인이라 Windows cmd 에서 실패 → bash 직접 실행. **기존 이식성 문제, 이 WO 와 무관**) |
| `@o4o/block-renderer` · `forum-core` · `types` | test script 없음 → 해당 없음 (type-check·build 로 커버) |
| eslint (변경 7 파일) | ✅ 0 error · 7 warning (전부 기존: 미사용 import · hook deps) |

브라우저 검증: 운영 화면 **렌더 결과 변경 없음** (제거한 것은 라우트 없는 링크 · 정적 미요청 자산 · 주석 · 타입 alias). `block-renderer` · theme 적용 · 콘텐츠 표시에 영향 0 → WO §11 기준 필수 아님.

## 11. CI · 배포 (§12)

push 커밋 `795dd95cc` (= 최종 HEAD, 코드 `c47a876cd` + CHECK). **취소·대체 없이 자기 SHA 에서 완주.**

| 워크플로 | 결과 | run ID |
|---|---|---:|
| CI Pipeline | ✅ **success** | 34481460375 |
| CodeQL Security Analysis | ✅ success | 34481460305 |
| Deploy API Server (Cloud Run) | ✅ success | 34481460489 |
| Deploy Web Services (Cloud Run) | ✅ success | 34481460400 |
| Deploy Admin Dashboard (Cloud Run) | ✅ success | 34481460298 |
| AppStore Guard | `NOT_TRIGGERED` (경로 필터 — 이 WO 변경 경로에 해당 없음) | — |

선행 커밋 `3eb8d7f3a`(다른 PC 세션 · local-agent)의 CI Pipeline 이 완주(success)할 때까지 push 를 보류해
두 커밋의 판정이 섞이지 않게 했다. ancestor 관계에 기대지 않고 **본 SHA 의 run 으로 직접 판정**한다.

## 12. 중지 조건 (§13)

| # | 조건 | 발생 |
|:-:|---|---|
| 1 | 운영 데이터 있는 필드의 DB 제거 필요 | ❌ (column 자체 부재) |
| 2 | 외부 공개 API 가 필드 제공 중 | ❌ (제공 endpoint 부재 — `6354e8755`) |
| 3 | 외부 소비자 판단 불가 | ❌ (노출 경로가 없어 판단 가능) |
| 4 | block-renderer 프로덕션 소비 영향 | ❌ (접촉 0) |
| 5 | theme 설정이 현재 화면 제어 | ❌ (loader 0 · appearance-system 미소비) |
| 6 | migration 수정 필요 | ❌ |
| 7 | 다른 세션과 경로 겹침 | ❌ (worktree 분리 · 메인의 dirty 파일 = cosmetics 축, 무관) |
| 8 | 일반 CMS 모델 ↔ WP 잔재 경계 불명확 | ⚠️ **부분** — `PostQueryParams` 는 형태상 WP REST 이나 인터페이스 단위 · WO 지정 필드 아님 → **수정하지 않고 유보** (§7 유보표) |

## 13. 후속 shortcode 작업 경계 (§14-12)

다음 WO `WO-O4O-DEAD-SHORTCODE-RESIDUE-CLEANUP-V1` 로 넘기는 것과 넘기지 않는 것:

- **넘김**: `packages/shortcodes` 계열 · `shortCode`(camelCase) 는 선행 IR 이 GENERIC_CMS_FALSE_POSITIVE 로 분류 — 이번 WO 는 접촉하지 않았다.
- **이 WO 에서 확정돼 재검토 불필요**: `featured_media` · `comment_status` · `ping_status` · `published_at` alias · `public/themes/**` · `window.wp` · `@wordpress/*`.
- **이 WO 가 유보한 것 (shortcode WO 범위 아님 — 별도)**: `PostQueryParams` · `post.d.ts` · Overview 목업 · `Theme` 엔티티 (§7 유보표).

## 14. 완료 판정 (§15)

```text
FEATURED_MEDIA             = REMOVED
PUBLISHED_AT               = ALIAS_REMOVED   (DB column · 엔티티 매핑 = CANONICAL 보존)
COMMENT_STATUS             = REMOVED
PING_STATUS                = REMOVED
THEME_JSON_ACTIVE_FILES    = 0
THEME_JSON_DEAD_FILES      = 2   (+ 같은 디렉터리 dead 자산 4 = 총 6 제거)
WORDPRESS_RUNTIME          = ZERO
WORDPRESS_PACKAGE_DEPS     = ZERO
WINDOW_WP_RUNTIME          = ZERO
BLOCK_RENDERER_CONSUMERS   = PRESERVED
GENERIC_CMS_CONTRACTS      = PRESERVED
PRODUCTION_DATA_CHANGE     = ZERO
OTHER_SERVICE_REGRESSION   = PASS   (type-check:frontend 전 서비스 · admin 308 · api-server tsc 0)
CI_PIPELINE                = SUCCESS  (run 34481460375 · 자기 SHA 완주)
CODEQL                     = SUCCESS  (run 34481460305)

WORDPRESS_COMPAT_FIELD_AND_THEME_FINAL_DISPOSITION
  = CLOSED_WITH_STOPS
    STOPS (§7 유보 4건 · 판단 주체 = 사용자 / 후속 WO):
      1. PostQueryParams (cpt/post.ts:252) — WP REST 질의 형태 · 소비 0 · WO 지정 필드 아님
      2. packages/types/src/post.d.ts — 추적된 빌드 산출물 (위생 항목)
      3. /admin Overview 나머지 — 하드코딩 stats · /comments 데드링크 · 가짜 뉴스 피드 → Overview canonicalization WO
      4. Theme 엔티티(themes 테이블) — 등록만 · 소비 0 · 별도 DB 축
```

## 15. Git (§16)

| 항목 | 값 |
|---|---|
| 작업 브랜치 | `work/wordpress-compat-final-disposition-v1` (격리 worktree `C:/tmp/o4o-wp-compat`) |
| 조사 기준 SHA | `30c9e8cdb` |
| 코드 커밋 | `c47a876cd` (rebase 전 `9c825d712`) |
| CHECK 커밋 | `795dd95cc` (rebase 전 `4131564b7`) |
| rebase | `origin/main` 위 2회 (3eb8d7f3a → 0e5400d2c). 충돌 0 · 내 변경 파일과 겹친 상류 커밋 0 |
| push | `git push origin HEAD:main` fast-forward · **force-push 0** |
| stage | path-specific · `check-staged-scope.mjs` 15건 범위 확인 |
| 다른 세션 변경 포함 | 0 (메인 worktree 의 cosmetics dirty 파일 미접촉) |
| 완료 조건 | `HEAD == origin/main == 795dd95cc` · 작업 범위 미커밋 0 |
