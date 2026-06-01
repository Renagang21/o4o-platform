# IR-O4O-OPERATOR-CONTENT-MANAGER-COMMONIZATION-AUDIT-V1

**작성 일자**: 2026-06-01  
**조사 환경**: HEAD (main) `fb9108c2d` 시점 정적 코드 (read-only)  
**작업 성격**: read-only 조사 — 코드/UI/API/DB 수정 없음  
**범위**: Operator 콘텐츠 관리(공지/뉴스/CMS)만. Admin Dashboard / My Store / Store Library 제외(다른 세션 WIP).

---

## 핵심 결론

**Operator 콘텐츠 관리 공통화는 이미 완료되어 있다.**

`CmsContentManager`(`packages/operator-core-ui`)가 DataTable+ActionBar+Drawer+RichTextEditor+bulk를 내장한 config-driven 공통 컴포넌트로 존재하며, **KPA/GlycoPharm/K-Cosmetics 3서비스가 thin wrapper(29~37줄)로 사용 중**이다. Neture는 공급자/파트너 도메인 특성상 공지/뉴스 운영자 콘텐츠 관리 화면 자체가 없다(의도된 차이).

| 서비스 | 판정 | 근거 |
|--------|:---:|------|
| KPA | **A — 공통화 완료** | CmsContentManager + assetCopy config |
| GlycoPharm | **A — 공통화 완료** | CmsContentManager 기본 config |
| K-Cosmetics | **A — 공통화 완료** | CmsContentManager 기본 config |
| Neture | **E — 서비스 특성상 제외** | 공지/뉴스 운영자 콘텐츠 관리 부재, HomepageCms는 다른 도메인 |

**판정: 추가 WO 불필요. Operator Members 공통화와 동일하게 이미 완료된 축.**

---

## 1. CmsContentManager 존재 위치

| 항목 | 내용 |
|------|------|
| 파일 | `packages/operator-core-ui/src/modules/cms-content/CmsContentManager.tsx` (966줄) |
| export | `@o4o/operator-core-ui` (index.ts) |
| 내장 컴포넌트 | `DataTable`, `ActionBar`, `RowActionMenu`, `BaseDetailDrawer`, `useBatchAction`, `BulkResultModal` |
| Editor | `RichTextEditor` 주입형 (`@o4o/content-editor`) |
| ContentStatus | `draft` / `published` / `archived` |
| bulk action | `/news/batch-publish`, `/news/batch-archive` |

**Operator Members의 `OperatorMembersConsolePage`와 동일한 config-driven 공통 wrapper 구조.**

---

## 2. 서비스별 Operator 콘텐츠 관리 화면

| 서비스 | 화면 | 파일 | 라인 | CmsContentManager | 판정 |
|--------|------|------|:---:|:---:|:---:|
| KPA | 콘텐츠 관리(공지/뉴스) | `operator/ContentManagementPage.tsx` | 37 | ✅ | A |
| GlycoPharm | 공지/뉴스 관리 | `operator/OperatorContentPage.tsx` | 29 | ✅ | A |
| K-Cosmetics | 공지/뉴스 관리 | `operator/OperatorContentPage.tsx` | 29 | ✅ | A |
| Neture | 홈페이지 CMS (Hero/Ads/Logos) | `operator/HomepageCmsPage.tsx` | (별도) | ❌ | E |

---

## 3. KPA 콘텐츠 관리 구조

```tsx
<CmsContentManager
  apiBase={`${API_BASE_URL}/api/v1/kpa`}
  serviceKey="kpa-society"
  getToken={getAccessToken}
  RichTextEditor={RichTextEditor}
  assetCopyEnabled                              // ← KPA 전용
  storeContentPath="/store/content?tab=cms"     // ← KPA 전용
  assetCopyFn={kpaAssetCopyFn}                   // ← assetSnapshotApi.copy(cms)
/>
```

