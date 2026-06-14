# IR-O4O-KPA-COMMUNITY-CONTENT-LIST-AND-EDITOR-AUDIT-V1

> **유형:** 조사 IR (read-only, 코드/UI/API/DB/route/menu 무변경)
> **목적:** KPA Society **커뮤니티 콘텐츠**(`/content`, 자료실 제외)의 리스트·작성/편집·검색·제품연결 구조를 확인하고 필요한 정비 범위를 판단한다.
> **작성:** 2026-06-14

---

## ⚠️ 핵심 결론 (먼저 읽을 것)

> **커뮤니티 콘텐츠는 이미 단순·건전한 구조다.** ① **제품 연결이 전혀 없다**(product-agnostic — kpa_contents·ContentItem·작성 form 어디에도 productId 없음) → 사용자 방향("제품 중심 구조로 끌고 가지 않는다")과 **이미 정합**. ② 편집기는 **shared `RichTextEditor`(@o4o/content-editor)** 로 통일(분산 아님). ③ 콘텐츠/자료실 경계는 **명확**(같은 `kpa_contents`, `sub_type='content'|'resource'` + 별도 route/component/API).
>
> **유일한 정비 여지**: 검색(제목/본문/태그)·태그 필터가 **백엔드 API엔 구현돼 있으나 커뮤니티 리스트 UI에 미노출**. → **판정 B안 (제목·태그 검색 중심 경미한 사용성 정비)**. 제품 탭/필터·B2B/B2C·신규 분류는 **불필요**.

## 1. 조사 개요

KPA 커뮤니티 콘텐츠(`/content` 계열, 자료실 `/resources` 제외)의 list/write/edit/detail·편집기·검색/태그·제품연결·자료실 경계를 read-only 2-에이전트(프론트 / API·DB) 병렬 조사.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `8b541f3ac` · origin 0/0 |
| 다른 세션 WIP | operator-core-ui · instructor-lesson-list · instructor course 페이지 · pnpm-lock · CHECK-CODEX — **미접촉** |
| 조사 기준 commit | `8b541f3ac` |

## 3. 커뮤니티 콘텐츠 리스트 구조

| route | component | 비고 |
|-------|-----------|------|
| `/content` | ContentListPage | 허브("콘텐츠", 문서·코스형·설문 3섹션 미리보기 limit 6) |
| `/content/documents` | ContentDocumentsPage(subType='content') | 문서형 콘텐츠 전체 목록 |
| `/content/documents/new` | ContentWritePage | 작성 |
| `/content/:id` / `/content/:id/edit` | ContentDetailPage / ContentWritePage | 상세 / 수정(소유자) |
| `/content/courses`·`/content/surveys` | ContentCoursesPage·ContentSurveysPage | 코스형·설문 섹션 |
| `/content/resources` | ContentDocumentsPage(subType='resource') | **자료실**(동일 컴포넌트, subType 만 다름 — 본 조사 제외) |

- **리스트 컬럼**: 제목 / 작성자 / 작성일 / 조회수 / 추천수 / 액션(복사·수정·삭제). 코스 섹션만 status badge.
- **콘텐츠 유형/카테고리**: 리스트에 **type 컬럼·탭·필터 UI 없음.** sub_type 은 route 분기로만 구분(UI 분류 아님). `content_type`(participation/information)·`category`(free-form) 존재하나 **soft 표시**(강제 분류 아님).

## 4. 작성/편집 구조

- **편집기 = shared `RichTextEditor`(@o4o/content-editor)** + `AiContentModal`(AI 작성: YouTube/URL → 제목+본문 자동). 커뮤니티 전용 편집기 아님.
- **입력**: 제목(필수) / 본문(RichText) / 요약(선택) / **태그(필수 ≥1, free-form chip)** / reusable_policy(platform|restricted).
- **흐름**: 임시저장(draft) / 발행(published) / 수정(소유자 gate) / 삭제(리스트). **AI 보조 ✅**. **기존 콘텐츠 복사→새 콘텐츠 기능 없음.** 명시적 파일 업로드 필드 없음(RichText 이미지 삽입 가능).

## 5. 검색·태그 구조

| 항목 | 현황 |
|------|------|
| 제목 검색 | API `search` 지원(title/summary/body/author/tags ILIKE) — **UI 미노출**(허브 limit 6, 검색바 없음) |
| 본문 검색 | API `search` 에 body 포함 — UI 미노출 |
| 태그 검색 | API `tag` (`c.tags @> $::jsonb`) **구현·동작** — **UI 필터 미노출** |
| 태그 입력 | free-form chip(생성 시 sanitize: trim/30자/dedup) |
| 태그 용도 | 현재 **표시(drawer)만**, 필터 미배선 |

> **검색/태그 인프라는 백엔드에 이미 있으나 커뮤니티 리스트 UI가 노출하지 않음.** → 경미 사용성 정비의 핵심 지점.

## 6. 제품 관련 콘텐츠 처리

| 점검 | 결과 |
|------|------|
| 커뮤니티 콘텐츠 제품 연결 필드 | **없음** — kpa_contents·ContentItem·ContentCreatePayload·작성 form 전부 productId 부재 |
| productId/상품 연결 구조 | **없음** |
| 제품 콘텐츠 탭/필터 | **없음** |
| product_marketing_assets 와의 관계 | 그 junction 은 **execution asset(QR/POP/library/signage) ↔ 제품** 연결용 — **kpa_contents 커뮤니티 콘텐츠는 미참조** |
| 잔여 구조 여부 | 잔여조차 없음(애초에 product-agnostic) |

