# CHECK-O4O-STORE-HUB-CONTENT-BROWSE-COMPONENT-EXTRACTION-V1

> **작업명:** WO-O4O-STORE-HUB-CONTENT-BROWSE-COMPONENT-EXTRACTION-V1
> **유형:** wrapper dedup — GP/KCos `/store-hub/content` near-identical 카드 그리드 공통 추출. 데이터/복사/route 무변경.
> **결과: PASS — GP/KCos 의 중복 카드 그리드(~70줄 카드 컴포넌트 + 그리드)를 `@o4o/shared-space-ui contentHubCardGrid(accent)` 로 추출. GP `primary` / KCos `pink` accent 주입. 서비스 용어(GP `내 약국`/KCos `내 매장`)·API·복사 정책은 config 에 그대로 보존. KPA 는 구조 상이로 제외(근거 §4). typecheck(5) 0 errors. GP −93 / KCos −89 줄.**
> 선행: `WO-O4O-STORE-CONTENT-TERMINOLOGY-AND-GUIDE-COPY-V1`(PASS, Copy 아이콘·infoTextAfter) · `IR-O4O-STORE-CONTENT-PRODUCTION-...-V1`(D 컴포넌트 dedup) — 2026-06-15

---

## 1. 목적

`/store-hub/content` browse 는 3서비스 모두 `ContentHubTemplate` 기반. 잔여 중복은 GP/KCos 의 **near-identical 카드 그리드 wrapper**. 데이터 구조/복사 정책/route 변경 없이 이 중복만 제거.

## 2. 사전 git 상태 / baseline

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `1f23f1787` · origin 동기화(0/0) · staged 없음 |
| **빌드 baseline** | GP/KCos/KPA `tsc --noEmit` **각 0 errors** (직전 IR-...-INTERRUPTED-BUILD 의 LMS/product-applications in-flight 오류는 소관 세션이 해소함 — 깨끗한 검증 가능) |

동시 세션 WIP(`store-ui-core`/`pnpm-lock`·`CHECK-...-ORDER-VIEW` 등)은 미접촉(path-specific).

## 3. 사전 비교 (중복 vs 차이 구분)

| 항목 | KPA | GP | KCos |
|------|-----|-----|------|
| fetch API | **cmsApi**(serviceKey='kpa') | hubContentApi | hubContentApi |
| 탭 | **복합 remap**(notice-news/promo-event 병렬 fetch+merge+client pagination) | 단순 6탭 | 단순 6탭 |
| item mapping | `cmsToItem`(badge color/isNew/isPinned) | `apiItemToContentHubItem` | `apiItemToContentHubItem`(GP와 동일) |
| 렌더 | **DefaultTableView**(기본 테이블) | **카드 그리드**(GlycoCardGrid) | **카드 그리드**(KCosCardGrid) |
| 카드 컴포넌트 | — | GlycoContentCard | KCosContentCard |
| accent | (테이블) | primary | pink |
| 용어 | 내 매장 | **내 약국** | 내 매장 |
| infoLinks route | /store/content | /store/library/contents | /store/library/contents |

> **GP↔KCos**: 카드 컴포넌트(63줄)·카드 그리드(14줄)·adapter 가 accent(primary/pink) 외 **동일** → 추출 대상.
> **KPA**: cmsApi + 복합 탭 remap + 기본 테이블뷰로 **구조 상이** → 단일 wrapper 통합 시 props 과도(중단 기준). **제외.**

## 4. 추출 — `packages/shared-space-ui/src/ContentHubCardGrid.tsx` (신규)

`ContentHubTemplate.renderItems` 시그니처(`(items, ctx) => ReactNode`)에 바로 지정 가능한 팩토리:

```ts
export function contentHubCardGrid(accent: ContentHubCardAccent): (items, ctx) => ReactNode
export type ContentHubCardAccent = 'primary' | 'pink' | 'emerald' | 'blue'
```

- 카드 구조·복사 버튼 상태(idle/copying/copied, Copy/Check/Loader2 아이콘)·빈 상태("등록된 콘텐츠가 없습니다.") 공통.
- **복사 문구는 ctx 로 주입**(`ctx.copyLabel/copiedLabel/copyingLabel`) → "내 매장"/"내 약국" 등 서비스 용어는 config 에서 그대로 전달, 카드는 표시만. **용어 보존.**
- accent 는 **정적 literal 클래스 맵**(`bg-primary-50`…/`bg-pink-50`…) — 동적 `bg-${x}` 금지. GP/KCos tailwind `content` 에 `packages/shared-space-ui/src/**` 포함 확인 → 각 서비스가 자기 팔레트(GP primary / KCos pink) 생성. (Tailwind JIT 안전)
- 직전 WO 의 **Copy 아이콘**(Download 아님) 정렬을 그대로 계승.
- index.ts export 추가.

## 5. 적용 (GP / KCos)

