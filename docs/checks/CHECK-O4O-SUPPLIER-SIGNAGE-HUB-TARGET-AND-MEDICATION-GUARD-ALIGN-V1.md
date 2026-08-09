# CHECK-O4O-SUPPLIER-SIGNAGE-HUB-TARGET-AND-MEDICATION-GUARD-ALIGN-V1

> **최종 상태: `CANCEL` / 정책상 미진행** (2026-08-09 사용자 확정)
> **경로:** 조사 → `HOLD`(중지 조건 4건) → 정책 확정 → **`CANCEL`**
> **작성일:** 2026-08-09
> **선행:** `IR-O4O-KPA-STORE-QR-TABLET-CONTENT-FLOW-AUDIT-V1 §11-E / §12 WO-3`
> **변경:** 코드 0 · migration 0 · DB write 0 · 배포 0 · UI 0. 본 CHECK 문서 1건만 생성.

---

## 0-A. 최종 결정 (사용자 확정 — 2026-08-09)

```text
WO-O4O-SUPPLIER-SIGNAGE-HUB-TARGET-AND-MEDICATION-GUARD-ALIGN-V1
최종 상태: CANCEL / 정책상 미진행
사유:
Signage 는 의약품 판정 대상이 아니며,
상품 분류 기반 가드를 붙이지 않는 기존 정책을 유지한다.
```

후속 자기신고 대안도 **진행하지 않는다.**

```text
WO-O4O-SUPPLIER-SIGNAGE-HUB-SELF-DECLARED-TARGET-GUARD-V1
진행하지 않음
```

> 자기신고 target 역시 결국 **공급자에게 "이 콘텐츠의 약국/의약품 적합성"을 판단시키는 구조**가 된다.
> 그 판단은 Signage 콘텐츠의 속성이 아니라 **매장 적용 단계**의 문제이므로, 공급자에게 지우지 않는다.

### 확정 정책 (SSOT 문구)

```text
Signage HUB 는 상품 분류 기반 제한을 적용하지 않는다.

Signage 는 외부 영상/이미지/안내 콘텐츠 단위이며,
상품 설명서나 Screen Set 의 content_list 처럼 구조적으로 ProductMaster 를 참조하지 않는다.

따라서 의약품 여부, 약국 전용 여부를 O4O 가 자동 판정하지 않고,
공급자에게 자기신고로 판정하게 하지도 않는다.

Signage 의 실제 활용 여부와 활용 위치는 매장 경영자가 결정한다.
공급자는 매장에서 활용 가능한 콘텐츠 자료를 제공할 뿐,
특정 매장·QR·태블릿·코너에 직접 배포하지 않는다.
```

### 책임 범위

| 주체 | 책임 |
|------|------|
| **공급자** | 자신이 올린 콘텐츠 자체의 권리, 허위 자료, 부적절한 자료 여부 |
| **매장 경영자** | 그 콘텐츠를 자기 매장에서 QR·태블릿·POP·안내 화면 등에 **사용할지 여부**, 어떤 상품·코너·상황에 **연결할지 여부** |
| **O4O / 운영자** | 콘텐츠 유통 구조 제공, 명백히 부적절한 자료 관리, 매장 권한 경계 유지 |

### 자료 유형별 가드 축 (확정)

```text
SPD / 상품 설명서 = 상품 기준 검수 가능        → 운영자 검수 큐 (canonical 승격)
Screen Set        = 상품 블록이 있으면 의약품 가드 가능 → hub_target + medication guard (현행 유지)
Signage           = 단순 콘텐츠이므로 상품 분류 가드 없음 → 가드 도입하지 않음 (본 결정)
활용 판단          = 매장 경영자
공급자 대시보드     = 매장 제공 자료 관리
```

> 아래 §1~§7 은 이 결정에 이르게 한 **조사 근거**다. §4(결정 사항 D1–D5)와 §5(후속 WO A–D)는
> 본 결정으로 **모두 종결**되었으며, 이력 보존을 위해 남긴다 — 착수 대상이 아니다.

---

## 0. 한 줄 결론 (조사 시점)

Signage HUB 의 "가드 부재"는 **누락이 아니라 명문화된 정책 결정**이며, WO 가 요구한 **최소 필수 요건(비약국 매장 조회 차단)** 은 **F1 Frozen Baseline(`asset-copy-core`) 과 무인증 공통 HUB API 를 동시에 변경**해야 구현된다. 선행 IR 이 이를 "안전 비대칭"으로 분류한 것은 **관측으로는 정확하나 원인 진단이 불완전**했다 — 비대칭의 원인은 가드 누락이 아니라 **Signage 에는 의약품 판정 축 자체가 없다는 데이터 모델 차이**다.

