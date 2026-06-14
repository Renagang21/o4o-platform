# IR-O4O-COMMUNITY-CONTENT-CROSSSERVICE-COMMONIZATION-AUDIT-V1

> **유형:** 조사 IR (read-only, 코드/UI/API/DB/route/menu 무변경)
> **목적:** KPA 커뮤니티 콘텐츠 검색 UI(WO-...-SEARCH-SURFACE-V1)를 GlycoPharm/K-Cosmetics 로 확산할지 판단하기 위해, 3서비스 커뮤니티 콘텐츠 구조의 공통화 가능성을 조사한다.
> **작성:** 2026-06-14
> **선행:** IR-O4O-KPA-COMMUNITY-CONTENT-LIST-AND-EDITOR-AUDIT-V1 · WO-O4O-KPA-COMMUNITY-CONTENT-SEARCH-SURFACE-V1

---

## ⚠️ 핵심 결론 (먼저 읽을 것)

> **"회원 작성형 커뮤니티 콘텐츠 리스트"(KPA `ContentDocumentsPage` — 내 검색 WO 대상)는 KPA 고유 surface 다.** GP/KCos 에는 **동일 surface 자체가 없다.** GP/KCos 커뮤니티 콘텐츠는 **공유 `ContentHubTemplate`(@o4o/shared-space-ui) 기반 읽기전용 browse** 이며 **검색이 이미 내장**되어 있다.
>
> → **판정: 검색 UI 확산 N/A (불필요).** GP/KCos 는 확장할 대응 surface 가 없고, 그들의 콘텐츠 browse 는 이미 검색 가능. KPA 의 회원 작성형 콘텐츠를 GP/KCos 에 "이식"하는 것은 UI 공통화가 아니라 **제품 결정**(GP/KCos 회원이 콘텐츠를 작성하게 할 것인가)이다. **검색 축은 KPA 적용으로 종료 권장.**

## 1. 조사 개요

3서비스 커뮤니티 콘텐츠(`/content` 계열)의 리스트·작성·API·shared 컴포넌트를 비교. **(주의)** 1차 탐색에서 "회원 작성형 커뮤니티 콘텐츠"와 "store-hub 콘텐츠 browse"가 혼동되어, App.tsx route·컴포넌트 존재를 **직접 grep 검증**하여 정정함.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `51a3ca274` · origin 0/0 |
| 다른 세션 WIP | pnpm-lock · CHECK-CODEX — **미접촉** |
| 조사 기준 commit | `51a3ca274` |

## 3. 두 surface 구분 (혼동 정정)

커뮤니티 영역에 **성격이 다른 두 콘텐츠 surface** 존재:

| surface | 성격 | KPA | GP | KCos |
|---------|------|-----|-----|------|
| **(I) 회원 작성형 콘텐츠** | 회원이 RichText 로 **작성**, 목록/상세/수정 | ✅ ContentDocumentsPage + ContentWritePage(`contentApi`→kpa_contents) | ❌ **없음** | ❌ **없음** |
| **(II) 콘텐츠 browse** | operator/CMS 콘텐츠 **탐색·복사**(읽기전용) | HubContentLibraryPage(`/store-hub/content`, ContentHubTemplate, cmsApi) | HubContentListPage(`/content`, ContentHubTemplate, hubContentApi) | ContentLibraryPage(`/library/content`)·HubContentPage(`/store-hub/content`, ContentHubTemplate) |

> **내 검색 WO 대상 = (I) KPA ContentDocumentsPage.** (II) browse 는 ContentHubTemplate 로 이미 공유·검색 내장.

## 4. 직접 검증 결과 (grep)

| 점검 | 결과 |
|------|------|
| KPA App.tsx | `/content/documents`→ContentDocumentsPage, `/content/documents/new`·`/content/:id/edit`→ContentWritePage, `/content`→ContentListPage(허브). **회원 작성형 (I) 보유** |
| GP `ContentDocumentsPage/ContentWritePage/ContentListPage/contentApi` | 컴포넌트 파일 **부재** — `/content`=HubContentListPage(ContentHubTemplate browse). **(I) 없음** |
| KCos 동일 패턴 | **0 files** — contentApi·작성형 콘텐츠 컴포넌트 전무. ContentLibraryPage(ContentHubTemplate browse)만. **(I) 없음** |

## 5. 공유 컴포넌트 현황

| 컴포넌트 | 패키지 | 소비 |
|----------|--------|------|
| **ContentHubTemplate** | @o4o/shared-space-ui | (II) browse — KPA `/store-hub/content`, GP `/content`, KCos `/library/content`·`/store-hub/content`. **검색 내장**(searchPlaceholder config) |
| **RichTextEditor / AiContentModal** | @o4o/content-editor | 3서비스 작성/편집(KPA 커뮤니티 작성, 전 서비스 operator content-management) |
| **CmsContentManager** | @o4o/operator-core-ui | 3서비스 operator content-management(operator 작성) — 공유 |
| 회원 콘텐츠 리스트(ContentDocumentsPage) | — | **KPA-local, 미공유**(GP/KCos 대응 없음) |

