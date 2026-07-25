# CHECK-O4O-KPA-MAIN-HOME-LINK-CANONICAL-ALIGNMENT-V1

> **WO:** WO-O4O-KPA-MAIN-HOME-LINK-CANONICAL-ALIGNMENT-V1
> **근거 조사:** [IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1](IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1.md) C1·C2·C3
> **작성일:** 2026-07-25
> **유형:** KPA-Society 메인 Home 링크 정합 (frontend 1 + backend 2 파일). 신규 페이지·API·테이블·migration 0.
> **상태:** ✅ 코드 완료 / typecheck 통과 — 브라우저 smoke 는 배포 후 수행(§8)

---

## 1. 수정 전 각 링크의 실제 상태

| # | 위치 | 수정 전 href | 실제 결과 |
|---|------|--------------|-----------|
| C1 | Home 공지 | `/content/{cms_contents.id}` | **"콘텐츠를 찾을 수 없습니다"** — `/content/:id` 는 `kpa_contents` 를 조회하는데 공지 데이터는 `cms_contents` (서로 다른 테이블의 UUID) |
| C2 | Home 최신글 · 강의 | `/lms/courses/{id}` | **NotFoundPage** — 프론트에 `/lms/courses/:id` 라우트 없음. `/lms/courses` 는 `/lms` 로 redirect 될 뿐 `:id` 를 받지 않음 |
| C3 | Home 최신글 · 사이니지 | `/signage` (전 항목 고정) | 어느 항목을 눌러도 허브 1개 화면. 개별 상세 `/signage/media/:id` 는 존재하나 미사용 |

