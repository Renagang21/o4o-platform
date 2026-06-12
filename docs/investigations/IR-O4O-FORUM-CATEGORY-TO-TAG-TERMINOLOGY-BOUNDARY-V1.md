# IR-O4O-FORUM-CATEGORY-TO-TAG-TERMINOLOGY-BOUNDARY-V1

> **유형:** Read-only 조사 (코드/UI/API/DB/route/menu 무변경)
> **목적:** forum 영역의 `category`/`category-request`/`forum_category_*`(코드·API·DB) 명칭과 사용자-facing 개념 `tag`/`forum`의 경계 정리 → 후속(search visibility, membership, label cleanup)의 기준선 확정.
> **상위:** `CHECK-O4O-FORUM-SERVICEKEY-EXTRACTION-AUDIT-V1` §10-3 · `IR-O4O-COMMUNITY-FORUM-CROSSSERVICE-COMMONIZATION-RECHECK-V1`
> **작성일:** 2026-06-12

---

## 1. 조사 개요

serviceKey audit 과정에서 "`category-request`/`forum_category_*`/`/categories/*` 명칭은 legacy API surface, 사용자-facing 개념은 tag 중심" 이 확인되어, membership/visibility/공통화 작업 전에 **category(코드) ↔ forum/tag(개념) 경계**를 먼저 정리한다.

**핵심 결론:**
1. **`forum_category_*` = forum 그 자체의 legacy 명칭.** `forum_category_requests.id = forum identifier (SSOT)` — "category" 라는 단어는 코드/API/DB 에만 남았고, 실제 의미는 **포럼(forum)** 이다. (분류 C — 명칭≠개념, 문서화·유지)
2. **tag = 자유입력형(free-input) 분류 키워드.** `forum_tag` 테이블은 제거(`DropForumTagTable` — "O4O 태그 정책 v1(자유입력형)")되고 `tags TEXT[]` 컬럼으로 이동. **tag 는 entity 가 아니며 membership 과 무관.** (정책 확정)
3. **membership = 폐쇄형 forum(forumType='closed') 기준** — `forum_category_members`(forum_category_id=forumId). **tag 가 아니라 forum 접근권.** → closed-forum visibility gate 는 **forum membership 기준**이어야 함(search WO 방향 확정).
4. 사용자/운영자는 화면에서 **"포럼"·"태그"** 만 본다. "카테고리" 잔존은 **GP/KCos/Neture 신청 페이지 help text 3건**("원하시는 포럼 카테고리가 없나요?")뿐(KPA 는 이미 "포럼"). (분류 B — 소규모 label cleanup)
5. **부수 발견(parity/기능 gap):** backend 는 포럼 생성 시 **tags 필수**(`TAGS_REQUIRED`)인데, **KPA frontend 만 tag 입력 구현**. GP/KCos/Neture 신청 폼은 tags 미전송 → 신청 거부 가능성. "tag 중심 이동"이 backend 엔 강제됐으나 비-KPA frontend 미반영.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `b26c61807c5838961f920b7d7b63317ed44a8c39` |
| origin/main ahead/behind | `0 / 0` |
| 조사 기준 commit | `b26c61807` |

**다른 세션 WIP(미접촉):** market-trial controller/routes M, CHECK-...-ORDER-VIEW-LOOP M, untracked(이전 IR/CHECK/png 다수). 본 IR 은 신규 문서 1건만 생성.

---

## 3. 용어 사용처 전수 요약

| 용어(코드/API/DB) | api-server 사용 | 실제 의미 | 사용자-facing 노출 |
|--------------------|:---:|-----------|--------------------|
| `forum_category_requests` | 31 files | **active forum SSOT** + 개설 신청 | ❌ (내부) |
| `forum_category_members` | 12 files | 폐쇄형 forum 멤버십 | ❌ |
| `ForumCategoryRequest` (entity) | 12 files | forum + 신청 엔티티 | ❌ |
| `categoryId` | 49 files | 사실상 **forumId** | ❌ |
| `forumType` (open/closed) | 7 files | 포럼 공개/비공개 | "포럼 유형"(operator) |
| `tags TEXT[]` | 128 files | 자유입력 분류 키워드 | "태그" |
| `forumTag` | 0 files | (없음) | — |
| `Tag.ts` (entity 'tags') | generic | CMS/범용 태그(name/slug/count) — **forum 미사용** | ❌(별개) |

