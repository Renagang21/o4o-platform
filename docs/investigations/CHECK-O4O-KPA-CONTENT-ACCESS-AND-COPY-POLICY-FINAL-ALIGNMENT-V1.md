# CHECK-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1

> **WO:** WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1
> **작성일:** 2026-07-26
> **유형:** 접근·복사 게이트 정렬(백엔드 3 + 프론트 1). 신규 API·테이블·migration·권한체계 0.
> **상태:** ✅ 완료 — 배포·프로덕션 smoke 완료. **비공개 콘텐츠 노출 취약점 배포 전/후 실증 차단**

---

## 1. 기존 접근·복사 계약

| 대상 | 기존 게이트 |
|------|-------------|
| `GET /contents` (목록) | 비로그인 `published` / 로그인 `published OR 본인` / 운영자 `status=all` 전체 / **명시 `?status=` 요청 시 해당 상태** |
| `GET /contents/:id` (상세) | **`id + is_deleted=false` 뿐** ← 상태 게이트 없음 |
| `resolveContent` (복사) | `is_deleted=false` · `sub_type≠resource` · `reusable_policy≠restricted` ← **상태 게이트 없음** |
| `resolveSignage` (복사) | `deletedAt IS NULL` · `status='active'` ← **serviceKey/scope/source 없음** |
| `allowedAssetTypes` | `cms, signage, content, resource, blog, pop, qr` (copy·목록조회 공용) |

---

## 2. 발견한 정책 불일치 (3건)

| # | 불일치 | 영향 |
|---|--------|------|
| **1** | 상세가 상태를 검사하지 않음 | **비공개(draft/private) 콘텐츠가 ID 만으로 누구에게나 노출** |
| **2** | 복사 resolver 가 상태를 검사하지 않음 | **draft/private 콘텐츠를 매장 사본으로 생성 가능** |
| **3** | signage resolver 에 서비스 격리 없음 | **다른 서비스의 활성 미디어를 KPA 매장으로 복사 가능** |

### 실증 (배포 전 프로덕션)

```
GET /api/v1/kpa/contents/7d81c00e…  (status=draft, 비로그인)
→ HTTP 200, success=true, status="draft", title="자일리톨의 항우식작용"
```

---

## 3. 상세 접근 가드

**목록의 기존 정책을 그대로 상세에 적용**했다(WO §2 "더 엄격한 기존 정책 우선" · 공개 범위 확대 금지).

| 주체 | 조회 가능 |
|------|-----------|
| 비로그인 | `published` |
| 로그인 | `published` · `ready` · **본인 소유 전부**(draft/private 포함) |
| 운영자/관리자 | 전체 (기존 관리 범위, `isKpaOperatorOrAdmin` 재사용) |

- **`ready` 를 로그인 사용자에게 허용한 근거:** 매장 HUB 콘텐츠 허브가 `status='ready'` 로 조회하고,
  제작 자료 선택 흐름(`SelectContentsForProductionModal` → `getContentHubItem` → `GET /contents/:id`)이
  이를 소비한다. 제외하면 매장 경영자의 제작 흐름이 끊긴다.
- 존재 여부 노출을 피하려 **403 이 아니라 기존 404 형식**(`NOT_FOUND`)을 그대로 재사용했다. 신규 오류 체계 0.

---

## 4. 상태별 복사 가드

`resolveContent` 에 **Gate 4** 추가 — `status ∈ {ready, published}` 만 통과.

| 상태 | 복사 |
|------|:----:|
| `published` | ✅ |
| `ready` | ✅ (운영자 콘텐츠 기본 상태 · HUB 소비) |
| `draft` | ❌ 404 |
| `private` | ❌ 404 |
| `restricted`(reusable_policy) | ❌ (기존 게이트 유지) |
| `sub_type='resource'` | ❌ (기존 게이트 유지) |
| `is_deleted` | ❌ (기존 게이트 유지) |

> 종전 주석의 "운영자 콘텐츠도 가져갈 수 있어야 하므로 status 게이트 미적용" 의도는 유지된다 —
> 운영자 콘텐츠는 `ready` 로 저장되어 통과하고 draft/private 만 막힌다.

---

## 5. 서비스 간 자산 격리

### 사이니지

`resolveSignage` 에 HUB 조회와 **동일 기준** 추가:

```sql
AND "serviceKey" = 'kpa-society'
AND "scope" = 'global'
AND "source" IN ('hq', 'supplier', 'community')
```

기준 출처: `HubContentQueryService.querySignageMedia` 및 공개 상세 API(`/public/media/:id`) — 셋이 일치한다.

#### `source='store'` 제외는 **의도된 정책** (현행 유지, 명문화 완료)