근거: [kpa.routes.ts:831-835](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L831-L835) · [content-query.service.ts:39](../../apps/api-server/src/modules/content/content-query.service.ts#L39) · [App.tsx:860-861](../../services/web-kpa-society/src/App.tsx#L860-L861) · [App.tsx:870](../../services/web-kpa-society/src/App.tsx#L870)

---

## 2. 공지 처리 방식 (C1)

**조사 결과: KPA 에 `cms_contents` 를 표시하는 공개 상세 라우트가 존재하지 않는다.**

- `App.tsx` 전체에서 notice/news 관련 라우트는 `/content/notice → /content` redirect 1건뿐([App.tsx:822](../../services/web-kpa-society/src/App.tsx#L822)).
- `cmsApi` 소비처 5곳(StoreHubLatestFeed / QrLandingPage / HubContentLibraryPage / OperatorQrWritePage / ContentManagementPage) 중 **공개 공지 상세 화면은 없음**.

→ WO §7.1 "기존 정상 상세 경로가 없는 경우" 분기 적용. **잘못된 href 를 제거하고 비링크로 표시**한다.

- `NoticeItem.href` 는 이미 optional([types.ts:10](../../packages/shared-space-ui/src/types.ts#L10)).
- `NewsNoticesSection` 이 href 없는 항목을 동일한 행 스타일의 `<div>` 로 렌더한다([NewsNoticesSection.tsx:121-129](../../packages/shared-space-ui/src/NewsNoticesSection.tsx#L121-L129)) → **컴포넌트 변경 0**.
- K-Cosmetics 가 동일 템플릿에서 이미 href 미부여 방식을 쓰고 있어([HomePage.tsx:179-184](../../services/web-k-cosmetics/src/pages/HomePage.tsx#L179-L184)) 3서비스 동작이 일치하게 된다.

**하지 않은 것:** 공지 전용 신규 상세 페이지 생성 ❌ / `cms_contents` → `kpa_contents` 복사 ❌ / 신규 API ❌ / DB 변경 ❌

---

## 3. 강의 canonical route 수정 위치 (C2)

**수정 위치: 백엔드 href 생성부** ([kpa.routes.ts](../../apps/api-server/src/routes/kpa/kpa.routes.ts) `/home/latest` course 블록)

```
/lms/courses/${r.id}   →   /lms/course/${r.id}
```

WO §9 "Home API 가 href 를 생성하고 있다면 → API 에서 canonical href 제공" 원칙을 따랐다. 프론트에 변환 로직을 중복 작성하지 않았다.

**소비처 영향 확인 (2곳 모두 `item.href` 를 그대로 사용 → 동시 해결):**

| 소비처 | 근거 |
|--------|------|
| Home 최신글 섹션 | [CommunityHomePage.tsx:113-128](../../services/web-kpa-society/src/pages/CommunityHomePage.tsx#L113-L128) |
| `/home/latest` 전체 목록 페이지 | [HomeLatestPage.tsx:112-114](../../services/web-kpa-society/src/pages/HomeLatestPage.tsx#L112-L114) |

**다른 서비스 영향: 없음.** `/home/latest` 는 서비스별 라우트 파일에 각각 독립 구현되어 있다.

| 서비스 | 강의 href | 비고 |
|--------|-----------|------|
| KPA (`kpa.routes.ts`) | `/lms/courses/{id}` → **`/lms/course/{id}` 로 수정** | 본 WO |
| GlycoPharm ([glycopharm.routes.ts:648](../../apps/api-server/src/routes/glycopharm/glycopharm.routes.ts#L648)) | `/lms/course/{id}` | 이미 canonical — 무변경 |
| K-Cosmetics ([cosmetics.routes.ts:353](../../apps/api-server/src/routes/cosmetics/cosmetics.routes.ts#L353)) | `/lms/course/{id}` | 이미 canonical — 무변경 |

→ **KPA 만 예외였고, 형제 서비스가 이미 쓰던 형태로 정렬**한 것이다.

**하지 않은 것:** `/lms/courses/:id` alias route 추가 ❌ / 강의 상세 페이지 변경 ❌ / LMS 구조 변경 ❌

---

## 4. 사이니지 개별 상세 연결 방식 (C3)

### 4-1. ID 동일성 확인 (WO §7.3 요구사항)

| 항목 | 값 |
|------|-----|
| Home latest 사이니지 id 출처 | `signage_media.id` ([signage-query.service.ts:29-37](../../apps/api-server/src/modules/signage/signage-query.service.ts#L29-L37)) |
| `/signage/media/:id` 상세 조회 | `GET /api/signage/:serviceKey/public/media/:id` → `FROM signage_media m WHERE m.id = $1` ([signage-public.routes.ts:193-206](../../apps/api-server/src/routes/signage/signage-public.routes.ts#L193-L206)) |
| 판정 | ✅ **동일 엔티티·동일 id** → 연결 가능 |

### 4-2. 단, 가시성 조건이 서로 다르다 (추가 확인 사항)

| 쿼리 | source 조건 | scope 조건 |
|------|-------------|-----------|
| Home latest (KPA config) | `IN ('hq','store')` | **없음** |
| 공개 상세 / 공개 목록(`/signage` 허브) | `IN ('hq','supplier','community')` | `= 'global'` |

→ Home latest 에는 **공개 상세에서 404 가 나는 항목(예: `source='store'`, `scope≠'global'`)이 섞일 수 있다.** 전 항목을 무조건 상세로 연결하면 기존 문제(전부 허브 이동)를 새로운 깨진 링크로 바꾸게 된다.

### 4-3. 채택한 방식 — WO §9 예외 처리 규칙 그대로

```
공개 상세 조건 충족  → /signage/media/{id}   (개별 상세)
조건 미충족          → /signage              (기존 허브 이동 유지)
```

판정에 필요한 `source`/`scope` 를 얻기 위해 공용 `SignageQueryService.listForHome()` SELECT 에 **컬럼 2개만 additive 추가**했다.

**공용 모듈 변경 — 소비처 전수 확인 (CLAUDE.md Shared Module Change Rule):**

| 소비처 | 사용 형태 | 영향 |
|--------|-----------|------|
| KPA `/home/signage` | 응답 pass-through | 필드 2개 증가(무해) |
| KPA `/home/latest` | 본 WO 에서 사용 | 의도된 소비 |
| KPA operator dashboard ([operator-dashboard.service.ts:137](../../apps/api-server/src/routes/kpa/services/operator-dashboard.service.ts#L137)) | 목록/카운트 | 없음 |
| KPA operator summary ([operator-summary.controller.ts:102](../../apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts#L102)) | 목록/카운트 | 없음 |
| GlycoPharm `/home/latest` ([glycopharm.routes.ts:700](../../apps/api-server/src/routes/glycopharm/glycopharm.routes.ts#L700)) | pass-through | 없음 |
| K-Cosmetics `/home/latest` ([cosmetics.routes.ts:405](../../apps/api-server/src/routes/cosmetics/cosmetics.routes.ts#L405)) | pass-through | 없음 |
| Neture `/home/signage` + 집계 ([neture.controller.ts:219,460](../../apps/api-server/src/routes/neture/controllers/neture.controller.ts#L219)) | pass-through | 없음 |

→ 필드를 **제거·변경한 것이 아니라 추가**만 했고, 어떤 소비처도 컬럼 목록을 전수 구조분해하지 않는다. 로직·필터·정렬·개수 무변경 → **표시 항목 집합은 그대로**다.

**하지 않은 것:** 신규 사이니지 상세 화면 ❌ / 허브 구조 변경 ❌ / 미디어 데이터 모델 변경 ❌ / latest 필터 조건 변경(항목 집합 변경) ❌

---

## 5. 변경 파일 목록 (3)

| 파일 | 변경 | 라인 |
|------|------|:----:|
| [services/web-kpa-society/src/pages/CommunityHomePage.tsx](../../services/web-kpa-society/src/pages/CommunityHomePage.tsx) | 공지 `href` 제거(비링크) + WO 주석 | -1 / +6 |
| [apps/api-server/src/routes/kpa/kpa.routes.ts](../../apps/api-server/src/routes/kpa/kpa.routes.ts) | 강의 href canonical 정정 · 사이니지 href 조건부 개별 상세 | +17 / -3 |
| [apps/api-server/src/modules/signage/signage-query.service.ts](../../apps/api-server/src/modules/signage/signage-query.service.ts) | `listForHome` SELECT 에 `sm.source, sm.scope` additive 추가 | +3 |

**다른 세션 WIP 미포함(스테이징 제외):** `AGENTS.md`, `docs/checks/CHECK-O4O-NETURE-SUPPLIER-IA-UNIFICATION-V1.md`, `docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md`, `services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx`, `.codex/`, `apps/api-server/_msm*.mjs`, `apps/api-server/src/scripts/*` (drug-otc/HFF 산출물)

---

## 6. 신규 API·DB·route 생성 여부

| 항목 | 결과 |
|------|:----:|
| 신규 테이블 | **0** |
| migration | **0** |
| DB 데이터 변경 | **0** |
| 신규 API 엔드포인트 | **0** |
| 신규 프론트 라우트 | **0** |
| 신규 상세 페이지/컴포넌트 | **0** |
| 재사용한 기존 자산 | `/lms/course/:id` · `/signage/media/:id` 라우트, `NewsNoticesSection` href-optional 렌더, `publicContentApi.getMedia`, `SignageQueryService.listForHome` |

---

## 7. typecheck 결과

| 대상 | 명령 | 결과 |
|------|------|------|
| web-kpa-society | `tsc --noEmit` | ✅ **0 errors** |
| api-server | `tsc --noEmit` | ⚠️ 변경 파일 **0 errors**. 잔존 오류는 전부 `src/scripts/drug-otc-*` · `hff-*` (병행 세션의 drug-otc/HFF 작업 영역, 본 WO 미접촉 — 기존 상태) |

> api-server 잔존 오류 목록: `drug-otc-apply-pilot-b01ac06-dryrun.ts`, `drug-otc-description-promotion-dryrun.ts`, `drug-otc-nutrition-combo-membership-persist.ts`, `drug-otc-track-a-3h-config-gen.ts`, `hff-nutrient-generate.ts`, `hff-shard0-remainder-census.ts`, `hff-vd-generate.ts`. `kpa.routes.ts` / `signage-query.service.ts` 관련 오류는 **없음**.

**잔존 잘못된 route 문자열 검색:** `href: \`/lms/courses/\`` · `href: \`/signage\`` · `href: \`/content/${n.id}\`` → **전 리포지토리 0건**.

---

## 8. 브라우저 smoke 결과

⏭️ **배포 후 수행 필요.** 변경이 backend(`/home/latest` href 생성) + frontend 양쪽이라 로컬만으로는 실제 링크를 재현할 수 없고, 프로덕션 DB 는 Cloud Run 경유로만 접근 가능하다.

배포 후 `https://kpa-society.co.kr` 에서 확인할 항목:

| # | 절차 | 기대 결과 |
|---|------|-----------|
| 1 | Home 공지 항목 클릭 | 깨진 `kpa_contents` 상세로 이동하지 않음(비링크 — 커서/이동 없음) |
| 2 | Home 최신글 → 강의 탭 → 항목 클릭 | `/lms/course/{id}` 진입, 404 없음 |
| 3 | Home 최신글 → 사이니지 탭 → 항목 클릭 | 공개 항목은 `/signage/media/{id}` 개별 상세 진입 |
| 4 | 회귀 — 포럼/콘텐츠/자료실 탭 항목 클릭 | 기존과 동일하게 정상 진입 |
| 5 | 회귀 — 비로그인/로그인 Home 렌더 | 전체 렌더 정상, 섹션 순서 동일 |

---

## 9. 미해결 항목 / 중지 조건

| WO §12 중지 조건 | 해당 | 비고 |
|------------------|:----:|------|
| `cms_contents` 표시 기존 상세 화면 없음 | ✅ **해당** | WO §7.1 지정 대안(비링크)으로 처리 — 범위 확대 없이 완료 |
| 사이니지 latest ID ≠ media detail ID | ❌ | 동일 엔티티 확인(§4-1). 단 가시성 조건 차이는 조건부 링크로 처리(§4-2·4-3) |
| 강의 href 변경이 타 서비스 경로 파손 | ❌ | GP/KCos 는 별도 라우트 파일 + 이미 canonical |
| 신규 API/데이터 모델 필요 | ❌ | |
| 다른 세션 WIP 충돌 | ❌ | 파일 중복 없음, path-specific 스테이징 |

**남은 작업:** §8 브라우저 smoke (배포 후).

**본 WO 에서 의도적으로 하지 않은 것 (WO §10):** Home 섹션 순서·Hero 문구·약사공론 영역·체험 계정 안내·서비스 카드 배치·이용 가이드 중복 제거·콘텐츠 상세 가져오기·자료실 정비·로그인 유도 통일·검색 추가·태그 필수 해제 — 전부 무변경.

---

*End of CHECK-O4O-KPA-MAIN-HOME-LINK-CANONICAL-ALIGNMENT-V1*