근거: `ForumDirectoryController.ts:15` "forum_category_requests (status='completed') = active forum SSOT" · `operator-forum.routes.ts:9` "forum_category_requests.id = forum identifier (SSOT)" · `ForumPost.ts:83` "forum_category_requests.id 참조 — 게시글이 속한 포럼의 SSOT".

---

## 4. backend category/tag 모델 조사

- **forum entity 실체:** `forum_category` 테이블은 drop(WO-O4O-FORUM-CATEGORY-TABLE-DROP-V1) → `forum_category_requests` 가 forum SSOT 겸 신청 레코드. `name`/`description`/`forumType`/`tags[]`/`icon`/`service_code` 보유(ForumCategoryRequest entity:40~110).
- **tag 모델:** 별도 `forum_tag` 테이블 제거(`20260425400000-DropForumTagTable` — "O4O 태그 정책 v1(자유입력형) 정렬") → `tags TEXT[]` 컬럼(`20260700000000-AddTagsToForumCategory`: 승인 시 ForumCategoryRequest.tags → ForumCategory.tags 1회 복사). post tags 도 array 화(`ConvertForumPostTagsToArray`).
- **결론:** tag 는 **관계형 entity 가 아니라 forum/post 에 붙는 자유입력 문자열 배열 속성**. 분류·검색·추천용. membership/접근권을 부여하지 않음.

## 5. frontend 사용자-facing 문구 조사

| 서비스 | 신청 페이지 | "카테고리" 노출 | "태그" 노출 |
|--------|-------------|-----------------|-------------|
| KPA | mypage/RequestCategoryPage "새 포럼 신청"·"포럼 이름/설명" | ❌ ("원하시는 포럼이…") | "인기 태그"(목록), "태그"(operator) |
| GlycoPharm | forum/RequestCategoryPage "새 포럼 신청" | ⚠️ help text "원하시는 포럼 **카테고리**가 없나요?"(L116) | (operator) |
| K-Cosmetics | forum/RequestCategoryPage "새 포럼 신청" | ⚠️ 동일 help text(L95) | (operator) |
| Neture | supplier/RequestCategoryPage "새 포럼 신청" | ⚠️ 동일 help text(L95) | (operator) |

- 사용자가 보는 canonical: **"포럼"**(엔티티) + **"태그"**(분류). 폼 필드는 "포럼 이름"/"포럼 설명".
- "카테고리"가 화면에 보이는 곳: **GP/KCos/Neture 신청 help text 3건뿐**. KPA 는 이미 "포럼"으로 정리됨. → 사용자 혼선 최소, 정리 시 3문구 교체.
- "관심 태그"/"주제"/"분야" 라벨은 없음.

## 6. API/DB contract 조사

| API | 표면 명칭 | 실제 의미 | frontend UI 의미 |
|-----|-----------|-----------|------------------|
| `/forum/categories/*` | categories | forum 디렉터리/소유/멤버십 | "포럼" |
| `/forum/category-requests/*` | category-request | **포럼 개설 신청**(+ forum SSOT) | "포럼 신청" |
| `categoryId`(param) | category | **forumId** | (미노출) |
| `/forum/operator/categories*` | categories | forum 관리 | "포럼" 관리 |

- KPA legacy `/kpa/forum-requests/*`(deprecated) 와 canonical `/forum/category-requests/*` 모두 "category" 명칭이나 의미는 동일(포럼 개설 신청). `serviceCode` 는 tag/category 와 무관한 서비스 격리 키.
- `ForumMembershipService` 의 `categoryId` 인자 = forum id(폐쇄형 포럼). 명칭만 category.

## 7. membership과 tag 관계 조사

- `forum_category_members` 주석: "폐쇄형 포럼(forumType='closed') 가입… 실제 멤버십: forum_category_members(role='owner'|'member')". **멤버십은 forum(forumType=closed)에 귀속**, forum_category_id(=forumId) 기준.
- tag 는 forum/post 의 자유입력 속성 → **membership 과 직접 연결 없음, 연결해서도 안 됨**(정책 v1 자유입력형).
- **판정(D 해소):** tag = 분류/검색/추천. membership = forum 접근권. 둘은 직교. closed forum visibility/membership 은 **forum(categoryId=forumId) 기준 유지**가 맞다.

## 8. search visibility와 tag/forum 관계