| 항목 | 내용 |
|------|------|
| `store` 의 의미 | **개별 매장이 직접 올린 매장 전용 자산** |
| HUB 공유 대상 | `hq`(본사) · `supplier`(공급자) · `community`(회원 공개) **3종** |
| 기존 계약 | `HubContentQueryService.querySignageMedia` · 공개 목록 API · 공개 상세 API **모두 이 3종만 노출** |
| 판단 | 본 resolver 가 새 정책을 정한 것이 아니라 **기존 HUB 공유 계약을 그대로 따른 것**이다. 한 매장의 자산이 다른 매장으로 재복사되면 매장 간 자산 유출이 되므로 **제외가 옳다 → 현행 유지** |
| 선례 | `resolveBlog`/`resolvePop` 도 `author_role='store'` 를 배제했다("매장 직접 작성 자산은 HUB 가져가기 대상 아님") — 동일 원칙 |

→ WO 분기 중 **"개별 매장 제작 자산이므로 다른 매장 재복사 금지 → 현행 유지"** 에 해당한다. 코드 주석에도 근거를 남겼다.

> 참고(별개 사안): Home 최신글의 사이니지 config 는 `sources: ['hq','store']` 로 **HUB 계약과 다르다**
> (store 포함 / supplier·community 제외). 이는 복사 게이트가 아니라 **Home 노출 범위 설정**이며
> 선행 CHECK(FINAL-STABILIZATION §3-2)에서 정책 판단 항목으로 보고했다. 본 WO 에서 변경하지 않았다.

### 콘텐츠 (`kpa_contents`)

**KPA 전용 테이블**로 서비스 식별 컬럼이 없다(전수 확인). 격리가 구조적으로 내재되어 별도 필터가 불필요하다.

### CMS (`cms_contents`) — ⚠️ **보완 조사에서 격리 부재 발견 → 수정** (§5-1)

초판에서는 "service_key 정합은 listing 단 담당" 으로 남겼으나, **재확인 결과 실제로 차단되지 않았다.**

| 항목 | 확인 |
|------|------|
| 테이블 성격 | **서비스 공용** — `@Entity('cms_contents')`, 4개 서비스가 공유 |
| 범위 필드 | **있음** — `serviceKey: string \| null` (`'kpa'` / `'glycopharm'` / `'neture'` / `null`=global) |
| `resolveCms` 기존 게이트 | `{ id, status: 'published' }` — **serviceKey 없음** |
| 차단 여부 | ❌ **차단되지 않음** |

**프로덕션 실증 (수정 전):** KPA `/assets/copy` 에 다른 서비스의 published CMS ID 를 직접 전달

```
assetType='cms', id=857ac192…(GlycoPharm) → 201 CREATED "서비스 이용 안내"
assetType='cms', id=548219c3…(Neture)     → 201 CREATED "네뚜레 플랫폼 오픈 안내"
```

→ 다른 서비스의 운영 콘텐츠가 KPA 매장 자료함으로 그대로 복사됐다. (생성된 사본 2건은 즉시 삭제 — §13)

**최소 수정:** `resolveCms` 에 **기존 목록 계약과 동일한 키 집합**으로 범위 강제.

```ts
where: { id, status: 'published', serviceKey: In(['kpa', 'kpa-society']) }
```

| 근거 | 값 |
|------|-----|
| HUB 목록(`cmsApi.getContents` 기본) | `serviceKey='kpa'` |
| Home·공용 조회(`ContentQueryService` KPA config) | `serviceKey IN ('kpa-society','kpa')` |
| `global(null)` | **제외** — 두 목록 어디에도 노출되지 않으므로 복사 대상이 아니다. 포함하면 "목록에 없는 자산이 복사되는" 우회를 다시 만들게 된다 |

새 필드·테이블·migration 없이 **기존 구조 안의 WHERE 조건 1개** 추가다.

---

## 6. assetType 최종 허용·차단

| assetType | 신규 사본 생성 | 기존 사본 조회 | 처리 |
|-----------|:---:|:---:|------|
| `content` | ✅ 201 | ✅ | 상태·자료실·restricted 게이트 통과 시 |
| `signage` | ✅ 201 | ✅ | 서비스 격리 게이트 통과 시 |
| `cms` | ✅ | ✅ | **유지** (§7) |
| `resource` | ❌ 404 | ✅ | 선행 WO 에서 차단 |
| `blog` | ❌ 404 | ✅ | **본 WO 차단** — 분기·resolver 제거 |
| `pop` | ❌ 404 | ✅ | **본 WO 차단** |
| `qr` | ❌ 404 | ✅ | **본 WO 차단** |
| `forum` | ❌ 400 | — | 목록 미등록(구조적 부재) |