---

## 1. 조사 결과

### 1.1 Screen Set HUB 의 대상·의약품 가드 구조 (기준선)

| 요소 | 실체 | 위치 |
|------|------|------|
| 대상 필드 | `store_tablet_screen_sets.hub_target_store_type` (`pharmacy` / `non_pharmacy` / `all`) + DB CHECK `CHK_stss_hub_target` | migration `20270211000000-AddScreenSetHubTargetStoreType.ts` |
| 매장 유형 판정 | `resolveStoreHubType(orgId)` → `organizations.type` (`pharmacy` → pharmacy / `store` → non_pharmacy / 그 외 → 대상 제외) | `store-tablet.routes.ts:1886-1892` |
| 의약품 판정 축 | **`product_masters.regulatory_type = 'DRUG'`** | `store-tablet-medication-guard.ts:6-8` |
| 판정 입력 | **Screen Set 블록의 구조적 상품 참조** — `content_list.config.items[].masterId`(`sourceType='o4o_product_description'`), `product_content.config.productRef` | `collectScreenSetMasterIds()` `:29-46` |
| 보수 규칙 | masterId 미존재 / `regulatory_type` NULL → **의약품 취급**(약국 전용) | `analyzeScreenSetMedication()` `:63-66` |
| write 가드 | `medicationPublishTargetAllowed()` — 의약품·미분류 포함 시 `pharmacy` 대상만 허용 | `:72-87` |
| read 가드 | `medicationStoreAccessAllowed()` — 목록·상세·가져오기 **3단계 전부 재검사** | `store-tablet.routes.ts:1936-1944 / 1974 / 2000` |

**핵심:** 이 가드가 성립하는 이유는 Screen Set 이 **블록 안에 상품 master 를 구조적으로 참조**하기 때문이다. 콘텐츠 자체에서 의약품 여부를 **서버가 독립적으로 도출**할 수 있다.

### 1.2 Signage HUB 의 실제 구조

| 요소 | 실체 |
|------|------|
| 모델 | `signage_media` (신규 테이블·컬럼 0으로 재사용) — `serviceKey='kpa-society'`, `source='supplier'`, `scope='global'`, `organizationId=NULL`, 소유권 `createdByUserId` |
| 콘텐츠 실체 | **YouTube/Vimeo URL + 제목 + 설명 + 태그 + metadata**. `mediaType='video'` |
| 대상 필드 | **없음** |
| 상품 참조 | **구조적 참조 없음.** `metadata.linkedProduct = { productId, masterId, name }` 가 있으나 **선택 입력·자유 JSONB·서버 미검증** |
| 상태 | `draft → active → archived → draft` |
| HUB 노출 | `querySignageMedia()` — `serviceKey` + `source IN ('hq','supplier','community')` + `status='active'` + `scope='global'`. **매장·조직 파라미터 없음** |
| 가져오기 | `assetSnapshotApi.copy({ assetType:'signage' })` → `createAssetCopyController`(`@o4o/asset-copy-core`) → `KpaAssetResolver.resolveSignage()` |

### 1.3 "가드 부재"는 명시적 정책 결정이었다

선행 WO 의 CHECK 문서가 이를 **원칙으로 선언**하고 있다.

> `docs/checks/CHECK-O4O-NETURE-SUPPLIER-DIGITAL-SIGNAGE-AUTHORING-HUB-IMPORT-V1.md:4`
> **원칙: 상품의 분류와 콘텐츠 유통을 연결하지 않는다 — 의약품 여부 기반 콘텐츠 제한 0.**
>
> 같은 문서 `:32`
> **의약품 가드 없음**(연결 상품은 metadata 참고 정보일 뿐). 승인 절차·서비스 선택·migration 0.

코드에도 동일 문구가 남아 있다.

> `supplier-signage-media.controller.ts:21`
> `정책: 상품 분류(의약품 여부)와 콘텐츠 유통을 연결하지 않는다 — 의약품 가드 없음.`
>
> `SupplierSignagePage.tsx:10`
> `정책: 연결 상품은 참고 정보(metadata)일 뿐 — 상품 분류로 콘텐츠 조회·가져오기를 제한하지 않는다.`

→ 이번 WO 는 **기존 확정 정책의 반전**이다. 결함 수정이 아니다. 정책 반전은 사용자 결정 사항이다.

### 1.4 비대칭의 진짜 원인