- forum search(`forum.search.service.ts`)는 `status=PUBLISHED` + tag/org/extension narrowing. 현재 **closed-forum membership 게이팅 없음**(serviceKey audit §6).
- §7 결론에 따라 visibility gate 의 기준은 **tag 가 아니라 forum membership(forum_category_members) + forumType='closed'**. → 후속 `WO-O4O-FORUM-SEARCH-CLOSED-FORUM-VISIBILITY-GATE-V1` 는 **forum 기준 게이팅**으로 설계해야 함(tag 기준 아님). 본 IR 이 그 설계 기준선을 확정.

## 9. 서비스별 차이

| 서비스 | tag 도메인 의미 | 신청 폼 tag 입력 |
|--------|-----------------|:----:|
| KPA | 약사·약대생 커뮤니티 주제(자유입력) | ✅ selectedTags 전송 |
| GlycoPharm | 질환/약국운영/콘텐츠 주제 | ❌ 미전송 |
| K-Cosmetics | 피부타입/고민/제품군 주제 | ❌ 미전송 |
| Neture | supplier/partner 중심 — forum/tag 의미 축소 가능(H) | ❌ 미전송 |

- 도메인별 tag 의미 차이는 자유입력형이라 자연 수용(별도 tag 마스터 불필요).
- **신청 폼 tag 입력은 KPA만 구현** → §11-3 parity gap.

## 10. 분류표

| 분류 | 의미 | 해당 |
|------|------|------|
| A | 내부 legacy 명칭·사용자 혼선 없음, 유지 | `categoryId`(=forumId), `/forum/categories/*` 등 코드/API 내부 명칭 |
| B | 사용자-facing 문구 category 잔존 → tag/forum 정리 | GP/KCos/Neture 신청 help text "포럼 카테고리"(3건) |
| C | API/DB 명칭 category 이나 실제 forum/topic, 문서화 | `forum_category_requests`(=forum SSOT), `category-request`(=포럼 신청), `forum_category_members`(=폐쇄포럼 멤버십) |
| D | tag↔membership 혼동 정책 결정 | **해소** — tag=분류, membership=forum 접근권(직교) |
| E | category 기반 죽은/mock 기능 | 없음(forum_category 테이블은 drop, SSOT 이전 완료) |
| F | DB/API rename 큰 구조 | `forum_category_*` → `forum_*` rename(31+ files, SSOT) — 장기 migration IR |
| G | 도메인 차이 서비스별 유지 | Neture forum/tag 축소(공급자 정체성) |
| H | 기록만 충분 | tag 자유입력형 정책, Tag.ts(forum 미사용) |

## 11. 즉시 WO 가능한 후보

1. **`WO-O4O-FORUM-CATEGORY-TO-TAG-LABEL-CLEANUP-V1`** (B) — GP/KCos/Neture 신청 페이지 help text "원하시는 포럼 카테고리가 없나요?" → "원하시는 포럼이 없나요?"(KPA 문구와 정렬). frontend copy-only, 3파일, 무위험.
2. **(parity) `WO-O4O-FORUM-REQUEST-TAG-INPUT-PARITY-V1`** (§11-3) — GP/KCos/Neture 신청 폼에 tag 입력 추가 또는 backend tags 필수 완화 결정. **선결: backend `TAGS_REQUIRED` 가 4서비스 모두에 의도된 정책인지 확인** 후 ① UI 추가(KPA 패턴) 또는 ② backend optional 화 택1.

## 12. backend/API/DB 변경이 필요한 후보

1. **`IR-O4O-FORUM-CATEGORY-NAME-RENAME-FEASIBILITY-V1`(장기, F)** — `forum_category_requests`/`forum_category_members`/`categoryId` → `forum_*` rename 타당성. **현재 비권장**(31+ files·SSOT·migration·런타임 위험). 사용자 혼선이 없으므로 **DB/API 명칭 유지** 권장, 신규 코드 주석으로 "category=forum" 명문화 정도.
2. **`WO-O4O-FORUM-SEARCH-CLOSED-FORUM-VISIBILITY-GATE-V1`(§8)** — forum membership 기준 게이팅. 본 IR 이 기준 확정.

## 13. 문서화만 필요한 후보 (H)

- tag = 자유입력형 분류 키워드(정책 v1), membership 과 직교 → forum 도메인 문서에 명문화.
- `Tag.ts`(entity 'tags')는 forum 미사용(범용/CMS) — forum tag 와 혼동 금지.
- "category=forum(legacy 명칭)" 매핑(§3 표) 을 forum 아키텍처 문서에 1회 기록.

