# CHECK — WO-O4O-KPA-OPERATOR-WORKING-CONTENT-DEAD-FLOW-RETIREMENT-V1

KPA 운영자 `WorkingContent`(내 콘텐츠) 레거시 dead flow 제거 — 라우트·페이지·API client·컨트롤러·`copy-to-store` 엔드포인트

- **작업 WO**: WO-O4O-KPA-OPERATOR-WORKING-CONTENT-DEAD-FLOW-RETIREMENT-V1
- **선행 IR**: [IR-O4O-KPA-OPERATOR-WORKING-CONTENT-ROLE-AND-PUBLISH-PATH-AUDIT-V1](../ir/IR-O4O-KPA-OPERATOR-WORKING-CONTENT-ROLE-AND-PUBLISH-PATH-AUDIT-V1.md) (판정 **D. 레거시 dead flow**)
- **일자**: 2026-07-29
- **코드 커밋**: `703b68f2e`
- **CHECK 커밋**: (본 문서 커밋 — 아래 §8)
- **판정**: PASS

---

## 1. 배경

IR 판정 **D**: `WorkingContent`(`/operator/working-content`, `kpa_working_contents`)는 canonical
`POST /assets/copy` → `o4o_asset_snapshots` 표준 자료함으로 이미 대체된 레거시 dead flow.
운영자만 화면에 도달할 수 있으나 `NO_STORE` 구조상 발행이 영원히 불가능한 자기모순 경로이며,
`copy-to-store` 엔드포인트는 명시적 `@deprecated`. 프로덕션 보존 데이터 0행.

## 2. 실행 직전 census (read-only, cloud-sql-proxy)

제거 직전 프로덕션(`o4o_platform`) 재확인:

| 항목 | 값 |
|------|----|
| `kpa_working_contents` row count | **0** ✅ (게이트 통과 — 제거 승인 조건 충족) |
| `o4o_asset_snapshots` 총계 | 18 |
| └ `kpa` / `content` | 14 |
| └ `kpa` / `cms` | 1 |
| └ `kpa` / `resource` | 3 |

> 0행 게이트 통과 → 보존 draft 없음 → 안전 제거 확정.

## 3. 제거한 파일 · route · endpoint

코드 커밋 `703b68f2e` — **9 파일, +2 / -1,071**.

### 3-1. 프론트 (services/web-kpa-society)
- **route**: [OperatorRoutes.tsx](../../services/web-kpa-society/src/routes/OperatorRoutes.tsx) — `working-content`, `working-content/:id` Route 2건 + 페이지 import 2건 제거. 제거된 경로는 기존 catch-all `<Route path="*" element={<Navigate to="/operator" replace />} />` 이 흡수.
- **페이지 (삭제)**: `WorkingContentListPage.tsx` (215줄), `WorkingContentEditPage.tsx` (413줄)
- **API client (삭제)**: `api/workingContent.ts` (114줄)
- **운영자 "내 공간에 복사" 진입점 (제거)**:
  - [OperatorContentHubPage.tsx](../../services/web-kpa-society/src/pages/operator/OperatorContentHubPage.tsx) — copy 버튼 + `handleCopyToStore` + `copying` state + 미사용 `Copy` import
  - [OperatorContentDetailPage.tsx](../../services/web-kpa-society/src/pages/operator/OperatorContentDetailPage.tsx) — copy 버튼 + `handleCopyToStore` + `isCopying` state + 미사용 `Copy` import
- **deprecated 메서드 (제거)**: [content.ts](../../services/web-kpa-society/src/api/content.ts) `contentApi.copyToStore` (호출자 0)

### 3-2. 백엔드 (apps/api-server)
- **컨트롤러 (삭제)**: `routes/kpa/controllers/working-content.controller.ts` (219줄, `NO_STORE` 403 throw 포함)
- **route mount (제거)**: [kpa.routes.ts](../../apps/api-server/src/routes/kpa/kpa.routes.ts) `router.use('/operator/working-contents', ...)` + import
- **deprecated endpoint (제거)**: `POST /contents/:id/copy-to-store` (`INSERT INTO kpa_working_contents ...`)

## 4. entity / table HOLD 여부

