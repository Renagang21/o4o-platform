# IR-O4O-CONTENT-STANDARD-MODULE-CROSSSERVICE-ALIGNMENT-V1

> **유형:** 조사 IR (read-only, 코드/UI/API/DB/route/menu 무변경)
> **목적:** `/content` 를 O4O 표준 커뮤니티 콘텐츠 모듈로 보고, KPA 기준형 대비 GP/KCos 의 현재 `/content` 지형을 비교하여 cross-service 정렬 기준을 만든다.
> **작성:** 2026-06-14
> **선행:** IR-O4O-COMMUNITY-CONTENT-CROSSSERVICE-COMMONIZATION-AUDIT-V1 (당시 "정책 차이" 결론 → 본 IR 이 "표준 미적용 상태" 관점으로 재검토)

---

## ⚠️ 핵심 결론 (먼저 읽을 것)

> **GP/KCos 에 회원 작성형 `/content` 가 없는 것은 "정책 차이"라기보다 "표준 모듈 미적용 상태"가 맞다.** KPA `/content`(회원 작성형 community content)는 ~75% generic 추출 가능한 표준 후보이고, GP/KCos 의 `glycopharm_contents`/`cosmetics_contents` 백엔드는 이미 회원 필드(author/like/view/sub_type)를 보유해 **회원 write 연결이 기술적으로 feasible** 하다.
>
> 단, GP/KCos 의 `/content`(GP)·`/library/content`(KCos) 는 현재 **운영자 발행 콘텐츠 ContentHubTemplate browse 가 점유**하고 있어, 표준 적용 전 **route 역할 재정의 + browse 이동/중복 정리가 선행**되어야 한다.
>
> **판정: A안(표준화 가능) — 단 C(route 정리)·E(역할 재정의) 선행 + B(모듈 추출).** 권장 1순위 = **KPA generic shell 추출(@o4o/community-ui)** — GP/KCos 무변경의 안전한 토대. GP/KCos 회원 작성 실제 도입은 그 위에서 단계 적용.

## 1. 표준 정의 (기준)

```
/content   = O4O 표준 커뮤니티 콘텐츠 모듈 (회원 작성·수정·열람·검색)
/resources = O4O 표준 자료실 모듈 (원본·참고자료·첨부 중심)
```
두 영역 혼동 금지. 본 IR 은 `/content`(회원 작성형) 표준화 대상.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `08311186d` · origin 0/0 |
| 다른 세션 WIP | pnpm-lock · CHECK-CODEX — **미접촉** |
| 조사 기준 commit | `08311186d` |

## 3. KPA `/content` 기준형

| route | component | 성격 |
|-------|-----------|------|
| `/content` | ContentListPage(허브, 947줄) | 문서/코스/설문 3섹션 미리보기 |
| `/content/documents` | ContentDocumentsPage(571줄) | 회원 콘텐츠 목록 + **검색**(BaseTable+Drawer) |
| `/content/documents/new`·`/content/:id/edit` | ContentWritePage(580줄) | **회원 작성/수정**(RichTextEditor+AiContentModal+태그+reusable_policy) |
| `/content/:id` | ContentDetailPage | 상세(+AppreciationPanel) |
| `/content/resources` | ContentDocumentsPage(subType='resource') | 자료실 보조 뷰 |
| `/content/surveys`·`/content/courses` | ContentSurveysPage·ContentCoursesPage | 설문·LMS 코스 섹션 |

- **API**: `contentApi` → `/api/v1/kpa/contents`(kpa_contents). `ContentItem`/`ContentListParams`/`ContentCreatePayload` 는 generic O4O 형태(content_type/sub_type/tags/reusable_policy/like/view/author).
- **제품 비종속**: productId 0 확인.
- **모두 KPA-local**(`pages/contents/`).

### 3.1 generic vs KPA-specific seam (추출 가능성)
| 분류 | 항목 |
|------|------|
| **generic (추출 가능, ~75%)** | BaseTable/Drawer/RowActionMenu/검색/페이지네이션, ContentItem/ListParams 계약, RichTextEditor+AiContentModal, 태그 chip, reusable_policy, bulk copy(assetSnapshotApi) |
| **config 화 필요** | content_type='information'·sub_type='content' 하드코드, 섹션 구성, role 체크, serviceKey |
| **KPA 고유(잔류)** | AppreciationPanel(금융), LMS 코스(contentKind), 설문(participation routing), GuideBlock |

> → `ContentDocumentsPageShell` + `ContentListPageShell` + write shell 을 `@o4o/community-ui`(신규) 또는 적합 기존 패키지로 추출, KPA adapter 가 config 주입. 상세/코스/설문은 KPA 잔류.

## 4. GP / KCos 현재 지형