## 6. 백엔드 현황 (회원 콘텐츠 기준)

- **KPA (I)**: `contentApi`→`kpa_contents`. `search`/`tag(@>)`/`sub_type`/`content_type`/`sort`/`like_count`/`view_count`/`author_name` 보유. (회원 작성·추천·조회).
- **GP/KCos**: 회원 작성형 콘텐츠 테이블/라우트 **부재**(작성 surface 없음). 콘텐츠 browse 는 `hubContentApi`(CMS 계열, glycopharm_contents/cosmetics_contents·operator 발행).
- → 회원 작성형 콘텐츠는 **KPA 단독 백엔드**. (1차 탐색이 KPA store-hub cmsApi 와 회원 contentApi 를 혼동했으나, 회원 surface 는 `contentApi`/kpa_contents 가 정답.)

## 7. 공통화 가능성 판단

| 항목 | 판단 |
|------|------|
| 검색 UI 를 GP/KCos (I) 에 확산 | **N/A** — GP/KCos 에 (I) surface 부재 |
| GP/KCos 콘텐츠 browse(II) 검색 | **이미 보유**(ContentHubTemplate 내장) — 추가 작업 0 |
| ContentDocumentsPage 를 shared 추출 | **불요(premature)** — 소비처가 KPA 하나뿐 |
| 회원 작성형 콘텐츠를 GP/KCos 도입 | **제품 결정 영역** — UI 공통화 아님(회원이 콘텐츠를 쓰게 할지) |

## 8. 최종 판단

**검색 축은 KPA 적용으로 종료. GP/KCos 확산 불필요(대응 surface 부재 + browse 는 이미 검색 보유).**

- WO-...-SEARCH-SURFACE-V1 은 **KPA 고유 surface 개선**으로 완결. cross-service 확산 WO **만들지 않음**.
- GP/KCos 커뮤니티 콘텐츠 검색은 이미 ContentHubTemplate 로 충족.
- 공통화하려면 GP/KCos 에 "회원 작성형 콘텐츠"를 도입해야 하는데, 이는 **콘텐츠 정책 결정**(사업 모델)이지 UI 추출이 아님 → 별도 제품 IR 영역.

## 9. 후속 (선택, 모두 비긴급)

| 후보 | 내용 | 권장도 |
|------|------|:--:|
| (검색 축 종료) | 검색 확산 WO 미진행, KPA 적용으로 닫기 | **권장** |
| `IR-O4O-GPKCOS-MEMBER-AUTHORED-CONTENT-POLICY-V1` | GP/KCos 회원 작성형 콘텐츠 도입 여부(제품 결정) | 보류(제품 판단 시) |
| `WO-O4O-KCOS-CONTENT-BROWSE-DUAL-ROUTE-CLEANUP-V1` | KCos `/library/content`+`/store-hub/content` 중복 browse 정리(store-hub 축, 자료실/콘텐츠 검색과 무관) | 선택(경미) |

## 10. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| 커뮤니티 콘텐츠 회원 기여 모델 | KPA 만 회원 작성형 — GP/KCos 는 browse(operator 발행) 중심 |
| 공통화가 1인 유지보수성 향상? | 이 케이스는 **공통화 불요**(소비처 1·대응 surface 부재) — 억지 추출이 오히려 복잡도↑ |
| 서비스별 차이 = 정책 vs drift | **정책 차이**(회원 작성 vs browse) — drift 아님 |
| KPA 고유를 GP/KCos 강제? | 금지 — 강제 시 제품 모델 변경 |
| browse 검색 일관성 | ContentHubTemplate 로 3서비스 일관(이미) |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **없음** (read-only IR) |
| 생성 IR | `docs/investigations/IR-O4O-COMMUNITY-CONTENT-CROSSSERVICE-COMMONIZATION-AUDIT-V1.md` |
| 조사 기준 commit | `51a3ca274` |
| 회원 작성형 콘텐츠(I) | **KPA 고유** — GP/KCos 대응 surface 부재 |
| 콘텐츠 browse(II) | ContentHubTemplate 공유, **검색 이미 내장**(3서비스) |
| 검색 UI 확산 | **N/A·불필요** — 대응 surface 없음 + browse 이미 검색 |
| 공통화 | 회원 작성형은 KPA-local 유지(소비처 1, 추출 premature). 도입은 제품 결정 |
| 판정 | **검색 축 KPA 적용으로 종료. 확산 WO 미진행** |
| git status | 다른 세션 WIP(미접촉), 본 IR 문서만 신규 |