- **HOLD (무변경)**: `KpaWorkingContent` entity(`kpa-working-content.entity.ts`), `entities.ts`(L325/L816) 등록,
  `entities/index.ts`(L45) export 는 **그대로 유지**. 마이그레이션 `20261124000000-AddBodyToKpaWorkingContents.ts` 무변경.
- **테이블 DROP 안 함**: IR §12 원칙 — 빈 테이블은 무해하며 DROP 은 별도 마이그레이션 WO 대상.
  현재 컨트롤러/엔드포인트가 모두 제거되어 테이블에 대한 write 경로는 0. entity 는 등록만 남은 미사용 상태.

## 5. canonical `/assets/copy` 회귀 확인

- 사용자 경로 `/contents/*`([ContentListPage](../../services/web-kpa-society/src/pages/contents/ContentListPage.tsx),
  [ContentDocumentsPage](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx))는
  본 WO 이전부터 `importContentToStore` → `assetSnapshotApi.copy({ assetType: 'content' })` → `POST /assets/copy` 를 호출하며,
  제거한 `contentApi.copyToStore` / `copy-to-store` 엔드포인트를 **호출하지 않는다** (정적 grep 확인 — `importContentToStore` 단독 사용).
- `/assets/copy` 라우트·`assetSnapshotApi`·`importContentToStore` **코드 무변경**.
- (배포 후 실브라우저 smoke 결과: §7)

## 6. 기존 snapshot 불변 검증

- `o4o_asset_snapshots` 및 그 write 경로(`/assets/copy`) 코드 **무변경**.
- 제거 대상 코드(working-content 컨트롤러/copy-to-store)는 `o4o_asset_snapshots` 에 write 하지 않고
  오직 `kpa_working_contents` 에만 INSERT 했으므로, 제거가 snapshot 계약에 영향 없음.
- 배포 후 재검증 baseline: total **18** (kpa/content 14 · kpa/cms 1 · kpa/resource 3) 유지 확인 (§7).

## 7. 검증 · 배포 · smoke

| 항목 | 결과 |
|------|------|
| `tsc --noEmit` (web-kpa-society) | EXIT=0 |
| `vite build` (web-kpa-society) | ✓ built, EXIT=0 |
| `npm run build` (api-server, tsc) | EXIT=0 |
| operator scope `window.confirm` 실호출 | **0건** (남은 mention 전부 주석) |
| Deploy API Server (Cloud Run) | ✓ success · 리비전 `o4o-core-api-02982-2vc` |
| Deploy Web Services (Cloud Run) | ✓ success · 리비전 `kpa-society-web-01735-mz9` |
| 직접 URL `/operator/working-content` smoke | ✅ catch-all → `/operator` 리다이렉트, 운영자 대시보드 정상 렌더(데드페이지·크래시 없음) |
| operator ContentHub(`/operator/docs`) 렌더 | ✅ copy 버튼 제거 후 목록·액션 컬럼 정상, ErrorBoundary 없음 |
| canonical 자료함(`/assets/copy`) 회귀 smoke | ✅ `/content/documents` 행 액션 메뉴에 "내 자료함 가져가기"(→ `importContentToStore` → `/assets/copy`) 정상 렌더. **불변식 보존 위해 실제 복사는 미실행**(mutation 회피) |
| snapshot 불변 재검증 (post-deploy) | ✅ `kpa_working_contents`=0, `o4o_asset_snapshots` total **18**(kpa/content 14·cms 1·resource 3) — baseline 동일 |

## 8. 커밋

- 코드: `703b68f2e`
- CHECK: 본 문서 커밋 (아래 완료 보고 참조)

## 9. 결론

IR 판정 D 에 따라 운영자 `WorkingContent` 레거시 dead flow(라우트·페이지·API client·컨트롤러·`copy-to-store`)를
제거했다. canonical `/assets/copy` → `o4o_asset_snapshots` 경로와 `KpaWorkingContent` entity/테이블은 무변경(HOLD).
직전 RUNBULK-CONFIRM WO 의 `WorkingContentEditPage` `window.confirm` §6 HOLD 는 컴포넌트 제거로 자연 소멸했다.