### 4.1 회원 작성형 `/content` — 부재
- **GP·KCos 모두 회원 콘텐츠 write 없음**(ContentWritePage·contentApi.create·`/content/*/new` 전무). 콘텐츠는 **운영자만 작성**(`/operator/content-management` → CmsContentManager, shared).

### 4.2 route 점유 (browse 가 /content 차지)
**GP:**
| route | component | 분류 |
|-------|-----------|------|
| `/content` | HubContentListPage | (browse) ContentHubTemplate 읽기전용 |
| `/library/content` | HubContentListPage | (browse) **alias 중복** |
| `/store-hub/content` | HubContentListPage | (browse) store-hub |
| `/operator/content-management` | OperatorContentPage | (operator CMS) |

**KCos:**
| route | component | 분류 |
|-------|-----------|------|
| `/library/content`(+`/:id`) | ContentLibraryPage | (browse) — **`/content` 자체 없음** |
| `/store-hub/content` | HubContentPage | (browse) store-hub |
| `/operator/content-management` | OperatorContentPage | (operator CMS) |

> **browse 중복**: GP 3 route(/content·/library/content·/store-hub/content) 동일 HubContentListPage. KCos 2 route(다른 컴포넌트, 동일 템플릿).

### 4.3 백엔드 (회원 write feasibility)
- GP `glycopharm_contents`, KCos `cosmetics_contents`: **author_name/like_count/view_count/sub_type/reusable_policy 보유**(kpa_contents 보다 풍부). 현재 operator 발행·hub browse 용.
- → 회원 write 를 `sub_type='content'` 로 같은 테이블에 추가하는 것이 **기술적으로 feasible**(신규 테이블 불요 가능). 단 권한/작성 endpoint 신설 필요.

## 5. route 비교표

| 항목 | KPA | GP | KCos |
|------|-----|-----|------|
| 회원 콘텐츠 허브 | `/content`(ContentListPage) | `/content`(browse 점유) | `/library/content`(browse 점유) |
| 회원 콘텐츠 목록 | `/content/documents` | 없음 | 없음 |
| 회원 write | `/content/documents/new`·`/:id/edit` | **없음** | **없음** |
| 회원 상세 | `/content/:id` | `/hub/content/:id`(browse) | `/library/content/:id`(browse) |
| browse(운영자 발행) | `/store-hub/content` | `/content`·`/store-hub/content`·`/library/content` | `/library/content`·`/store-hub/content` |
| operator CMS | `/operator/content-management` | 동일 | 동일 |

## 6. component 비교표

| | KPA | GP | KCos |
|---|---|---|---|
| 회원 list/write/detail | ContentDocumentsPage/ContentWritePage/ContentDetailPage (local) | **없음** | **없음** |
| browse | HubContentLibraryPage(ContentHubTemplate) | HubContentListPage(ContentHubTemplate) | ContentLibraryPage·HubContentPage(ContentHubTemplate) |
| operator CMS | (operator-core-ui) CmsContentManager | 동일 | 동일 |
| 편집기 | RichTextEditor+AiContentModal(공유) | (operator 만 사용) | (operator 만 사용) |

## 7. 공통 모듈화 가능성

| 레이어 | 판단 |
|--------|------|
| UI shell(list/write/detail) | KPA 75% generic → `@o4o/community-ui` shell 추출 가능(config-driven) |
| API 계약 | ContentItem/ListParams 이미 generic. 서비스별 base path(/kpa,/glycopharm,/cosmetics contents) adapter |
| DB | 서비스별 테이블 유지 가능(kpa/glycopharm/cosmetics_contents) — 공통 UI + per-service table. **API 표준화는 GP/KCos 회원 write endpoint 신설 정도** |
| 신규 서비스 | shell + adapter + contents 테이블만 추가하면 동일 `/content` 패턴 적용 가능 |

> **공통 UI(shell) + per-service table/adapter** 가 적정. 전면 API/DB 통합 불요.

## 8. 충돌 / 이동 / 제거 후보 (표준 적용 시)

| 서비스 | route | 조치 |
|--------|-------|------|
| GP | `/content`(browse) | **이동** — browse 를 `/store-hub/content`(이미 존재)로, `/content` 는 회원 표준 모듈에 양보 |
| GP | `/library/content`(alias) | **제거**(중복 alias) |
| KCos | `/library/content`(browse) | **이동/리다이렉트** — 회원 `/content` 신설, browse 는 `/store-hub/content` |
| GP·KCos | `/store-hub/content` | 유지(store-hub browse 축) |
| 전 서비스 | `/operator/content-management` | 유지(operator 전용, 충돌 없음) |
| KCos | `/store/content`(StoreAssetsPage) vs `/store/library/contents` | 별도 store 축 — 본 IR 외, 중복 점검 후보 |

