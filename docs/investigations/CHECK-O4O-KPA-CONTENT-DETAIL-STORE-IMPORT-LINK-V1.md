# CHECK-O4O-KPA-CONTENT-DETAIL-STORE-IMPORT-LINK-V1

> **WO:** WO-O4O-KPA-CONTENT-DETAIL-STORE-IMPORT-LINK-V1
> **근거 조사:** [IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1](IR-O4O-KPA-MAIN-HOME-COMMUNITY-USABILITY-AND-FLOW-AUDIT-V1.md) **C4**
> **선행 작업:** [CHECK-O4O-KPA-MAIN-HOME-LINK-CANONICAL-ALIGNMENT-V1](CHECK-O4O-KPA-MAIN-HOME-LINK-CANONICAL-ALIGNMENT-V1.md) (C1·C2·C3)
> **작성일:** 2026-07-25
> **유형:** frontend-only (3 파일). 신규 API·테이블·migration·복사 정책 0.
> **상태:** ✅ 코드 완료 / tsc 0 · build 성공 — 브라우저 smoke 는 배포 후(§9)

---

## 1. 상세 콘텐츠 엔티티

| 항목 | 값 |
|------|-----|
| 화면 | `/content/:id` → [ContentDetailPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx) |
| 데이터 API | `contentApi.detail(id)` → `GET /api/v1/kpa/contents/:id` |
| 백엔드 쿼리 | `SELECT * FROM kpa_contents WHERE id = $1 AND is_deleted = false` ([kpa.routes.ts:1688-1697](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L1688-L1697)) |
| 엔티티 | **`kpa_contents`** |
| 로그인 가드 | 없음 — 라우트·API 모두 public (`optionalAuth`) |

### 엔티티 동일성 판정 (WO §7.3 — 중지 조건 대상)

| 진입점 | 가져가기 호출 인자 |
|--------|-------------------|
| 목록 행 액션 / Drawer / 일괄 | `assetSnapshotApi.copy({ sourceService:'kpa', sourceAssetId: <kpa_contents.id>, assetType:'content' })` |
| 상세(신규) | 동일 — `content.id` = `kpa_contents.id` |