**`allowedAssetTypes` 는 변경하지 않았다.** 이 목록은 copy 와 목록 조회(`GET /assets?type=`)에 공용이라
제거하면 기존 사본 조회가 400 으로 깨진다(예: `StoreLibraryResourcesPage`). `lesson`·`resource` 선례와 동일하게 **resolver 에서만 생성 경로를 닫았다.**

**blog/pop/qr 차단의 실사용 영향 0** — 매장 가져가기는 asset-snapshot 이 아니라 전용 import 엔드포인트가 담당한다(`HubBlogLibraryPage=importOperatorBlog` · `HubPopLibraryPage=importOperatorPop` · `HubQrLibraryPage=importOperatorQr`). `StoreAssetSelectorModal` 의 `assetType:'blog'` 는 로컬 셀렉터 결과 라벨이며 복사 호출이 아니다.

---

## 7. cms 처리 판단 — **유지** (WO §D 조사 결과)

| 항목 | 내용 |
|------|------|
| 대상 테이블 | `cms_contents` (kpa_contents 와 **별개**) |
| 실사용 소비처 | `HubContentLibraryPage` '운영 자료' 탭(`assetType='cms'` 복사) · `ContentManagementPage`(운영자) |
| 게이트 | `resolveCms` 가 `status='published'` 강제 |
| 판단 | **별도 운영 콘텐츠 계약이며 현재 canonical 복사 경로 → 제거 시 운영 콘텐츠 복사가 중단된다.** WO §D 의 "유지 필요성을 보고" 케이스로 처리하고 **임의 제거하지 않았다.** |
| 정책 정합 | `cms` 는 '콘텐츠' 범주이므로 "복사 허용 = 콘텐츠·디지털사이니지" 정책에 위배되지 않는다 |

`content` 로의 통합은 테이블·계약이 달라 데이터 이관이 필요하므로 본 WO 범위 밖이다.

---

## 8. 기존 사본 호환

- `allowedAssetTypes` 무변경 → `GET /assets?type=resource|blog|pop|qr` **조회 정상**.
- 기존 사본 **삭제·마이그레이션 0**.
- 검증에서 `type=resource` 200 확인(선행 WO), 본 WO 에서 목록 API 계약 변경 없음.

---

## 9. Home 오류 처리

`CommunityHomePage` 최신글이 API 실패를 `[]` 로 삼켜 **"등록된 글이 없습니다"** 로 위장하던 것을 분리했다.

| 상황 | 표시 |
|------|------|
| 실제 0건 | `등록된 글이 없습니다` (기존) |
| API 실패 / 계약 위반(비배열) | **`최신글을 불러오지 못했습니다` + `다시 시도`** |

기존 컴포넌트 안에서 state 2개(`error`, `reloadKey`)만 추가했고 신규 오류 시스템은 만들지 않았다.

---

## 10. 변경 파일 (4)

| 파일 | 변경 |
|------|------|
| [routes/kpa/kpa.routes.ts](../../apps/api-server/src/routes/kpa/kpa.routes.ts) | 상세 접근 가드 추가 |
| [modules/asset-snapshot/resolvers/kpa-asset.resolver.ts](../../apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts) | content status 게이트 · signage 서비스 격리 · blog/pop/qr 분기·resolver 제거 · 헤더/주석 정합 · **(보완) resolveCms serviceKey 범위 강제 · store 제외 근거 명문화** |
| [routes/o4o-store/controllers/asset-snapshot.controller.ts](../../apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts) | **주석만** — allowlist 와 실제 생성 가능 타입의 차이 명시(코드 무변경) |
| [pages/CommunityHomePage.tsx](../../services/web-kpa-society/src/pages/CommunityHomePage.tsx) | 최신글 오류/0건 구분 + 다시 시도 |

**다른 세션 WIP 미스테이징:** `pnpm-lock.yaml`, `apps/api-server/src/scripts/otc-*`

---

## 11. typecheck / build

| 대상 | 결과 |
|------|:----:|
| web-kpa-society `tsc --noEmit` | ✅ 0 |
| web-kpa-society `vite build` | ✅ 성공 (25.53s) |
| api-server `tsc` (변경 3파일) | ✅ 0 errors (잔존 오류는 병행 세션 `drug-otc-*`·`hff-*`, 미접촉) |

---

## 12. 브라우저 · API smoke

**배포:** Web ✅ success. API 는 본 커밋 run 이 병행 세션 push 로 cancelled 되어, 커밋을 포함한 후속 run(`30193318732`) **success** 로 반영 확인.

### 12-1. 상세 접근 — 배포 전/후 비교