> menu/nav 직접 링크는 grep 직접 히트 없음(헤더/store-hub 탭 경유) — cleanup 영향 낮음. 단 적용 WO 에서 재확인 필수.

## 9. 제품 비종속 정책 확인

✅ KPA `/content` productId 0. 표준 모듈도 **제품 비종속 유지**(productId/제품탭/제품필터/B2B·B2C 미도입). 제품 콘텐츠는 운영자·매장 허브·내 매장 매장경영 흐름에서 별도(IR-PRODUCT-CONTENT-PRESENTATION 참조).

## 10. 최종 판단 (A/B/C/D/E)

**A안(KPA 기준형 표준화 가능) — 단 C(route 정리)·E(역할 재정의) 선행 + B(모듈 추출). 단계적.**

- KPA `/content` 는 표준 기준형으로 충분(75% generic). → **B: shell 추출 1순위**(GP/KCos 무변경, 안전).
- GP/KCos 의 `/content`·`/library/content` 를 browse 가 점유 → **C/E: `/content`=회원 표준 / `/store-hub/content`=browse 로 역할 재정의 + browse 이동·alias 제거** 선행.
- 그 후 GP/KCos 에 회원 표준 모듈(shell+adapter) 적용 + 회원 write endpoint(기존 contents 테이블 재사용) 신설.
- D(API 표준화 먼저) 단독 아님 — UI shell + per-service adapter 로 충분, 전면 API 통합 불요.

## 11. 후속 WO 후보 (단계)

| 순서 | 후보 | 내용 | 비고 |
|:--:|------|------|------|
| 1 | `WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-V1` | KPA list/write/detail generic seam → `@o4o/community-ui` shell 추출 + KPA adapter | **안전·1순위**(GP/KCos 무변경) |
| 2 | `IR-O4O-CONTENT-ROUTE-ROLE-REDEFINE-V1` | `/content`(회원 표준) vs browse(operator 발행) 역할·route 경계 확정 + GP/KCos browse 이동/중복 정리 설계 | C/E |
| 3 | `WO-O4O-CONTENT-BROWSE-ROUTE-CLEANUP-V1` | GP `/library/content` alias 제거, browse → `/store-hub/content` 정리 | C |
| 4 | `WO-O4O-GP-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1` / `WO-O4O-KCOS-...-V1` | GP/KCos 에 회원 표준 모듈 적용 + 회원 write endpoint(기존 contents 테이블) | 제품 도입 확정 후 |

> **회원이 콘텐츠를 작성하게 할지(GP/KCos)** 는 제품 결정이나, 본 IR 관점상 "표준 미적용"으로 보고 적용 방향으로 정렬. 단계 4 는 그 product go 후 진행.

## 12. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| `/content` 표준 모듈 일관성 | 현재 미일관(KPA 회원형 vs GP/KCos browse 점유) → 정렬 대상 |
| `/content` vs `/resources` 경계 | 명확(회원 콘텐츠 vs 자료실) — 표준 정의로 고정 |
| 제품 비종속 | ✅ 표준 유지 |
| KPA 고유(AppreciationPanel/LMS/survey) 강제? | ❌ — shell 은 generic, 고유는 config/optional·KPA 잔류 |
| browse(operator 발행) 역할 | `/store-hub/content` 축으로 분리(회원 `/content` 와 구분) |
| 1인 유지보수성 | shell 추출 + per-service adapter 로 신규 서비스 동일 패턴 — 향상 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **없음** (read-only IR) |
| 생성 IR | `docs/investigations/IR-O4O-CONTENT-STANDARD-MODULE-CROSSSERVICE-ALIGNMENT-V1.md` |
| 조사 기준 commit | `08311186d` |
| KPA `/content` | 회원 작성형 표준 후보, 75% generic 추출 가능(고유=AppreciationPanel/LMS/survey/GuideBlock) |
| GP/KCos | 회원 write 부재, `/content`(GP)·`/library/content`(KCos) browse 점유, browse 중복 |
| 백엔드 | per-service contents 테이블(회원 필드 보유) — 회원 write 연결 feasible, 전면 통합 불요 |
| 충돌/정리 | GP `/library/content` alias 제거, browse → `/store-hub/content`, `/content` 회원 표준에 양보 |
| 제품 비종속 | ✅ 표준 유지 |
| 판정 | **A안 — 단 C·E 선행 + B 추출 (단계적)** |
| 1순위 후속 | `WO-O4O-CONTENT-STANDARD-MODULE-EXTRACT-V1`(KPA shell 추출, GP/KCos 무변경) |
| git status | 다른 세션 WIP(미접촉), 본 IR 문서만 신규 |