✅ **동일 엔티티·동일 ID.** 추정 연결 아님 → 중지 조건 해당 없음.
서버 resolver 도 같은 테이블을 조회한다: `resolveContent()` → `FROM kpa_contents WHERE id = $1` ([kpa-asset.resolver.ts:221-231](../../apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts#L221-L231)).

---

## 2. 기존 목록·Drawer 가져오기 구현

**공통 컴포넌트·공통 모달은 존재하지 않았다.** `ContentListPage` 내부 인라인 구현이 전부였다.

| 요소 | 기존 구현 |
|------|-----------|
| 호출 | `assetSnapshotApi.copy({sourceService:'kpa', sourceAssetId, assetType:'content'})` → `POST /api/v1/kpa/assets/copy` |
| 라벨 | **`내 자료함 가져가기`** / restricted 시 `내 자료함 가져가기 (불가)` |
| 성공 안내 | `toast.success('내 자료함에 가져왔습니다')` |
| 실패 | `toast.error(e?.message ?? '가져오기에 실패했습니다')` |
| restricted | `reusable_policy === 'restricted'` → 액션 `disabled` |
| 중복 가져오기 | 허용(매번 새 사본) — WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1 |
| 진입점 | ① 행 액션(RowActionMenu) ② Drawer 액션 ③ 선택 후 일괄(ActionBar) |

**권한(백엔드가 authoritative):**

- `router.use('/assets', createAssetSnapshotController(dataSource, coreRequireAuth))` — **인증 필수** ([kpa.routes.ts:405](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L405))
- role 화이트리스트: `kpa:admin` · `kpa:operator` · `kpa:pharmacist` · `kpa:store_owner` ([asset-snapshot.controller.ts:19](../../apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts#L19))
- org 해석: `resolveKpaOrgId()` (store_owner 는 약국 org 우선, 그 외 kpa_members fallback)
- **restricted 서버 재검증:** `if (c.reusable_policy === 'restricted') return null;` → SOURCE_NOT_FOUND ([kpa-asset.resolver.ts:234-235](../../apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts#L234-L235))

> 기존 목록 UI 는 **역할 게이트 없이 버튼을 노출하고 서버가 거부**하는 구조다. 본 WO 는 이 정책을 그대로 따랐다(새 권한 규칙 도입 금지 — WO §8.3).

---

## 3. 재사용한 버튼·모달·API

**모달 없음** — 기존 흐름이 클릭 → 즉시 복사 → 토스트다. 상세도 동일하게 맞췄다.

공통 컴포넌트가 없었으므로 WO §8.2 "최소한의 공통화" 범위에서 **호출 1 + 판정 1 + 라벨 2** 만 모듈로 분리했다.

신규 [api/contentStoreImport.ts](../../services/web-kpa-society/src/api/contentStoreImport.ts):

| export | 내용 |
|--------|------|
| `importContentToStore(id)` | 기존과 **동일한** `assetSnapshotApi.copy` 호출 |
| `isContentImportRestricted(item)` | `reusable_policy === 'restricted'` |
| `CONTENT_IMPORT_LABEL` | `내 자료함 가져가기` |
| `CONTENT_IMPORT_RESTRICTED_LABEL` | `내 자료함 가져가기 (불가)` |

목록·Drawer·일괄·상세 **4개 진입점이 같은 함수/라벨**을 쓴다 → 상세에 로직 복사 없음, 향후 drift 방지.

### 라벨에 대한 판단 (보고 필요)

WO 제목·본문은 버튼명을 **"내 매장으로 가져오기"** 로 적었으나, 실제 코드에 적용한 라벨은 기존 그대로 **"내 자료함 가져가기"** 다.

- 같은 화면 계열(목록·Drawer·일괄)이 이미 이 라벨을 쓰고 있어 상세만 다른 문구를 쓰면 같은 동작이 두 이름으로 보인다.
- KPA 서비스 용어는 `kpaConfig.terminology` 기준 **'내 약국'** 이며 매장 HUB 는 '내 약국에 복사' 를 쓴다. '내 매장' 은 KPA 에서 쓰지 않는 표현이다.
- WO §4 "기존 완료 안내 재사용 / 최소 코드 변경", §8.1 "기존 버튼 스타일 재사용" 원칙과도 기존 라벨 유지가 정합.

→ **용어 통일이 필요하다면 4개 진입점을 한 번에 바꾸는 별도 작업**을 권한다(본 WO 에서 상세만 바꾸지 않았다).

---

## 4. 권한 및 restricted 처리

| 상황 | 상세 화면 동작 | 기존 목록과 동일? |
|------|----------------|:----:|
| 로그인 + 허용 role | 클릭 → 복사 → `내 자료함에 가져왔습니다` | ✅ |
| 로그인 + 권한 없음 | 서버 거부 → 기존 에러 토스트 | ✅ |
| restricted 콘텐츠 | 버튼 `disabled` + 라벨 `(불가)` + title 안내. 서버도 차단 | ✅ |
| **비로그인** | 기존 KPA 로그인 모달 오픈 → 성공 시 **현재 상세에서 그대로 재시도** | ➕ 상세 전용(아래) |

**비로그인 처리 (WO §8.5):** 기존 `useAuthModal()` 의 `openLoginModal()` + `setOnLoginSuccess()` 를 재사용했다 — `CommunityHomePage` 서비스 카드 게이트와 동일한 방식이다. URL 이동이 없으므로 **모달 취소 시 상세 화면이 그대로 유지**되고, 로그인 성공 시 복사가 이어서 실행된다.

> 목록·Drawer 는 비로그인 시 모달 없이 서버 401 토스트로 끝난다. WO §8.5 가 "상세 가져오기 동작에 필요한 최소 범위만" 처리하고 전체 통일은 하지 말라고 명시하여, **목록 쪽 동작은 변경하지 않았다.** 진입점 간 비로그인 UX 차이는 남아 있으며 이는 IR U5(로그인 유도 3가지)의 후속 범위다.

**새로 만들지 않은 것:** 신규 권한 규칙 ❌ / 신규 restricted 상태값 ❌ / 매장 경영자 전용 노출 조건 ❌

---

## 5. 상세 화면 배치 위치

기존 액션 행(`CommunityContentDetailView` 의 `actionsSlot`) **맨 앞**에 추가했다. 별도 안내 블록·설명 문단 없음, 기존 `styles.actionBtn` 재사용.

```
[📥 내 자료함 가져가기] [♡ 추천 N] [🔗 링크 복사] [✏️ 수정(소유자)]
```

restricted 시: `[내 자료함 가져가기 (불가)]` (회색 비활성, `cursor:not-allowed`, title 로 사유 안내)
진행 중: `[가져오는 중...]`

---

## 6. 변경 파일 (3)

| 파일 | 변경 |
|------|------|
| [api/contentStoreImport.ts](../../services/web-kpa-society/src/api/contentStoreImport.ts) | **신규** — 호출/판정/라벨 공용 모듈 (37줄) |
| [pages/contents/ContentDetailPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentDetailPage.tsx) | 가져가기 버튼 + `handleImportToStore`(비로그인 모달 게이트) + restricted 판정 + disabled 스타일 |
| [pages/contents/ContentListPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentListPage.tsx) | 인라인 `assetSnapshotApi.copy`·`(row as any).reusable_policy`·하드코딩 라벨 → 공용 모듈로 치환 (**동작 동일**) |

**범위 밖으로 남긴 것:** [ContentDocumentsPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx) (`/content/documents`) 에 동일 로직이 3중으로 중복돼 있으나 본 WO 대상이 아니라 **미변경**. 같은 공용 모듈로 정렬하는 후속 작업 권장.

**다른 세션 WIP 미포함:** `AGENTS.md`, `docs/checks/CHECK-O4O-NETURE-SUPPLIER-IA-UNIFICATION-V1.md`, `docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md`, `services/web-neture/src/pages/supplier/*`, `.codex/`, `apps/api-server/_msm*.mjs`, `apps/api-server/src/scripts/*`

---

## 7. 신규 API·DB·route 여부

| 항목 | 결과 |
|------|:----:|
| 신규 API 엔드포인트 | **0** (기존 `POST /assets/copy` 재사용) |
| 신규 테이블 / migration | **0** |
| DB 데이터 변경 | **0** |
| 신규 프론트 라우트 | **0** |
| 신규 복사 정책·상태값 | **0** |
| 백엔드 변경 | **0** (frontend-only) |
| 복사 모델 변경 | **0** — 독립 사본·원본 단절·재복사 허용·restricted 차단 전부 기존 그대로 |

---

## 8. typecheck / build

| 대상 | 명령 | 결과 |
|------|------|------|
| web-kpa-society | `tsc --noEmit` | ✅ **0 errors** |
| web-kpa-society | `vite build` | ✅ **성공** (14.12s) |
| api-server | — | 변경 없음(미실행) |

---

## 9. 브라우저 smoke

**배포:** Deploy Web Services ✅ success (`089fae48f`)
**대상:** `https://kpa-society.co.kr` (Playwright 실브라우저, 로그인 계정 = `Sohae 약국 매장` store_owner)

| # | 절차 | 결과 | 근거 |
|---|------|:----:|------|
| 1 | **Home → 최신글 콘텐츠 항목 → 상세** | ✅ **PASS** | 링크 클릭 → `/content/5b258882…` 진입, `📥 내 자료함 가져가기` 노출. **C4 흐름 연결 완료** |
| 2 | 가져가기 클릭(로그인) | ✅ **PASS** | `내 자료함에 가져왔습니다` 성공 토스트 확인(클릭+폴링 동시 실행으로 캡처) |
| 3 | 사본 생성 / ID 분리 | ✅ **PASS** | 자료함 content 사본 **1건 → 2건**. 사본 `858005a6` ≠ 원본 `5b258882` (원본 ID ≠ 사본 ID) |
| 4 | 재복사 | ✅ **PASS** | 2회차 클릭 → 사본 2건(`5b34a891`, `858005a6`). 기존 "중복 허용" 정책 유지 |
| 5 | `/store/library/contents` 노출 | ✅ **PASS** | 자료함 화면(`Sohae 약국 매장`)에 사본 3건 표시 |
| 6 | **restricted 콘텐츠** | ⚠️ **미검증(데이터 없음)** | prod 콘텐츠 5건 전부 `reusable_policy='platform'` 또는 미설정. restricted 데이터 부재 → 더미 대체 없이 미검증 기록(§10) |
| 7 | **비로그인 → 가져가기** | ✅ **PASS** | 로그인 모달 오픈, **URL·상세 화면 유지**, 무단 복사 없음(`copiedWithoutAuth=false`) |
| 8 | 비로그인 모달 취소 | ✅ **PASS** | 상세 화면·버튼 그대로 유지(`stillOnDetail`·`detailRendered`·`importButtonStillThere` 전부 true) |
| 9 | **회귀 — Drawer 가져가기** | ✅ **PASS** | 라벨 `내 자료함 가져가기` 동일, 실행 시 자료함 **4건 → 5건** + 성공 토스트 |
| 10 | 회귀 — 목록 렌더 | ✅ **PASS** | `/content` 문서형 3행 정상, 행 액션 메뉴 존재, 섹션 구조 동일 |
| 11 | 회귀 — 콘텐츠 상세 열람 | ✅ **PASS** | 제목·추천·링크 복사·감사 패널 정상 |

> **비로그인 검증 방법:** 자동화 브라우저 localStorage 의 토큰 4개를 백업 → 제거 → 검증 → **복원**했다(서버 세션 로그아웃 아님). 검증 후 세션 정상 복구 확인(`restoredSession=true`, 로그인 버튼 사라짐, `내 약국` 메뉴 노출).

### 9-1. smoke 중 발견 — 목록 API 가 `reusable_policy` 를 반환하지 않음

| 엔드포인트 | `reusable_policy` |
|-----------|-------------------|
| `GET /contents/:id` (상세) | ✅ 반환 (`'platform'` 확인) |
| `GET /contents` (목록) | ❌ **응답 키 자체가 없음** |

→ **기존 목록·Drawer 의 restricted 판정은 prod 에서 사실상 항상 `false`** 다(항목이 restricted 여도 버튼이 활성으로 보이고, 클릭 시 서버가 차단해 에러 토스트). Drawer 도 상세 응답(`drawerDetail`)이 아니라 목록 행(`drawerItem`)으로 판정하므로 동일하다.

- **본 WO 로 생긴 문제가 아니다**(기존 동작). 서버 게이트(`resolveContent`)가 authoritative 하므로 **차단 자체는 안전**하며 UI 표시만 부정확하다.
- 반대로 **상세 화면(본 WO 신규)은 상세 응답을 쓰므로 restricted 판정이 정확**하다 — 진입점 간 표시가 어긋나는 상태다.
- 정합 방법은 ① 목록 API 에 컬럼 추가(백엔드) 또는 ② Drawer 판정을 `drawerDetail` 기준으로 변경(프론트) 중 택1이며, 둘 다 본 WO 범위 밖이라 **손대지 않았다**. 후속 권장.

### 9-2. 테스트로 생성된 데이터

검증 과정에서 `Sohae 약국 매장` 자료함에 **콘텐츠 사본 4건**이 생성되었다(상세 3 + Drawer 1). 재복사 허용 정책에 따른 정상 사본이며, 불필요하면 자료함에서 삭제 가능하다.

---

## 10. 미검증 항목 / 중지 조건

| WO §14 중지 조건 | 해당 | 비고 |
|------------------|:----:|------|
| 상세 콘텐츠 ≠ 기존 가져오기 대상 엔티티 | ❌ | 둘 다 `kpa_contents.id` (§1) |
| 기존 API 가 상세 ID 를 수용하지 않음 | ❌ | 동일 인자 |
| 신규 복사 API 필요 | ❌ | |
| 신규 DB 매핑 필요 | ❌ | |
| restricted 정책이 진입점마다 다름 | ❌ | 목록·Drawer·일괄 모두 `reusable_policy==='restricted'` 동일. 서버도 동일 게이트 |
| 다른 세션 WIP 충돌 | ❌ | 파일 중복 없음 |

**미검증 (1건):**

- **restricted 콘텐츠 차단 (WO §12.3 · §13)** — prod 콘텐츠 5건 전부 restricted 가 아니라 실데이터 검증 불가. 더미로 대체하지 않고 미검증으로 남긴다. 근거는 코드·서버 게이트로만 확인: UI `isContentImportRestricted()` 는 목록과 동일 판정, 서버 `resolveContent` 는 restricted 시 `null` 반환. restricted 콘텐츠가 생기면 1회 재확인 권장.

**보고 필요 사항 (3):**

1. **라벨** — WO 문구 "내 매장으로 가져오기" 대신 기존 **"내 자료함 가져가기"** 유지(§3 사유). 용어 변경 시 4개 진입점 일괄 작업 권장.
2. **비로그인 UX 차이** — 상세만 로그인 모달, 목록·Drawer 는 서버 401 토스트. WO §8.5 의 "최소 범위" 지시에 따라 목록은 미변경. IR U5 후속 범위.
3. **목록 API `reusable_policy` 미반환** (§9-1) — 기존 restricted 표시가 목록/Drawer 에서 부정확. 본 WO 원인 아님, 서버 차단은 정상. 후속 정합 권장.

---

*End of CHECK-O4O-KPA-CONTENT-DETAIL-STORE-IMPORT-LINK-V1*