| | Screen Set | Signage |
|---|---|---|
| 콘텐츠 형태 | 블록 구조(JSON) | 외부 동영상 URL |
| 상품 참조 | **구조적·필수적**(콘텐츠 자체가 SPD/master 를 렌더) | **선택적·장식적**(metadata 참고값) |
| 의약품 자동 판정 | 가능 | **불가능** |
| 매장 유형 대상 | `hub_target_store_type` + DB CHECK | 없음 |

선행 IR 은 "Screen Set 에는 있고 Signage 에는 없다"는 **관측**을 정확히 기록했으나, 그것이 **모델 차이에서 오는 구조적 결과**라는 점까지는 진단하지 못했다. 본 CHECK 로 정정한다.

---

## 2. WO §0 중지 조건 충족 판정

| # | 중지 조건 | 충족 | 근거 |
|:-:|-----------|:----:|------|
| 1 | Screen Set HUB의 대상/의약품 가드 구조를 **재사용할 수 없음** | **✅ 충족** | `analyzeScreenSetMedication(dataSource, blocks[])` 는 블록 배열을 받는다. `signage_media` 에는 블록이 없다. 유일 후보축 `metadata.linkedProduct.masterId` 는 선택·미검증 |
| 2 | Signage HUB 가 이미 동일 가드 적용 중 | ❌ 미충족 | 실제로 없음 (§1.2) |
| 3 | 가드 적용에 **기존 게시물 대량 변경 필요** | **✅ 충족** | §2.1 참조 — 보수 규칙 적용 시 링크 상품 없는 기존 Signage 전량이 "약국 전용"으로 강등 |
| 4 | 공급자 Signage 게시 구조가 조사 결과와 다름 | ❌ 미충족 | IR 기술과 일치 |
| 5 | **의약품/약국 전용 판정 기준이 불명확함** | **✅ 충족** | §2.1 — 판정 축 부재 + 반대 정책 명문화 |
| 6 | **DB write/migration 범위가 이 WO보다 커짐** | **✅ 충족** | §2.2 — 무인증 공통 HUB API + F1 frozen `asset-copy-core` |
| 7 | QR/태블릿/public runtime 변경 필요 | ❌ 미충족 | 불필요 |
| 8 | 다른 세션과 직접 파일 충돌 | ❌ 미충족 | 작업트리 clean |

**4/8 충족 → HOLD.**

### 2.1 판정 축 부재의 실제 영향 (조건 1·3·5)

Screen Set 가드를 그대로 옮기면 `unclassified` 보수 규칙이 이렇게 작동한다.

```
링크 상품 없음 (metadata = {})     → masterIds = []  → hasDrug=false, unclassified=false → 전체 허용
링크 상품 있음 + regulatory_type=DRUG → 약국 전용
링크 상품 있음 + master 미존재/NULL   → 약국 전용(보수)
```

두 갈래 모두 문제가 된다.

- **`masterIds=[]` 를 "전체 허용"으로 두면** → 공급자가 상품을 연결하지 않는 것만으로 가드가 100% 우회된다. 의약품 홍보 동영상을 상품 링크 없이 올리면 비약국 매장에 그대로 노출된다. **가드가 아니라 가드처럼 보이는 UI** 가 된다.
- **`masterIds=[]` 를 "미분류=보수적 차단"으로 두면** → `linkedProduct` 는 선택 입력이므로 **기존·신규 Signage 대부분이 약국 전용으로 강등**된다. WO §4.3 "기존 게시물 자동 변경 금지" 와 정면 충돌하고, 비약국 매장의 Signage HUB 가 사실상 비게 된다.

즉 **동영상 콘텐츠의 의약품 여부를 서버가 판정할 축이 존재하지 않는다.** 대안(공급자 자기신고, 운영자 검수, 태그 규칙)은 전부 **새 정책 설계**이지 기존 가드 재사용이 아니다.

### 2.2 최소 필수 요건이 Frozen Baseline 을 건드린다 (조건 6)

WO §6.3 은 최소 필수를 이렇게 정의한다.

```
비약국 매장에는 의약품/약국 전용 Signage 가 조회되지 않음
비약국 매장은 의약품/약국 전용 Signage 를 가져올 수 없음
```

**조회(read) 차단 경로**

`GET /api/v1/hub/contents` 는 `register-routes.ts:1087` 에서 **인증 미들웨어 없이** 마운트된 공개 API 다 (`hub-content.controller.ts:7` — "인증 불필요 (공개 읽기 전용)"). `querySignageMedia()` 는 매장·조직 파라미터를 받지 않는다.

여기에 매장 유형 필터를 넣으려면 **무인증 공개 API 를 인증 필수로 전환**해야 하고, 이 API 의 소비처는:

