# CHECK-O4O-KPA-FORUM-RESOURCE-STORE-COPY-REMOVAL-V1

> **WO:** WO-O4O-KPA-FORUM-RESOURCE-STORE-COPY-REMOVAL-V1
> **작성일:** 2026-07-26
> **정책:** 매장 복사 허용 = **콘텐츠 · 디지털사이니지** 2종. 포럼·자료실은 복사 금지.
> **유형:** frontend 2 + backend 2 파일. 신규 테이블·migration·오류 체계 0. 기존 사본 삭제 0.
> **상태:** ✅ 코드 완료 / tsc 0 · build 성공 — 브라우저·API smoke 는 배포 후(§11)

---

## 1. 기존 포럼 복사 진입점

**존재하지 않았다.** 전수 조사 결과 포럼에는 매장 복사 경로가 프론트·백엔드 어디에도 없다.

| 확인 대상 | 결과 |
|-----------|------|
| 포럼 목록/상세/Drawer/컨텍스트 메뉴/일괄 선택 | 복사 UI **0** |
| `assetSnapshotApi.copy` 호출 | 포럼 관련 호출 **0** |
| `allowedAssetTypes` | `forum` **미등록** |
| `KpaAssetResolver` | forum 분기 **없음** |

→ 포럼은 **제거할 코드가 없다.** 정책상 이미 "읽기·작성·댓글" 영역이며, 서버는 `assetType='forum'` 요청을 기존 `400 INVALID_ASSET_TYPE` 으로 거부한다(허용 목록 미등록).

---

## 2. 기존 자료실 복사 진입점 (2곳 + 서버 2경로)

| # | 화면 | 라우트 | 호출 | 비고 |
|---|------|--------|------|------|
| 1 | `ResourcesHubPage` | `/resources` | `assetSnapshotApi.copy({ assetType: 'resource' })` | store_owner 에게만 노출되던 "내 자료함 가져가기" |
| 2 | `ContentDocumentsPage` (subType='resource') | `/content/resources` | `importContentToStore()` → **`assetType: 'content'`** | 행 액션 · Drawer · 일괄(ActionBar) 3종. `isResource` 게이트가 **없었다** |

### ⚠️ 서버 우회 경로 (핵심 발견)

자료실도 `kpa_contents` 를 쓰는데 `resolveContent()` 에 `sub_type` 필터가 없어,
**`assetType='content'` 로 자료실 항목을 그대로 복사할 수 있었다.**
따라서 `'resource'` 타입만 막는 것으로는 불충분했다 — §4 에서 두 경로 모두 차단.

---

## 3. 프론트 제거 범위

| 파일 | 제거 내용 |
|------|-----------|
| `ResourcesHubPage.tsx` | `onCopyToStore` 콜백 **전체 제거**(호출 경로 포함) · `assetSnapshotApi` import 제거 · 불필요해진 `isStoreOwner` 판정/인자/의존성 제거 → 템플릿이 가져가기 액션을 렌더하지 않음 |
| `ContentDocumentsPage.tsx` | `isResource` 일 때 **행 액션 · Drawer 액션 · 일괄 ActionBar** 의 가져가기 미제공. 문서형(`subType='content'`)은 **기존 그대로 유지** |

단순 숨김이 아니라 **호출 경로 자체를 제거**했다(WO §5). 복사 성공 토스트·완료 CTA 도 자료실 경로에서는 더 이상 발생하지 않는다.

---

## 4. 서버 허용·차단 구조

| 계층 | 처리 | 응답 |
|------|------|------|
| `KpaAssetResolver.resolve()` | **`'resource'` 분기 제거** → `return null` 로 낙하 | **404 `SOURCE_NOT_FOUND`** (기존 코드) |
| `KpaAssetResolver.resolveContent()` | `AND (sub_type IS NULL OR sub_type <> 'resource')` 추가 → content 타입 우회 차단 | **404 `SOURCE_NOT_FOUND`** |
| `resolveResource()` | 도달 불가가 되어 **함수 제거**(dead code) | — |
| `allowedAssetTypes` | **변경 없음** (`cms, signage, content, resource, blog, pop, qr`) | — |
| 포럼(`assetType='forum'`) | 허용 목록 미등록 | **400 `INVALID_ASSET_TYPE`** (기존 코드) |

