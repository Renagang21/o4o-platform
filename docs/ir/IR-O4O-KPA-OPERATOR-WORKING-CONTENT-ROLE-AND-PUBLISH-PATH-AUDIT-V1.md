# IR — O4O KPA Operator WorkingContent 역할·발행 경로 감사 (V1)

KPA 운영자 영역 `WorkingContent`(내 콘텐츠)의 실제 업무 의미·소유권·canonical 발행 경로를 확정하고,
발행 시 `NO_STORE` 403 구조를 유지/제거/분리 중 어느 방향으로 정리할지 판정한다.

- **작업 IR**: IR-O4O-KPA-OPERATOR-WORKING-CONTENT-ROLE-AND-PUBLISH-PATH-AUDIT-V1
- **일자**: 2026-07-29
- **성격**: read-only 조사 전용 (코드·DB·권한·배포 무변경)
- **판정**: **D. 레거시 dead flow** (canonical `/assets/copy` → `o4o_asset_snapshots` 경로로 이미 대체됨. 원본 명시적 `@deprecated`)
- **다음 구현 WO**: WorkingContent 경로(라우트·컴포넌트·API client·컨트롤러·copy-to-store) 제거 + deprecation 종료 1건

---

## 1. `WorkingContent` 구조

### 1-1. Frontend (services/web-kpa-society)

| 항목 | 위치 | 내용 |
|------|------|------|
| Route | `src/routes/OperatorRoutes.tsx:152-154` | `/operator/working-content`, `/operator/working-content/:id` — **operator 전용 가드 블록 내부** (docs/resources 와 동일 RoleGuard). store route 아님. |
| 목록 | `src/pages/operator/WorkingContentListPage.tsx` | `fetchWorkingContents()` → `GET /api/v1/kpa/operator/working-contents`. 생성 CTA 없음. 빈 목록일 때만 "운영 콘텐츠에서 복사하기" 링크(`:121-128` → `/operator/docs`). |
| 편집·발행 | `src/pages/operator/WorkingContentEditPage.tsx` | `:id` 로 기존 사본 편집. 저장(`handleSave` → PUT)과 발행(`handlePublish` → 저장 후 `POST .../:id/publish`) 분리. **매장 선택 UI 없음.** |
| API client | `src/api/workingContent.ts` | 전 엔드포인트 `/api/v1/kpa/operator/working-contents*` (operator scope). 생성 엔드포인트 없음. |
| 사이드바/메뉴 | `src/config/operatorMenuGroups.ts` | **항목 없음.** 인바운드 내비게이션은 목록↔편집뿐 — 사실상 직접 URL 로만 도달하는 orphan 화면. |
| 컴포넌트 공유 | — | store 화면과 공유·재사용 없음. |

### 1-2. Backend (apps/api-server)

| 항목 | 위치 | 내용 |
|------|------|------|
| Controller | `src/routes/kpa/controllers/working-content.controller.ts` | raw SQL. GET 목록/상세, PUT 편집, DELETE 하드삭제, `POST /:id/publish` 발행. |
| Route 등록 | `src/routes/kpa/kpa.routes.ts:254` | `router.use('/operator/working-contents', createWorkingContentController(dataSource, coreRequireAuth))` — **`requireAuth` 하나만**. scope 가드(`requireKpaScope`) 없음. |
| 원본 entity | `src/routes/kpa/entities/kpa-working-content.entity.ts` | 테이블 `kpa_working_contents`. 컬럼 = `id, source_content_id, owner_id, title, edited_blocks, body, tags, category, created_at, updated_at`. **organization_id / store_id / status 컬럼 없음.** |
| 사본 생성 | `src/routes/kpa/kpa.routes.ts:2069` (`POST /contents/:id/copy-to-store`) | `kpa_contents` → `kpa_working_contents` INSERT. **주석 `:2059` 에 `@deprecated` 명시** (아래 §6). |
| snapshot | `packages/asset-copy-core/src/entities/asset-snapshot.entity.ts` (`o4o_asset_snapshots`) | `organization_id, source_service, source_asset_id(FK 없음), asset_type, title, content_json, created_by`. store_id 없음(조직 단위). |