> **커뮤니티 콘텐츠는 완전히 제품-비종속.** 사용자 기준("제품 관련 내용도 일반 콘텐츠로 두고 제목·태그로 표시·검색")과 **현재 구조가 이미 일치.** 제품 구조 추가 불요.

## 7. 자료실과의 경계

- **같은 테이블** `kpa_contents`, **`sub_type`** 으로 분리: 'content'(커뮤니티) vs 'resource'(자료실). API 필터(`sub_type != 'resource'` vs `= 'resource'`), 프론트 `contentApi`(sub_type 미지정) vs `resourcesApi`(sub_type='resource' 하드코딩).
- **별도 route/component/UX**: `/content/documents`(ContentWritePage, RichText 작성) vs `/resources`(ResourceWriteModal, usage_type READ/LINK/DOWNLOAD/COPY·파일 중심). 자료실은 `usage_type` 보유, 콘텐츠는 미보유.
- 경계는 **명확**(D안 아님). UI 내비("자료실 →" 링크)로 구분 표지.

## 8. 향후 정비 가능성

| 점검 | 판단 |
|------|------|
| 현재 구조 유지 가능? | ✅ 구조 건전(제품-비종속, 편집기 공유, 경계 명확) |
| 제목·태그 기반 운영 충분? | ✅ 백엔드 충분 — 단 **UI 노출 필요**(검색바·태그 필터) |
| 콘텐츠 유형 필터 필요? | 선택 — 필요 시 **`content_type`(participation/information) 성격 기준**(제품 기준 아님). soft 필드라 경미 추가 가능 |
| 운영자/내매장 제작 구조와 분리 적절? | ✅ 분리 유지 적절(커뮤니티=회원 작성 콘텐츠, 제작 자료=매장 실행 결과물 — 다른 축) |

## 9. 후속 작업 제안

| 후보 | 내용 | 권장도 |
|------|------|:--:|
| `WO-O4O-KPA-COMMUNITY-CONTENT-SEARCH-SURFACE-V1` | 커뮤니티 콘텐츠 리스트에 **제목/태그 검색 UI 노출**(API 이미 지원, FE 위주) | **권장(경미)** |
| (선택) content_type 성격 필터 | participation/information 토글(제품 아님) — 필요 시 | 선택 |
| (현 상태 유지) | 구조 변경 없이 닫기 | 가능 |
| 제품 탭/필터/B2B·B2C | **하지 않음**(커뮤니티는 제품 비종속 유지) | — |

## 10. 최종 판단 (A/B/C/D/E)

**B안 (제목·태그 검색 중심 경미한 사용성 정비 필요) — A안 성격 포함(구조 자체는 유지 가능).**

- 구조·편집기·경계 모두 건전(A 성립) — 단 **검색/태그가 UI에 미노출**이라 사용성 정비 여지(B).
- 콘텐츠 유형 필터(C)는 *선택* — 필요 시 content_type 성격 기준(제품 기준 아님).
- 경계 불명확(D) 아님 — content/resource 명확 분리.
- 편집기 분산(E) 아님 — RichTextEditor 공유.
- **제품 콘텐츠 구조는 불필요·부재 확인.**

## 11. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| 커뮤니티 = 약국 경영자 전용 아님 ↔ 제품 중심 구조 | ✅ 제품 비종속(productId 0) — 철학 정합 |
| 제품 관련 내용 = 일반 콘텐츠 + 제목/태그 | ✅ 현재 그러함(별도 제품 탭 없음) |
| 콘텐츠 vs 자료실 경계 | ✅ sub_type + route/component 분리 명확 |
| 편집기 재사용 | ✅ RichTextEditor/AiContentModal 공유 |
| 운영자/내매장 제작 구조와 분리 | ✅ 별도 축 유지 |
| 1인 유지보수성 | 높음 — 검색 UI 노출 정도만 경미 추가 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **없음** (read-only IR) |
| 생성 IR | `docs/investigations/IR-O4O-KPA-COMMUNITY-CONTENT-LIST-AND-EDITOR-AUDIT-V1.md` |
| 조사 기준 commit | `8b541f3ac` |
| 리스트 | `/content` 허브(문서/코스/설문) — 제목·작성자·일자·조회·추천. type 필터 UI 없음 |
| 편집기 | shared RichTextEditor + AiContentModal. 제목/본문/요약/태그(필수)/reusable_policy. AI ✅, 복사 ❌ |
| 검색·태그 | API 지원(search·tag @>) **but UI 미노출** |
| 제품 연결 | **부재(product-agnostic)** — 사용자 방향과 정합 |
| 콘텐츠/자료실 경계 | sub_type='content'|'resource' + 별도 route/component — 명확 |
| 판정 | **B안** — 제목·태그 검색 UI 노출(경미). 제품 구조 불필요 |
| 다음 | `WO-O4O-KPA-COMMUNITY-CONTENT-SEARCH-SURFACE-V1`(선택, 경미) |
| git status | 다른 세션 WIP(미접촉), 본 IR 문서만 신규 |