### `allowedAssetTypes` 에서 `'resource'` 를 빼지 않은 이유 (중요)

이 목록은 copy 뿐 아니라 **목록 조회에도 사용된다**
([create-asset-copy-controller.ts:96](../../packages/asset-copy-core/src/factory/create-asset-copy-controller.ts#L96) copy / [:181](../../packages/asset-copy-core/src/factory/create-asset-copy-controller.ts#L181) list).

`'resource'` 를 제거하면 **기존에 가져간 자료 사본을 보는 화면이 400 으로 깨진다**
— `StoreLibraryResourcesPage`(`/store/library/resources`)가 `GET /assets?type=resource` 를 호출한다
([StoreLibraryResourcesPage.tsx:199](../../services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx#L199)).

WO §10(기존 사본 유지)을 지키기 위해 **차단은 resolver 에서만** 수행했다. 선행 `lesson` 제거 선례와 동일한 방식이다("신규 생성 경로만 닫고 기존 row 조회 호환은 유지").

### 공용 controller 영향 확인 (CLAUDE.md Shared Module Rule)

`createAssetSnapshotController` 는 KPA·GlycoPharm·K-Cosmetics·Neture **4개 서비스가 공유**한다(설정·resolver 는 파일 내부 하드코딩, `sourceService:'kpa'`).

- GP/K-Cos/Neture 프론트에서 `assetType: 'resource'` **복사 호출 0건**(그들의 `resource` 참조는 목록 조회용 `sub_type` 필터일 뿐).
- 본 작업은 `allowedAssetTypes` 를 건드리지 않았고 resolver 분기만 제거 → **타 서비스 복사 동작 영향 0**.

---

## 5. 콘텐츠·사이니지 복사 유지 (변경 없음)

| 경로 | 상태 |
|------|:----:|
| 콘텐츠 단일 복사 (`/content` 목록·Drawer·상세) | ✅ 유지 |
| 콘텐츠 일괄 복사 | ✅ 유지 |
| 콘텐츠 restricted 차단 | ✅ 유지 |
| 문서형 전체 목록(`/content/documents`) 복사 | ✅ 유지 |
| 매장 HUB 콘텐츠(`cms`/`content`) 복사 | ✅ 유지 |
| 디지털사이니지 복사(`signage`, HUB·MediaDetailPage) | ✅ 유지 |
| 공용 복사 API 자체 | ✅ 유지(삭제하지 않음) |

`resolveContent` 에 추가한 필터는 `sub_type='resource'` 만 제외한다. 문서형은 `sub_type='content'` 이므로 영향 없다(Home latest 쿼리가 쓰는 동일 패턴).

---

## 6. 자료실 기능 유지 (WO §8)

목록 · 검색 · 상세/Drawer · 파일 다운로드 · 첨부파일 · 외부 링크 · 작성/수정/삭제 — **모두 무변경**.
`usage_type`(READ/LINK/DOWNLOAD/COPY) 기반 액션 매핑과 다운로드 경로는 복사 API 에 의존하지 않는다(중지 조건 미해당).
자료실을 콘텐츠로 변환하거나 대체 복사 기능을 만들지 **않았다**.

---

## 7. 포럼 기능 유지 (WO §9)

목록 · 검색 · 상세 · 작성 · 수정 · 삭제 · 댓글 · 반응 · 링크 복사 — **코드 무변경**(애초에 복사 경로가 없어 손댈 곳이 없었다). 포럼→콘텐츠 전환 기능도 만들지 않았다.

---

## 8. 기존 포럼·자료실 사본 존재 여부

- **자동 삭제 0 · 일괄 삭제 0 · migration 0** (WO §10 준수).
- 기존 `asset_type='resource'` 사본은 그대로 유지되며 `/store/library/resources` 에서 계속 조회·사용 가능하다(§4 참조).
- 포럼 사본은 타입 자체가 없어 **존재할 수 없다**.
- 실제 잔존 수량은 운영 DB 조회가 필요하며, 본 작업은 read-only 검증 범위에서 수행하지 않았다 — 필요 시 `SELECT count(*) FROM o4o_asset_snapshots WHERE asset_type='resource'` 로 확인 가능.

---

## 9. 변경 파일 (4)

| 파일 | 변경 |
|------|------|
| [pages/resources/ResourcesHubPage.tsx](../../services/web-kpa-society/src/pages/resources/ResourcesHubPage.tsx) | `onCopyToStore` 제거 · import/`isStoreOwner` 정리 |
| [pages/contents/ContentDocumentsPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx) | `isResource` 일 때 행/Drawer/일괄 가져가기 미제공 |
| [modules/asset-snapshot/resolvers/kpa-asset.resolver.ts](../../apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts) | `resource` 분기 제거 · `resolveResource()` 삭제 · `resolveContent` 에 sub_type 필터 추가 · 헤더 갱신 |
| [routes/o4o-store/controllers/asset-snapshot.controller.ts](../../apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts) | 주석만 — allowlist 존치 근거 명시(코드 무변경) |

**다른 세션 WIP 미스테이징:** `pnpm-lock.yaml`, `apps/api-server/src/scripts/otc-external-site-recovery-approval.ts`

---

## 10. typecheck / build

| 대상 | 결과 |
|------|------|
| web-kpa-society `tsc --noEmit` | ✅ **0 errors** |
| web-kpa-society `vite build` | ✅ **성공** (15.50s) |
| api-server `tsc --noEmit` | ✅ **변경 파일 0 errors** (잔존 오류는 병행 세션 `drug-otc-*`·`hff-*` 스크립트, 본 작업 미접촉) |

---

## 11. 브라우저 · API smoke

**배포:** Deploy Web Services ✅ success · Deploy API Server ✅ success (`ab4c31b53`)

### 11-1. 화면 검증 (비로그인 상태에서 수행)

| # | 화면 | 결과 | 근거 |
|---|------|:----:|------|
| 1 | `/content/resources` (자료실) | ✅ **PASS** | 자료 3건 정상 렌더, **행 액션 메뉴 자체가 없음**(마지막 셀 버튼 0), 페이지 전체에 가져가기 문자열 0 |
| 2 | `/content/documents` (문서형, 회귀) | ✅ **PASS** | 동일 컴포넌트인데 마지막 셀에 **액션 버튼 1개 유지** → `isResource` 분기만 동작, 문서형 회귀 없음 |
| 3 | `/resources` (자료실 허브) | ✅ **PASS** (단, §11-2 주의) | 페이지·검색·자료 3건 정상, 오류 문구 없음 |

> #1 과 #2 는 **같은 파일(ContentDocumentsPage)** 이 subType 만 달리 렌더한 결과를 직접 비교한 것이라, 제거가 자료실에만 적용됐음을 보여주는 가장 강한 증거다.

### 11-2. `/resources` 에 남아 있는 "가져가기" 버튼 — 매장 복사 아님 (확인 완료)

smoke 중 `/resources` 자료 행마다 **"가져가기" 버튼이 남아 있는 것**을 발견해 원인을 추적했다.

공용 `ResourcesHubTemplate` 의 이 버튼은 **두 동작 겸용**이다
([ResourcesHubTemplate.tsx:666-694](../../packages/shared-space-ui/src/ResourcesHubTemplate.tsx#L666-L694)):

```
isStoreTarget = !!config.onCopyToStore && reusable_policy !== 'restricted'
  true  → config.onCopyToStore(row.id)   ← 매장 자료함 복사
  false → handleTakeAction(row, e)       ← 자료 이용
```

본 WO 에서 `onCopyToStore` 를 제거해 **`isStoreTarget` 이 항상 false** 가 되었고, 버튼은
`handleTakeAction` — **외부 링크 열기 / 다운로드 / 본문 클립보드 복사** 로만 동작한다
(`assetSnapshotApi` 미호출). 즉 **매장 복사 경로는 제거되었고**, 남은 동작은 WO §8 이
"유지하라"고 명시한 자료 이용 기능이다.

⚠️ **라벨 혼동 가능성(후속 권장):** 자료 이용 액션의 라벨이 "가져가기" 라서 매장 복사로
오인될 수 있다. 다만 이 라벨은 **공용 템플릿의 기존 동작**이며 GlycoPharm·K-Cosmetics 도
같은 템플릿을 쓰므로, 본 WO 범위(§11 "공통 UI 변경 금지" · 중지 조건 "공용 컴포넌트 변경이
다른 서비스에 영향")에서 변경하지 않았다. 라벨 정비는 별도 작업 대상.

### 11-3. 미검증 항목 (세션 확보 실패)

**인증이 필요한 API 우회 검증(WO §13)을 수행하지 못했다.**

| 미검증 | 기대값(코드 근거) |
|--------|------------------|
| `copy { assetType:'forum' }` | 400 INVALID_ASSET_TYPE (허용 목록 미등록) |
| `copy { assetType:'resource', 자료실 id }` | 404 SOURCE_NOT_FOUND (resolve 분기 제거) |
| `copy { assetType:'content', 자료실 id }` 우회 | 404 SOURCE_NOT_FOUND (sub_type 필터) |
| `copy { assetType:'content', 문서형 id }` | 201 정상 |
| `GET /assets?type=resource` | 200 (기존 사본 조회 호환) |
| `/forum` 작성·댓글 회귀 / 기존 사본 조회 회귀 | 정상 |

**사유:** Playwright MCP 브라우저 프로필이 반복적으로 잠기고(`Browser is already in use`)
강제 종료를 되풀이하는 과정에서 로그인 세션이 유실됐다. 재로그인은 성공했으나
(`/admin` 리다이렉트 확인) 이 배포는 **access token 을 localStorage 에 남기지 않고
메모리에 보관**하며 인증 쿠키는 `api.neture.co.kr` 도메인의 httpOnly 라, 페이지
`evaluate` 에서 인증 요청을 재현할 수 없었다. 전체 리로드 시 토큰이 사라져
`/store/library/resources` 는 `/login` 으로 리다이렉트됐다.

→ **추정으로 PASS 처리하지 않고 미검증으로 남긴다.** 서버 차단은 §4 의 코드 경로
(resolve 분기 제거 + sub_type 필터)로만 확인된 상태이며, 인증 세션이 안정된 환경에서
1회 재확인을 권장한다.

### 11-4. 테스트 데이터

**검증 과정에서 사본을 생성하지 않았다**(copy 요청이 인증 실패로 서버에 도달하지 않음).
정리할 테스트 데이터 없음.

---

## 12. 변경하지 않은 범위

```
콘텐츠 복사 정책 · 디지털사이니지 복사 정책 · 콘텐츠 가져오기 CTA · 사이니지 UI
자료실 다운로드 방식 · 포럼 커뮤니티 기능 · 자료실 route 이원화 · 로그인 유도
태그 정책 · Home 구조 · 신규 테이블 · migration · 신규 오류 체계
공용 복사 API 삭제 · allowedAssetTypes 목록 · 타 서비스(GP/KCos/Neture) 동작
기존 사본 데이터
```

---

*End of CHECK-O4O-KPA-FORUM-RESOURCE-STORE-COPY-REMOVAL-V1*