```
services/web-kpa-society/src/pages/pharmacy/HubSignageLibraryPage.tsx
services/web-kpa-society/src/pages/pharmacy/StoreHubLatestFeed.tsx
services/web-kpa-society/src/components/home/SignageSection.tsx   ← 로그인 전 홈 노출
services/web-glycopharm/src/pages/hub/HubSignageLibraryPage.tsx
services/web-k-cosmetics/src/pages/hub/HubSignagePage.tsx
services/web-neture/src/lib/api/supplierSignage.ts
```

**3개 서비스 + 비로그인 홈 섹션**이다. CLAUDE.md §1 *Shared Module / Core+Extension Change Rule* 대상이며, 중지 조건 "권한 · role · route · API contract 변경 필요" 에 해당한다.

**가져오기(import) 차단 경로**

```
assetSnapshotApi.copy({ assetType:'signage' })
  → createAssetCopyController  ← @o4o/asset-copy-core  [F1 FROZEN 2026-02-16]
  → ContentResolver.resolve(sourceAssetId, assetType)   ← 인터페이스에 매장 유형 없음
  → KpaAssetResolver.resolveSignage()
```

`ContentResolver` 인터페이스가 `(sourceAssetId, assetType)` 만 받으므로 매장 유형을 전달할 수 없다. 코드 자체가 이미 같은 한계를 기록해 두었다.

> `kpa-asset.resolver.ts:73-75`
> `ContentResolver 인터페이스가 (sourceAssetId, assetType) 만 받아 resolver 레벨 service_key 검증은 인터페이스 확장이 필요하며 별도 WO 대상이다.`

`@o4o/asset-copy-core` 는 **CLAUDE.md §14 F1 Frozen Baseline**(Operator OS, 2026-02-16) 이다. 소비처는 KPA·Neture 2 컨트롤러이며 cms/signage/content 등 **7개 assetType 전체**가 같은 코어를 지난다. 인터페이스 확장 = 구조 변경 = **명시적 WO 필수**.

### 2.3 부분 구현이 더 위험한 이유

"§6.1/§6.2(대상 필드 + 공급자 UI)만 먼저 하고 read 가드는 나중" 은 **채택하면 안 된다.**

```
공급자 화면: "약국 매장 전용" 선택 → 저장됨
실제 동작:   비약국 매장 HUB 에 그대로 노출 · 그대로 가져가짐
```

공급자에게 **지켜지지 않는 제한을 약속**하는 UI 가 되어 현재 상태(제한 없음을 명시)보다 나쁘다. WO §6.3 이 read 차단을 "최소 필수"로 못박은 것과도 어긋난다. 따라서 write-side 단독 선행도 HOLD 대상이다.

---

## 3. 확인된 사실 정리 (후속 WO 입력값)

```
판정 축      : signage_media 에 구조적 상품 참조 없음. metadata.linkedProduct = 선택·미검증 JSONB
대상 필드     : 없음 (Screen Set 은 hub_target_store_type + DB CHECK 보유)
매장유형 판정 : organizations.type (pharmacy | store) — resolveStoreHubType 재사용 가능
read 경로    : GET /api/v1/hub/contents (무인증 공개, 3서비스 + 비로그인 홈 소비)
import 경로  : @o4o/asset-copy-core createAssetCopyController [F1 FROZEN]
기존 정책     : "상품 분류와 콘텐츠 유통을 연결하지 않는다" — CHECK-...-SIGNAGE-AUTHORING-HUB-IMPORT-V1:4
```

---

## 4. 사용자 결정이 필요한 사항 — **종결됨 (이력)**

> **2026-08-09 확정: D1 = ① 기존 정책 유지(가드 없음).** D1 이 ① 로 확정되어 **D2~D5 는 전부 무효**다.
> 조사 시점의 권장안(D1=②)은 채택되지 않았다 — 자기신고 방식도 공급자에게 적합성 판단을
> 지우는 구조라 §0-A 결정과 어긋난다. 아래 표는 판단 경위 기록용이다.