| 서비스 | 제거 | 적용 |
|--------|------|------|
| **GP** `pages/hub/HubContentListPage.tsx` | `GlycoContentCard`+`GlycoCardGrid`(−93줄), 미사용 lucide import, `ContentHubItemContext` import | `renderItems: contentHubCardGrid('primary')` |
| **KCos** `pages/hub/HubContentPage.tsx` | `KCosContentCard`+`KCosCardGrid`(−89줄), 미사용 lucide import, `ContentHubItemContext` import | `renderItems: contentHubCardGrid('pink')` |

- **config(서비스 정체성) 전부 보존**: serviceKey, hero/desc, filters, fetchItems(hubContentApi), loadCopiedIds, **onCopy**(assetSnapshotApi.copy + 용어 toast), **copyLabel**(GP 내 약국 / KCos 내 매장), copiedLabel, afterCopyAction, infoText/**infoTextAfter**/infoLinks, adapter `apiItemToContentHubItem`.
- **KPA 미변경**(구조 상이).
- **ContentHubTemplate 미변경**(renderItems 이미 지원 — 자체 확장 불요).

## 6. 검증

- **TypeScript 0 errors:** `shared-space-ui` · `web-glycopharm` · `web-k-cosmetics` · `web-kpa-society`(미변경) · `web-neture`(shared 소비처) **각 0** (= baseline 0, 신규 오류 0).
- **정적:**
  - GP/KCos `GlycoCardGrid`/`KCosCardGrid`/카드 컴포넌트 **제거**, `contentHubCardGrid('primary'|'pink')` 사용.
  - GP/KCos 잔존 lucide / `ContentHubItemContext` import **0**(카드 외 미사용 확인 후 제거).
  - **copyLabel/onCopy/hubContentApi/serviceKey/href config 변경 0**(diff 의 onCopy/copyLabel 매칭은 전부 삭제된 카드 내부 — 공통으로 이동, 동작 동일).
  - **accent 보존**: GP `primary` / KCos `pink`. **용어 보존**: GP `내 약국에 복사` / KCos `내 매장에 복사`. **Copy 아이콘 계승**.
  - dedup: GP −93 / KCos −89 줄, 공통 카드그리드 1개 신설(+3 index). 2 copies → 1 shared.
- **무변경:** KPA · ContentHubTemplate · API · DB · route · asset snapshot 구조 · dedup 정책 · 복사 완료 로직 · 회원 `/content` · `/resources` · POP/QR/블로그 browse · 운영자 CMS.
- **browser smoke:** 미수행 — dev 서버 미기동·인증 guard. 카드는 동일 마크업/클래스 이동(시각 무변경 기대) + tailwind content(shared-space-ui src) 포함 확인. (배포 후 GP `/store-hub/content`(primary)·KCos `/store-hub/content`(pink) 카드 렌더·복사 버튼 확인 권장.)

## 7. 중단 기준 점검 (§13)

| 기준 | 해당 | 조치 |
|------|:---:|------|
| props 과도 | KPA 통합 시 해당 | KPA 제외, GP/KCos 카드 그리드만 추출 |
| ContentHubTemplate 대폭 변경 필요 | 아니오 | 미변경 |
| route/API 변경 필요 | 아니오 | 무변경 |
| KPA 회귀 위험 | 아니오 | KPA 미접촉 |
| 타 세션 WIP 충돌 | 아니오 | store-hub content 파일은 타 세션(LMS/product-applications)과 무관, path-specific |

→ GP/KCos 카드 그리드 추출은 저위험 — 진행. KPA fold-in 은 **보류**(구조 상이, 별도 판단).

## 7-보충. 잔여 (선택)

- GP/KCos `apiItemToContentHubItem` adapter(~15줄)도 동일하나 서비스별 `HubContentItemResponse` 타입(다른 import 경로)에 의존 → 공통화 시 응답 타입 공유 필요. 본 WO 범위 밖(소폭, 결합도↑). 후속 판단.

## 8. 완료 판정

**PASS.** GP/KCos `/store-hub/content` near-identical 카드 그리드를 `contentHubCardGrid(accent)` 로 공통화. 서비스 용어/API/복사 정책/accent 보존, KPA·ContentHubTemplate·route·API·DB 무변경, typecheck(5) 통과. wrapper 중복 −182줄.

## 9. 후속

1. `WO-O4O-STORE-LIBRARY-DUPLICATE-COPY-UX-POLICY-V1` — 중복 복사 정책.
2. `IR-O4O-STORE-PRODUCTION-MATERIAL-TABLE-CONSOLIDATION-AUDIT-V1` — 다중 테이블 경계 audit.
3. `WO-O4O-OPERATOR-CONTENT-ROUTE-NAME-ALIGNMENT-V1` — `/operator/content` vs `/operator/content-management`.
4. (선택) GP/KCos adapter 공통화(응답 타입 공유 전제) / KPA fold-in 재평가.
5. (선택) browser smoke — GP(primary)·KCos(pink) 카드 렌더.

---

*Date: 2026-06-15 · WO-O4O-STORE-HUB-CONTENT-BROWSE-COMPONENT-EXTRACTION-V1 · GP/KCos 카드 그리드 → contentHubCardGrid(accent) 공통화 PASS. 용어(약국/매장)·API·복사·accent 보존. KPA 제외(구조 상이). typecheck(5) 0. dedup −182줄.*