| 케이스 | 배포 전 | 배포 후 | 판정 |
|--------|:---:|:---:|:---:|
| **비로그인 + draft** | **HTTP 200 (본문·상태 노출)** | **HTTP 404** | ✅ **취약점 차단** |
| 비로그인 + published | 200 | **200** | ✅ 회귀 없음 |
| 로그인(소유자) + draft | 200 | **200** | ✅ 소유자 우회 정상 |
| 로그인 + published | 200 | **200** | ✅ |

> 로그인 계정 `renagang21` = `6967ebe0-…` 이고 draft 소유자도 `6967ebe0` 임을 JWT 로 확인 →
> 위 200 은 가드 실패가 아니라 **의도된 소유자 우회**다.

### 12-2. 복사 게이트

| 요청 | 결과 |
|------|:----:|
| `content` + draft | **404 `SOURCE_NOT_FOUND`** ✅ |
| `content` + published 문서형 | **201 CREATED** ✅ |
| `signage` + KPA community 미디어 | **201 CREATED** ✅ |
| `content` + 자료실 id(우회) | **404** ✅ (선행 WO 유지) |
| `resource` | **404** ✅ |
| `blog` | **404** ✅ |
| `pop` | **404** ✅ |
| `qr` | **404** ✅ |
| `forum` | **400 `INVALID_ASSET_TYPE`** ✅ |

### 12-3. Home 오류/빈 데이터 구분

`/home/latest` 만 실패하도록 네트워크를 주입한 뒤 탭 전환:

```
최신글을 불러오지 못했습니다  +  [다시 시도]     ✅
"등록된 글이 없습니다" 오표시  →  없음            ✅
```

### 12-4. 회귀

`/` · `/forum` · `/content` · `/resources` · `/lms` · `/signage` · `/store/library/contents` 정상.
자료실 링크·다운로드, 콘텐츠 검색·상세, 가져오기 CTA 정상.

---

## 13. 테스트 데이터 정리

| ID | 용도 | 소유자 | 정리 |
|----|------|--------|------|
| `6b38210d-3943-49f8-b7e2-86cfdef1bde8` | content 복사 허용 검증 | renagang21 매장 | `DELETE` **200 `deleted:true`** |
| `a4832d66-31d0-41c5-80a3-975d2bac0319` | signage 복사 허용 검증 | 동일 | `DELETE` **200 `deleted:true`** |
| `04966e5a-1059-4044-94f7-827e501891d2` | **CMS 격리 실증**(GlycoPharm "서비스 이용 안내" 유출 사본) | 동일 | `DELETE` **200 `deleted:true`** |
| `af1e668b-f88a-44c5-8216-791c2690ae67` | **CMS 격리 실증**(Neture "네뚜레 플랫폼 오픈 안내" 유출 사본) | 동일 | `DELETE` **200 `deleted:true`** |

재조회 시 4개 ID 모두 **부재**(`stillPresent: 0`). **신규 콘텐츠·픽스처는 생성하지 않았다**(기존 draft `7d81c00e…`, 타 서비스 CMS 원본은 읽기 전용 참조 — 원본 변경·삭제 0).

---

## 14. 미검증 항목 (PASS 처리하지 않음)

| 항목 | 사유 |
|------|------|
| **비소유자 일반 로그인 사용자 + draft/private → 차단** | prod 에 일반 회원 테스트 계정이 없다(`renagang21`=소유자, `sohae2100`=operator/admin 우회). 코드상 동일 조건문의 다른 분기이며, **비로그인 404 로 해당 조건문이 동작함은 실증**됐다 |
| `private` 상태 콘텐츠 | prod 에 `private` 데이터 0건 |
| `ready` 상태 복사 | prod 에 `ready` 데이터 0건 (게이트에는 포함) |
| **다른 서비스 signage ID → 차단** | GlycoPharm·K-Cosmetics·Neture 에 공개 사이니지 미디어가 **0건**이라 부정 검증용 실데이터가 없다. KPA 미디어 복사 정상(201)으로 **과차단이 아님은 확인** |

---

## 15. 남은 정책 판단

| 항목 | 내용 |
|------|------|
| Home 사이니지 `source='community'` 포함 여부 | 선행 CHECK(FINAL-STABILIZATION §3-2)에서 보고한 미결 사항. 본 WO 에서 **임의 변경하지 않았다**(WO §5 명시) |
| GP·K-Cosmetics·Neture | 같은 shared controller 를 mount 하므로 본 resolver 변경이 그 mount 에도 적용된다. 단 **해당 서비스 코드는 수정하지 않았고**(WO §5), 이 resolver 는 원래 KPA 자산만 해석하므로 의미 변화가 없다 |
| `cms` → `content` 통합 | 테이블·계약이 달라 데이터 이관 필요 — 별도 판단 |

---

*End of CHECK-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1*