KPA만 **매장 복사(assetCopy)** 기능 활성 — config 주입으로 흡수. Hub→Store clone 흐름(`WO-KPA-A-HUB-TO-STORE-CLONE-FLOW-V2`) 반영.

---

## 4. GlycoPharm 콘텐츠 관리 구조

```tsx
<CmsContentManager
  apiBase={`${API_BASE_URL}/api/v1/glycopharm`}
  serviceKey="glycopharm"
  getToken={getAccessToken}
  RichTextEditor={RichTextEditor}
/>
```

기본 config. news API `/api/v1/glycopharm/news/*`. assetCopy 미사용.

---

## 5. K-Cosmetics 콘텐츠 관리 구조

```tsx
<CmsContentManager
  apiBase={`${API_BASE_URL}/api/v1/cosmetics`}
  serviceKey="cosmetics"   // (news domain)
  getToken={getAccessToken}
  RichTextEditor={RichTextEditor}
/>
```

GlycoPharm과 동일 패턴. news API `/api/v1/cosmetics/news/*`.

---

## 6. Neture 콘텐츠 관리 구조

| 화면 | 성격 |
|------|------|
| `HomepageCmsPage.tsx` | 홈페이지 CMS — Hero Slides / Homepage Ads / Partner Logos (등록/수정/삭제/발행/순서변경) |
| `OperatorGuideContentsPage.tsx` | 가이드 콘텐츠 |

- **공지/뉴스 운영자 콘텐츠 관리 화면 없음** (`news`/`notice` grep 0건).
- `HomepageCmsPage`는 공급자·파트너 플랫폼의 **홈페이지 운영 콘텐츠**(Hero/광고/로고)로, 매장/커뮤니티 대상 공지·뉴스와 다른 도메인.
- Neture는 store/community 콘텐츠 게시 대상이 아니므로 CmsContentManager 적용 대상 아님 — **의도된 차이**.

---

## 7. UI 표준 구조 비교

| 항목 | CmsContentManager (KPA/GP/K-Cos 공통) |
|------|:---:|
| DataTable | ✅ |
| checkbox selection | ✅ (useBatchAction) |
| ActionBar | ✅ |
| RowActionMenu | ✅ |
| BaseDetailDrawer | ✅ |
| RichTextEditor | ✅ (주입) |
| bulk publish/archive | ✅ (`/news/batch-publish`, `/news/batch-archive`) |
| status (draft/published/archived) | ✅ |
| empty/loading/error | ✅ |

3서비스가 동일 컴포넌트를 쓰므로 조작 질서 완전 통일. **이미 표준(A).**

---

## 8. API / 데이터 구조 비교

| 서비스 | apiBase | news endpoint | serviceKey | assetCopy |
|--------|---------|--------------|-----------|:---:|
| KPA | `/api/v1/kpa` | `/news/admin/list`, `/news`, `/news/:id` | kpa-society | ✅ |
| GlycoPharm | `/api/v1/glycopharm` | 동일 shape | glycopharm | ❌ |
| K-Cosmetics | `/api/v1/cosmetics` | 동일 shape | cosmetics | ❌ |

- **동일 API shape** (news CRUD + batch-publish/archive). apiBase prefix만 서비스별로 다름.
- serviceKey / content type 구분은 apiBase + serviceKey prop으로 처리.
- file/image upload, RichTextEditor 연동 동일.

**API 공통화 추가 불필요** — 이미 동일 계약, prefix만 config 주입.

---

## 9. 공통화 가능성 판정

**판정: A — 이미 공통화 완료**

| 서비스 | 결과 |
|--------|:---:|
| KPA/GP/K-Cos | CmsContentManager config-driven 공통화 완료 |
| Neture | E — 서비스 특성상 제외(공지/뉴스 운영자 콘텐츠 부재) |

Operator Members(`OperatorMembersConsolePage`)와 **동일한 완료 상태**. CmsContentManager 이식이나 신규 공통화 작업 불필요.