## 2. 실제 업무 의미

- 스스로 콘텐츠를 만들지 않는다. 운영 콘텐츠 허브(`kpa_contents`)를 "내 공간에 복사"한 **개인 사본**을
  다듬어 발행하는 화면이다(`source_content_id` 보유). 원본은 오직 `owner_id`(개인) 단위 소유 —
  organization/store 귀속 정보가 데이터 모델에 **전혀 없다.**
- **A(운영자 공용 콘텐츠 제작) 아님**: 발행이 HUB canonical 이 아니라 사용자→조직 역산 후 조직 스냅샷 생성.
- **B(특정 매장 대행 제작) 아님**: 매장 선택 UI·store context 입력 경로가 코드에 존재하지 않음.
- **C(매장 편집기의 운영자 오노출) 아님**: store 컴포넌트를 공유하지 않는 operator 전용 독립 컴포넌트.
- 화면 문구는 "운영 콘텐츠에서 복사한 콘텐츠를 편집하고 매장에 발행"이나, 실제 발행 주체 요건(store_owner)과
  도달 가능 역할(operator)이 **어긋난다**(§5).

## 3. Route·메뉴 도달성

- 운영자 사이드바 미등록. 대시보드 카드·딥링크·버튼 진입 없음. "내 공간에 복사" 버튼조차 복사 후
  working-content 로 이동하지 않고 토스트만 표시.
- 도달 = 직접 URL 입력뿐. → **dead route / orphan 화면.**

## 4. 저장·발행 데이터 흐름

1. 복사: `POST /contents/:id/copy-to-store` → `kpa_working_contents` INSERT(owner_id=현재 사용자).
2. 편집: `PUT /operator/working-contents/:id` (owner_id 일치 필요).
3. 발행: `POST /operator/working-contents/:id/publish` — body `{}`.
   - store context 를 **클라이언트로부터 받지 않고**, `isStoreOwner(dataSource, userId)` 로 사용자→조직 역산.
   - 조직 확보 시 `o4o_asset_snapshots` 에 INSERT(organization_id, source_service='kpa', asset_type='content',
     source_asset_id=wc.id, content_json).
- 저장은 성공하나 발행만 `NO_STORE` 로 실패하는 구조. draft 는 개인(owner) 소유여서 조직 미귀속 상태로 남을 수 있음(orphan 가능).

## 5. `NO_STORE` 403 원인

- **발생 지점**: `working-content.controller.ts:184-186` (코드베이스 유일 throw 지점).
  ```
  const { organizationId } = await isStoreOwner(dataSource, userId);  // :183
  if (!organizationId) { res.status(403).json({ code: 'NO_STORE', ... }); return; }  // :184-186
  ```
- **조건** (`src/utils/store-owner.utils.ts`): `role_assignments` 에 `*:store_owner`(active) 가 없거나,
  있어도 `organization_members`(role in owner/admin/manager, left_at IS NULL) 소속이 없으면 `organizationId=null`.
  publish 는 serviceKey 미전달 → `ALL_STORE_OWNER_ROLES` 합집합 검사. **`kpa:operator`/`kpa:admin` 은 이 집합에 없음.**
- **판정**: 단순 권한 누락 아님. **구조적으로 store context 가 존재하지 않는다.** 원본 데이터에 조직/매장 컬럼이
  없고(§1-2), 발행 대상 매장을 지정할 입력 경로 자체가 없어(§4) 사용자→조직 역산에 의존하는데,
  화면에 도달 가능한 유일 역할인 **operator 는 store_owner 집합에서 의도적으로 배제**되어 있다.
  → **operator 는 이 화면에 들어올 수 있으나 영원히 발행할 수 없다(설계상 모순).**

## 6. canonical 콘텐츠 경로 비교

`kpa.routes.ts:2059-2066` 주석이 직접 명시:

> `@deprecated WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1` — 사용자 경로의 "내 자료함 가져가기"는
> **표준 자료함(`o4o_asset_snapshots`) 시스템으로 이전**되었고, 콘텐츠 허브는 이제
> `POST /assets/copy { sourceAssetId, assetType: 'content' }` 를 호출한다.
> 본 엔드포인트(`kpa_working_contents` 저장 경로)는 운영자 working copy 흐름에서 **여전히 사용되므로
> 당장 제거하지 않는다. 후속 WO 에서 운영자 경로 통합 후 deprecate 종료.**

| 경로 | 원본 소유 | 발행 주체 | 대상 | 복사/스냅샷 | 상태 |
|------|----------|----------|------|-----------|------|
| **WorkingContent** (본 감사) | owner(개인) | (operator 도달, 발행 불가) | 조직 역산 | copy→snapshot | **@deprecated / dead** |
| 표준 자료함 `POST /assets/copy` (`dashboard-assets.copy-handlers.ts:25`, `o4o-store/asset-snapshot.controller.ts`) | 서비스 콘텐츠(`kpa_contents`) | store 사용자 | 조직 | Full Copy → `o4o_asset_snapshots` | **canonical / live** |
| multilingual product content | supplier/operator | operator | store HUB | 별도 테이블 | live |

→ WorkingContent 는 표준 자료함 경로와 **기능 중복**이며, 이미 canonical 로 대체 완료된 레거시다.

## 7. 프로덕션 데이터 census (read-only, cloud-sql-proxy)

| 항목 | 결과 |
|------|------|
| `kpa_working_contents` 총건수 | **0** |
| distinct owner | 0 |
| draft orphan | 0 (테이블 자체가 비어 있음) |
| `o4o_asset_snapshots` (kpa/content) | 14건 (기간 2026-05-20~07-25) |
| 위 14건의 `source_asset_id` ↔ `kpa_working_contents` 매칭 | **0 (전부 orphan)** — working-content 발행 산출물 아님 |
| 14건 생성자 역할 | 모두 `*:store_owner` 보유자 — 표준 자료함 `/assets/copy` 경로 산출물 |

→ **프로덕션에 WorkingContent 실데이터 0건.** 14개 content 스냅샷은 canonical `/assets/copy` 경로에서 생성됨
(working-content publish 로 만들어진 스냅샷 0건, 보존 필요 draft 0건).

## 8. 권한 경계

- 라우트 미들웨어: publish 포함 전 엔드포인트 `requireAuth` 만(scope 가드 없음, `kpa.routes.ts:252-254`).
  인증만 통과하면 누구나 라우트 진입, 권한 구분은 publish 내부 `isStoreOwner` 인라인 체크에서만 발생.
- 프론트 도달: `/operator/*` RoleGuard 블록 → operator 계열만 화면 도달.
- 결과 교차: **화면 도달 가능(operator) ∩ 발행 가능(store_owner) = ∅.** (같은 계정이 두 역할을 동시 보유하지 않는 한.)

## 9. 위험과 dead-end

- **자기모순 dead-end**: operator 만 도달, operator 는 발행 불가(NO_STORE). 정상 완료 시나리오가 구조적으로 없음.
- orphan draft 위험: 개인(owner) 소유 draft 는 조직 미귀속 → 프로덕션엔 실제 0건이라 현재 위험 미실현.
- 임의 매장 주입 위험: publish 가 client 입력을 무시하므로 낮음(단, 다중 조직 소유자면 첫 조직으로 역산될 수 있음 — 실데이터 없음).

## 10. 최종 판정 — **D. 레거시 dead flow**

근거 종합:
1. 원본 엔드포인트 명시적 `@deprecated`, canonical 대체 경로(`/assets/copy` → `o4o_asset_snapshots`) live·사용 중(§6).
2. 프로덕션 실데이터 0건, 보존 대상 draft 0건(§7).
3. operator 전용 orphan 화면(메뉴·인바운드 내비 부재), 발행 구조적 불가(§3, §5).
4. store 대행/공용 제작/매장 편집기 오노출 어디에도 해당하지 않음(§2).

(E 혼합 구조 아님 — 목록·편집·발행이 하나의 일관된 레거시 사본 흐름이며, 그 흐름 전체가 대체·사망함.)

## 11. 유지·분리·제거 권고

