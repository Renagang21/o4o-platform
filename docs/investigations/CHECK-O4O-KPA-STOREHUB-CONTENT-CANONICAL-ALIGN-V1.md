# CHECK-O4O-KPA-STOREHUB-CONTENT-CANONICAL-ALIGN-V1

> **작업명:** WO-O4O-KPA-STOREHUB-CONTENT-CANONICAL-ALIGN-V1
> **유형:** KPA `/store-hub/content` 콘텐츠 자료실을 GlycoPharm·K-Cosmetics canonical 로 정렬. **frontend config-only**, additive/정렬.
> **결과: PASS (typecheck) — heroTitle/heroDesc·6-필터·용어(내 약국) canonical 정렬. 컴포넌트·API client·copy 로직·route·링크 대상 무변경. web-kpa-society `tsc -b` exit 0.**
> 선행: IR-O4O-STORE-CONTENT-SURFACE-AUDIT-V1 (§10 후속 WO #1) — 2026-06-17

---

## 1. 조사 정정 (IR 대비)

IR 은 KPA 를 "독자 `HubContentLibraryPage`" 로 기술했으나, 실제로는 **이미 `ContentHubTemplate`(`@o4o/shared-space-ui`) + KPA config adapter** 구조다. 따라서 divergence 는 **`useKpaContentHubConfig` 객체 하나**에만 존재 → 컴포넌트 교체 없이 config 정렬로 canonical 수렴 가능(작업 난이도·리스크 IR 예상보다 낮음).

## 2. 변경 파일 (1 + CHECK)

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx` | config 정렬(프레이밍·필터·용어·display remap 단순화) |

> backend/route/page 라우팅/copy API/import 로직/`o4o_asset_snapshots`/GP·KCos/package·lock **변경 0**.

## 3. 변경 내역 (config-only)

| 항목 | 변경 전 (KPA) | 변경 후 (canonical 정렬) |
|------|---------------|--------------------------|
| heroTitle | "플랫폼 콘텐츠" | **"약국에서 바로 쓰는 콘텐츠"** |
| heroDesc | "본부/공급사가 제공하는 CMS 콘텐츠를 탐색하고 내 매장에 복사합니다." | **"KPA-Society 약국을 위한 콘텐츠 자료실"** |
| searchPlaceholder | "제목 또는 요약 검색" | "콘텐츠 검색" |
| 필터 | `전체/공지·소식/가이드/지식자료/혜택·이벤트` (5, 복합 remap) | **`전체/공지/가이드/지식/프로모션/뉴스` (6, key=CMS DB type)** |
| 복사 라벨 | "내 매장에 복사" | "내 약국에 복사" |
| 복사 toast | "… 내 매장에 복사되었습니다" | "… 내 약국에 복사되었습니다" |
| infoLinks 라벨 | "내 매장 > 자산 관리" | "내 약국 > 자산 관리" |
| infoTextAfter | "… 내 매장 사본 …" | "… 내 약국 사본 …" |
| pageLimit | 20 | 12 |

- **display remap 단순화:** 복합 탭(notice+news → 공지/소식, promo+event → 혜택/이벤트) 제거. 필터 key = CMS DB type 직매핑. `DISPLAY_LABEL_MAP`/배지색을 canonical 라벨(공지/뉴스/가이드/지식/프로모션)로 갱신.
- **'event' legacy 데이터:** 전용 탭 제거되나 **'전체' 탭에서 계속 노출**(배지 라벨 '혜택/이벤트' 유지) → 데이터 은폐 0. (GP·KCos 도 event 탭 없음 — 동일 정책)

## 4. 명시적 무변경 (WO §5 준수)

- **컴포넌트**: `HubContentLibraryPage` + `ContentHubTemplate` 유지(교체 0). `renderItems`(카드 그리드) 도입은 **이번 범위 외**(KPA item shape 차이 — thumbnail 부재/isPinned·isNew — 시각 회귀 방지). 3서비스 완전 템플릿 통합은 별도 IR(#2)로.
- **API client**: KPA `cmsApi.getContents` 유지(hubContentApi 전환 안 함). 필터 key→`type` 파라미터 직대응.
- **copy 로직**: `assetSnapshotApi.copy({ sourceService:'kpa', sourceAssetId, assetType:'cms' })` 호출부 무변경(문구만 정렬).
- **링크 대상**: `afterCopyAction`/`infoLinks` href `/store/content`(StoreAssetsPage=자산 관리) 유지 — 실재·라벨 정합 확인됨(데드링크 아님). canonical(`/store/library/contents`)로의 대상 변경은 route 변경 회피 위해 보류.
- POP/QR/블로그/사이니지 `/store-hub/*` 형제 페이지 / "안내문" 신규 도메인 / store-hub 부모 네비 **무변경**.

## 5. WO §6 확인 항목

1. `/store-hub/content` 라우트 → `HubContentLibraryPage` (App.tsx:699) ✓
2. KPA CMS fetch = `cmsApi.getContents({serviceKey:'kpa'})` (유지) ✓
3. GP·KCos = `ContentHubTemplate` config adapter (동형 확인) ✓
4. KPA 에 template 적용 안전 — 이미 사용 중 ✓
5. config-only 정렬 가능 — 수행 ✓
6. 필터 값 ↔ backend CMS type: filter key(notice/guide/knowledge/promo/news) = `cmsApi` `type` 인자 직대응 ✓
7. '뉴스' 필터 사용 가능: `type='news'` 정상 전달(데이터 없으면 emptyFiltered 안내) ✓
8. '프로모션' 이 기존 '혜택·이벤트' 대체: promo 탭 = promo type, legacy event 는 '전체' 노출 유지 ✓

## 6. 검증

- **typecheck PASS:** `services/web-kpa-society` `tsc -b` exit 0.
- 정적: filters 6개·key=DB type, 복합 remap 제거 후 단일 fetch 경로, 용어 '내 약국' 일관, 링크 대상 실재(`/store/content`). GP·KCos 파일 미수정(무회귀).
- **배포 PASS:** main 푸시(`6418988ee`) → CI `Deploy Web Services` `deploy-kpa-society → success` (deploy-neture/glycopharm/k-cosmetics → skipped, 정상). KPA 단독 배포 확인.
- **browser smoke 미수행 → 별도 SMOKE 로 분리.** 사유: 본 WO 는 **config-only 변경 + `tsc -b` PASS**, backend/route/API/DB·타서비스 무변경으로 회귀 위험 낮음 + 로컬 Playwright persistent 프로필이 실행 중 Chrome 세션에 잠겨 자동 실행 불가(사용자 브라우저 종료 부담 회피). 운영 화면 확인은 후속 `SMOKE-O4O-KPA-STOREHUB-CONTENT-CANONICAL-ALIGN-POST-DEPLOY-V1` 로 분리.
  - smoke 체크리스트(후속): `/store-hub/content` 제목 "약국에서 바로 쓰는 콘텐츠" / 설명 "KPA-Society 약국을 위한 콘텐츠 자료실" / 6-필터(전체·공지·가이드·지식·프로모션·뉴스) / 복사 버튼·안내문구 '내 약국' / `/store-hub/{blog,pop,qr,signage}` 무영향 / console error 0 / GP·KCos `/store-hub/content` 무변경.

## 7. 완료 판정

**PASS (typecheck + 배포).** KPA `/store-hub/content` 프레이밍·6-필터·용어를 GP·KCos canonical 로 정렬. POP/QR/블로그/사이니지 탭 미추가, backend/route/copy/링크대상/타서비스/package 무변경. KPA 단독 배포 success. **browser smoke 는 별도 SMOKE 로 분리**(config-only·tsc PASS 근거로 본 WO 는 종료).

---

*Date: 2026-06-17 · KPA store-hub content canonical 정렬 · config-only(HubContentLibraryPage) · heroTitle "약국에서 바로 쓰는 콘텐츠" + 6-필터(전체/공지/가이드/지식/프로모션/뉴스) + '내 약국' 용어 · 컴포넌트/cmsApi/copy/route/링크대상 무변경 · legacy event 는 전체 탭 노출 유지 · web-kpa-society tsc -b exit 0 · GP·KCos·backend·DB 무변경.*