---

## 10. 후속 WO 후보

| WO | 필요성 |
|----|:---:|
| GP/K-Cos OPERATOR-CONTENT-MANAGER-ALIGNMENT | ❌ 불필요 (이미 적용) |
| Neture OPERATOR-CONTENT-MANAGER-ALIGNMENT | ❌ 불필요 (도메인 차이, 공지/뉴스 운영 부재) |
| OPERATOR-CONTENT-API-CONTRACT 공통화 | ❌ 불필요 (이미 동일 계약) |
| CHECK-O4O-OPERATOR-CONTENT-MANAGER-LIVE-SMOKE (선택) | 선택 — 배포 환경 3서비스 live 검증 |

**필수 후속 없음.**

---

## 11. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|:---:|
| **Operator 콘텐츠 관리는 운영자가 매장/커뮤니티에 제공할 콘텐츠를 정리하는 흐름인가** | CmsContentManager는 운영자가 공지/뉴스를 작성·게시(draft/published/archived)하고 KPA는 매장 복사까지 연결 — 운영자 콘텐츠 정리 흐름에 부합. | ✅ |
| **공급자 Producer 구조로 오해될 위험** | CmsContentManager는 운영자(operator) 콘텐츠 게시이지 공급자(supplier) Producer가 아님. assetCopy도 운영자→매장(store) 흐름. Producer 혼동 없음. | ✅ |
| **KPA 기준을 GP/K-Cos에 적용해도 O4O 철학과 맞는가** | 이미 3서비스가 동일 CmsContentManager 사용. KPA assetCopy만 config 차이 — 서비스별 Hub→Store 정책 반영. 철학 일치. | ✅ |
| **Neture에 동일 기준 적용이 적절한가** | Neture는 공급자/파트너 중심으로 매장 공지/뉴스 게시 대상이 아님. HomepageCms는 다른 도메인. 강제 적용 부적절 — 현재 제외가 정당. | ✅ 제외 정당 |
| **1인 개발 속도 관점 실익** | 이미 공통화 완료 상태이므로 추가 작업 0. 신규 비용 없음. | ✅ |
| **Admin / My Store WIP 오포함 여부** | Operator 콘텐츠 관리만 조사. Admin/My Store 미접촉. | ✅ |

**결론**:
1. Operator 콘텐츠 관리는 `CmsContentManager` config-driven으로 KPA/GP/K-Cos 이미 공통화 완료.
2. KPA만 assetCopy(매장 복사) config 차이 — 서비스 정책 반영, 추상화에 묻히지 않음.
3. Neture는 공지/뉴스 운영 콘텐츠 부재 + 홈페이지 CMS는 다른 도메인 → 제외 정당.
4. **추가 WO 불필요.** 선택적으로 3서비스 live smoke만 가능.

---

## 코드 변경 없음 확인

이 IR에서 수정한 소스/DB/migration: **없음.**  
조사 파일:
- `packages/operator-core-ui/src/modules/cms-content/CmsContentManager.tsx`
- `services/web-kpa-society/src/pages/operator/ContentManagementPage.tsx`
- `services/web-glycopharm/src/pages/operator/OperatorContentPage.tsx`
- `services/web-k-cosmetics/src/pages/operator/OperatorContentPage.tsx`
- `services/web-neture/src/pages/operator/HomepageCmsPage.tsx`

git status: 다른 세션 WIP(`CHECK-...NEXT-SCOPE` modified, `WO-...PRODUCT-DESCRIPTIONS` 커밋) 미접촉.

---

## 관련 선행 문서

- `WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1` (CmsContentManager 공통 모듈 추출)
- `IR-O4O-OPERATOR-MEMBERS-EDIT-MODAL-COMMONIZATION-AUDIT-V1` (동일 "이미 완료" 패턴 참조)

---

*작성: Claude Code (2026-06-01)*  
*read-only 조사 — 코드/DB/source/migration 수정 없음*