**제거(retire)** 를 권고한다. 권고 우선순위 원칙(dead route 제거 > 권한 확대, operator publish 는 store 선택·검증 없이 허용 금지)에 정합.

- 제거 대상: 프론트 라우트 2개(`OperatorRoutes.tsx:152-154`) + 페이지 2개(`WorkingContentListPage`, `WorkingContentEditPage`) +
  API client(`api/workingContent.ts`) + 백엔드 컨트롤러(`working-content.controller.ts`) 및 라우트 등록(`kpa.routes.ts:254`) +
  `copy-to-store` 엔드포인트(`kpa.routes.ts:2069`) deprecate 종료.
- `NO_STORE` 를 operator scope 추가로 "고치지" 않는다(원칙 1·4). store 대행 기능으로 재정의하지 않는다
  (매장 선택 UI·정책 근거·운영 수요 부재, 실데이터 0건).
- 빈 목록 CTA 대상(`/operator/docs`)은 표준 자료함 canonical 경로를 이미 사용하므로 사용자 영향 없음.

## 12. 기존 draft 데이터 처리 필요 여부

**불필요.** `kpa_working_contents` 프로덕션 0행 — 마이그레이션/백필/보존 대상 없음.
단, 구현 WO 실행 시점에 **0행 재확인**을 게이트로 두고, 테이블 DROP 은 코드 제거와 분리된 별도 마이그레이션으로
(0행 재확인 후) 판단한다(선택). `o4o_asset_snapshots` 의 14건은 canonical 경로 산출물이므로 손대지 않는다.

## 13. 다음 구현 WO 제안 (1건)

**WO-O4O-KPA-OPERATOR-WORKING-CONTENT-DEAD-FLOW-RETIREMENT-V1**
- 목표: WorkingContent 레거시 dead flow 제거 및 `copy-to-store` deprecation 종료.
- 선행 게이트: 실행 시점 `SELECT count(*) FROM kpa_working_contents` = 0 재확인(read-only).
- 범위: 프론트 라우트·페이지·API client 제거, 백엔드 컨트롤러·라우트 등록·`copy-to-store` 제거,
  dead import 정리, 빌드/타입체크/실브라우저 smoke(직접 URL → catch-all redirect 확인).
- 부수 효과: 직전 WO(RUNBULK-CONFIRM)에서 §6 HOLD 였던 `WorkingContentEditPage.handlePublish` 의 `window.confirm`
  은 컴포넌트 제거로 자연 소멸(HOLD 사유 해소).
- 비범위: `o4o_asset_snapshots` 데이터·표준 자료함 canonical 경로 무변경. 테이블 DROP 은 별도 판단.
- shared 모듈 변경 없음(operator 전용 격리 제거) — 단, `copy-to-store` 제거 전 타 소비처 0건 재확인 필수.

## 14. IR commit SHA

- 커밋: `d7caa51ce`

---

## 관련 파일

- [OperatorRoutes.tsx:152-154](../../services/web-kpa-society/src/routes/OperatorRoutes.tsx#L152-L154)
- [WorkingContentListPage.tsx](../../services/web-kpa-society/src/pages/operator/WorkingContentListPage.tsx)
- [WorkingContentEditPage.tsx](../../services/web-kpa-society/src/pages/operator/WorkingContentEditPage.tsx)
- [api/workingContent.ts](../../services/web-kpa-society/src/api/workingContent.ts)
- [working-content.controller.ts](../../apps/api-server/src/routes/kpa/controllers/working-content.controller.ts)
- [kpa.routes.ts:254 (route 등록)](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L254) · [kpa.routes.ts:2059-2096 (copy-to-store @deprecated)](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L2059-L2096)
- [store-owner.utils.ts](../../apps/api-server/src/utils/store-owner.utils.ts)
- [asset-snapshot.entity.ts](../../packages/asset-copy-core/src/entities/asset-snapshot.entity.ts)
- [dashboard-assets.copy-handlers.ts:25 (canonical /assets/copy)](../../apps/api-server/src/routes/dashboard/dashboard-assets.copy-handlers.ts#L25)