## 14. 우선순위 제안

| 순위 | 항목 | 근거 |
|:---:|------|------|
| 1 | §11-1 label cleanup(B) | 사용자 혼선 즉시 제거, 무위험 copy |
| 2 | §11-2 tag 입력 parity(정책 확인 후) | GP/KCos/Neture 포럼 신청 실패 가능성(기능 gap) |
| 3 | §12-2 search visibility gate(forum 기준) | 본 IR 로 기준 확정, 다음 보안 축 |
| 4 | §13 문서화(category=forum, tag 정책) | drift 방지 기준선 |
| 5 | §12-1 rename 타당성(장기) | 현재 비권장, 필요 시 별도 |

## 15. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| 사용자에게 tag 중심으로 이해되는가 | ✅ 화면은 "포럼"+"태그". "카테고리"는 help text 3건만(정리 후보 B) |
| 내부 category 명칭이 사용자 혼선 만드는가 | ⚠️ 코드/API/DB 만 category(=forum). 사용자 노출은 거의 없음 → 문서화로 충분(C) |
| tag 를 membership 대상으로 오해하는가 | ✅ 아님 — tag=자유입력 분류, membership=forum 접근권(직교, §7) |
| 폐쇄형 forum membership 이 forum 접근권 기준 유지되는가 | ✅ forum_category_members(forumId 기준). visibility gate 도 forum 기준 권장(§8) |
| 서비스별 도메인 태그 차이 보존 | ✅ 자유입력형이라 서비스별 의미 자연 수용 |
| 불필요한 DB/API rename 으로 안정성 해치는가 | ⚠️ rename 은 31+ files·SSOT 위험 → **비권장**, 명칭 유지(F) |
| 공통화가 1인 유지보수성 향상 방향인가 | ✅ 명칭 유지 + 문구만 정리 + 문서화 = 최소 변경·최대 명료. tag 입력 parity 는 기능 일관성 향상 |

**종합:** category(코드)↔forum/tag(개념) 경계는 명확하다 — **category 는 forum 의 legacy 내부 명칭(유지), tag 는 자유입력 분류(membership 과 직교), membership·visibility 는 forum 기준**. 사용자 혼선은 help text 3건뿐이라 copy cleanup 으로 해소되며, DB/API rename 은 비권장. 후속은 ① label cleanup ② tag 입력 parity(정책 확인) ③ forum-기준 search visibility gate 순.

---

## 최종 보고 요약

- **수정 파일 없음** (신규 IR 문서 1건만 생성)
- **생성 IR 문서:** `docs/investigations/IR-O4O-FORUM-CATEGORY-TO-TAG-TERMINOLOGY-BOUNDARY-V1.md`
- **조사 기준 commit:** `b26c61807` (main, origin 동기화)
- **용어 사용처:** `forum_category_*`/`categoryId`(=forumId) 는 forum 의 legacy 내부 명칭(코드/API/DB 31+/49 files), `tags TEXT[]`(128 files) 는 자유입력 분류 키워드. `forumTag` 0, `Tag.ts` forum 미사용.
- **사용자-facing category 잔존:** GP/KCos/Neture 신청 help text "포럼 카테고리" 3건뿐(KPA 정리됨). 화면 canonical = "포럼"+"태그".
- **DB/API category 명칭 유지 판단:** **유지 권장**(rename 은 SSOT·31+ files 위험, F). 주석/문서로 "category=forum" 명문화.
- **membership↔tag 관계:** 직교 — membership=폐쇄 forum 접근권(forumId 기준), tag=분류. tag 에 membership 붙이지 않음.
- **search visibility 영향:** gate 는 **forum membership 기준**으로 설계해야 함(tag 아님) — 후속 WO 기준선 확정.
- **부수 발견:** GP/KCos/Neture 신청 폼 tag 미전송 vs backend tags 필수 → 포럼 신청 실패 가능성(parity gap, §11-2).
- **즉시 WO:** label cleanup(B, copy-only) / tag 입력 parity(정책 확인 후)
- **backend/DB 후보:** forum-기준 search visibility gate / (장기) rename 타당성 IR(비권장)
- **우선순위:** label cleanup → tag parity → search visibility gate → 문서화 → (장기)rename
- **git status:** 사전 상태 동일, 다른 세션 WIP 미접촉, 미커밋(read-only IR)