| # | 결정 | 선택지 |
|:-:|------|--------|
| **D1** | **정책 반전 승인 여부** | ① 기존 정책 유지(가드 없음 — 현행) ② 반전(Signage 에도 의약품 기반 유통 제한 도입) |
| **D2** | D1=② 일 때 **판정 방식** | ⓐ 공급자 자기신고(대상 직접 선택, 자동 판정 없음) ⓑ 운영자 검수 큐 경유(Screen Set 보다 강함) ⓒ `linkedProduct` 필수화 + 자동 판정(기존 게시물 전량 재작업 필요) |
| **D3** | **read 가드 도입 방식** | ⓐ `/api/v1/hub/contents` 인증 필수 전환(3서비스 영향) ⓑ Signage 전용 인증 엔드포인트 신설(공개 API 무변경) ⓒ 도입 보류 |
| **D4** | **import 가드 도입 방식** | ⓐ `asset-copy-core` 인터페이스 확장(F1 해제 WO) ⓑ Signage 전용 pre-check 를 코어 밖에 배치 ⓒ 도입 보류 |
| **D5** | **기존 게시물 처리** | ① 전량 `target=all` 유지 ② 운영자 리뷰 큐로 이관 ③ 링크 상품 있는 건만 재판정 |

권장(참고): **D1=②, D2=ⓐ, D3=ⓑ, D4=ⓑ, D5=①**.
근거 — 자기신고는 판정 축 부재 문제를 우회하면서 공급자 책임을 명시하고, 전용 엔드포인트/코어 밖 pre-check 는 F1 과 무인증 공개 API 를 건드리지 않는다. 다만 이 조합도 **자동 판정이 아니므로 Screen Set 과 동등한 강도는 아니다** — 그 격차를 수용할지가 D1 의 실질이다.

---

## 5. 후속 WO 후보 (분해안) — **전부 미진행 (이력)**

> **2026-08-09 확정: A·B·C·D 모두 착수하지 않는다.** §0-A 정책 확정으로 전제가 소멸했다.
> Signage 관련 후속 작업은 없다. 다음 작업은 공급자 대시보드 IA
> (`WO-O4O-NETURE-SUPPLIER-DASHBOARD-STORE-MATERIALS-IA-V1`)이며, 그 WO 는 **Signage 를
> 의약품/비의약품 판정 대상에서 명시적으로 제외**한다.


| ID | 제목(가칭) | 선행 결정 | 비고 |
|----|-----------|-----------|------|
| A | **Signage HUB 대상 축 도입 — 정책 결정 IR** | D1 | 정책 반전 여부 확정. 코드 0 |
| B | **Signage HUB target 필드 + 공급자 대상 선택(자기신고)** | D1·D2 | additive nullable column. **C 와 동시 배포 필수** |
| C | **Signage HUB read/import 매장유형 가드** | D3·D4 | B 없이 단독 무의미. F1·공개 API 접촉 여부가 D3/D4 로 갈림 |
| D | **기존 Signage 게시물 target 리뷰** | D5 | 자동 변경 금지. 운영자 리뷰 큐 |

**B 와 C 는 반드시 한 릴리스로 묶는다** (§2.3).

---

## 6. 검증·산출물 상태

| 항목 | 상태 |
|------|------|
| 조사 | 완료 (§1) |
| 구현 | **미착수 (HOLD)** |
| migration | 없음 |
| typecheck / build | **미실행** — 코드 변경이 없어 불요 |
| 배포 | 없음 |
| 실브라우저 smoke | **미실행** — 배포 대상 없음 |
| 테스트 데이터 | **생성 0** (`[SMOKE]` 데이터 없음 → 정리 불요) |
| 기존 게시물 영향 | **0** (조회만 수행, write 0) |
| Screen Set HUB 영향 | **0** |
| QR / 태블릿 / public runtime 영향 | **0** |

```
코드 변경 0 · DB write 0 · migration 0 · 배포 0 · UI 0
git 변경 = 본 CHECK 문서 1건
```

---

## 7. 선행 IR 정정 사항

`IR-O4O-KPA-STORE-QR-TABLET-CONTENT-FLOW-AUDIT-V1 §11-E / §12 WO-3` 의 다음 표현을 정정한다.

| 원문 | 정정 |
|------|------|
| "Screen Set 에는 있고 Signage 에는 없다 — **안전 비대칭**" | **비대칭이 아니라 자료 유형 차이다.** Signage 는 ProductMaster 를 구조적으로 참조하지 않는 단순 콘텐츠 자료이므로 상품 분류 가드의 대상이 아니다 |
| "WO-3 · P1 · 안전 이슈 — 우선순위 상향 검토" | **CANCEL.** 정책상 미진행 (§0-A). 안전 결함이 아니다 |

IR 본문(§3.4 · §11-E · §12 WO-3)의 "가드 없음" 표기는 **결함 표시가 아니라 확정 정책**으로 읽어야 한다.
해당 IR 은 본 CHECK 와 함께 정정 반영했다.

---

*최종: `CANCEL` / 정책상 미진행 · 확정 정책 §0-A 기록 · 후속 WO(자기신고 포함) 전부 미진행 · 코드/DB/배포 무변경*
