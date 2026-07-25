# CHECK-O4O-KPA-CONTENT-REUSABLE-POLICY-LIST-DETAIL-PARITY-V1

> **WO:** WO-O4O-KPA-CONTENT-REUSABLE-POLICY-LIST-DETAIL-PARITY-V1
> **근거:** [CHECK-O4O-KPA-CONTENT-DETAIL-STORE-IMPORT-LINK-V1 §9-1](CHECK-O4O-KPA-CONTENT-DETAIL-STORE-IMPORT-LINK-V1.md) — smoke 중 발견된 목록 API `reusable_policy` 미반환
> **작성일:** 2026-07-25
> **유형:** 응답 필드 1개 추가(backend) + 판정 공통화(frontend 2). DB 변경·복사 정책 변경 0.
> **상태:** ✅ 코드 완료 / tsc 0 · build 성공 — 브라우저 smoke 는 §8

---

## 1. 문제 확정

| 계층 | `reusable_policy` | 결과 |
|------|-------------------|------|
| `GET /contents/:id` (상세) | ✅ `SELECT *` ([kpa.routes.ts:1691](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L1691)) | restricted 판정 정확 |
| `GET /contents` (목록) | ❌ 명시 컬럼 목록에서 누락 ([kpa.routes.ts:1564](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L1564)) | **판정이 항상 `false`** |
| 서버 복사 게이트 | ✅ `resolveContent()` restricted → `null` | 차단 정상 |

즉 **데이터 안전성 문제는 없고 UI 표시만 부정확**했다. 사용자가 restricted 콘텐츠에서 활성 버튼을 누르면 서버가 거절해 에러 토스트가 뜨는 상태.

영향 범위는 목록 응답을 쓰는 **모든 KPA 진입점**이다 — 목록 행 액션 / Drawer / 일괄 선택 / 문서형·자료실 페이지 / 자료실 HUB. 상세만 정확했다.

---

## 2. 변경 내용

### 2.1 Backend (1 파일, SELECT 1줄)

[apps/api-server/src/routes/kpa/kpa.routes.ts](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L1564) — 목록 SELECT 에 `c.reusable_policy` 추가.

```diff
   c.content_type, c.sub_type, c.like_count, c.view_count, c.author_name,
+  c.reusable_policy
  FROM kpa_contents c ${where}
```

WHERE·정렬·권한 분기·페이징 **전부 무변경**. 응답에 필드 하나가 추가되는 additive 변경이다.

### 2.2 Frontend (2 파일 — 동일 판정으로 정렬)

| 파일 | 변경 |
|------|------|
| [ContentDocumentsPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx) | 인라인 `reusable_policy === 'restricted'` **4곳** → `isContentImportRestricted()`. 하드코딩 라벨 2곳 → `CONTENT_IMPORT_LABEL` / `CONTENT_IMPORT_RESTRICTED_LABEL`. 인라인 `assetSnapshotApi.copy` 2곳(단건·일괄) → `importContentToStore()` |
| [ContentListPage.tsx](../../services/web-kpa-society/src/pages/contents/ContentListPage.tsx) | Drawer 판정을 `drawerDetail ?? drawerItem` 로(상세 응답 우선). `_select` 체크박스 restricted 미표시 — DocumentsPage 규칙과 동일화 |

공용 모듈 [api/contentStoreImport.ts](../../services/web-kpa-society/src/api/contentStoreImport.ts) 는 **선행 WO 산출물 그대로 재사용**했다(내용 변경 없음).

→ 결과적으로 **목록·Drawer·일괄·상세·문서형·자료실 전 진입점이 같은 판정 함수·같은 라벨·같은 호출**을 쓴다.

### 2.3 Drawer 판정 기준

두 페이지 모두 Drawer 오픈 시 상세 API 를 별도 호출(`drawerDetail`)하고 있었으나, restricted 판정은 목록 행(`drawerItem`)으로 하고 있었다. **상세 응답이 authoritative** 이므로 `drawerDetail ?? drawerItem` 으로 바꿨다(로드 전에는 목록 행 폴백 — 이제 목록도 필드를 반환하므로 두 값이 일치).

---

## 3. 표시·비활성 상태 통일 결과

| 진입점 | restricted 처리 | 비고 |
|--------|-----------------|------|
| 목록 행 액션 | 라벨 `(불가)` + `disabled` | 기존과 동일, 이제 실제로 동작 |
| 목록 체크박스 | **미표시(선택 불가)** | ContentListPage 를 DocumentsPage 규칙에 맞춤 |
| 일괄 가져가기 | 사전 제외 + `가져가기 불가 N개는 제외됨` | 기존 로직 유지(방어선으로 존치) |
| Drawer | 라벨 `(불가)` + `disabled` | 판정 기준을 상세 응답으로 상향 |
| 상세 화면 | 라벨 `(불가)` + `disabled` | 선행 WO, 변경 없음 |
| 자료실 HUB | store copy → 클립보드 복사로 폴백 | 아래 §4 |

---

## 4. 공통 모듈 소비처 확인 (CLAUDE.md Shared Module Rule)

`GET /api/v1/kpa/contents` 소비처를 전수 확인했다.

| 소비처 | 영향 |
|--------|------|
| `ContentListPage` (문서형 섹션) | ✅ 의도된 정합 |
| `ContentDocumentsPage` (`/content/documents`·`/content/resources`) | ✅ 의도된 정합 |
| `resources.ts` → `ResourcesHubPage` (`sub_type='resource'`) | ⚠️ **동작 변화** — 아래 |
| GlycoPharm / K-Cosmetics `ContentListPage` | ❌ 영향 없음 — 각자 `/api/v1/glycopharm`·`/api/v1/k-cosmetics` 베이스, 별도 백엔드 라우트 |

**자료실 HUB 동작 변화 (의도됨):** [ResourcesHubTemplate.tsx:671·857](../../packages/shared-space-ui/src/ResourcesHubTemplate.tsx#L671) 은 `row.reusable_policy !== 'restricted'` 로 `isStoreTarget` 을 정하고, restricted 면 store copy 대신 **클립보드 복사**로 폴백한다(WO-O4O-STORE-LIBRARY-RESOURCE-COPY-VISIBILITY-FIX-V1). 필드가 없던 동안 이 분기는 **무효**였다. 이제 restricted 자료는 설계대로 폴백한다 — 템플릿 코드는 손대지 않았고, 이미 있던 정책이 비로소 작동하는 것이다.

> `ResourcesHubTemplate` 은 GlycoPharm·K-Cosmetics·Neture 도 쓰는 공통 컴포넌트지만 **템플릿을 변경하지 않았고** 다른 서비스는 각자 백엔드 응답을 쓰므로 영향 없음.

---

## 5. 변경하지 않은 것

| 항목 | 결과 |
|------|:----:|
| 서버 복사 정책 / resolver 게이트 | **0** |
| DB · migration · 컬럼 | **0** |
| 신규 API 엔드포인트 · route | **0** |
| `contentStoreImport.ts` (선행 WO 모듈) | **0** |
| `ResourcesHubTemplate` 등 공통 패키지 | **0** |
| 라벨 문구("내 자료함 가져가기") | **0** — 용어 정비는 별건 |
| C6 (복사 완료 CTA 목적지) | **0** — 후속 |
| GlycoPharm / K-Cosmetics 동일 패턴 점검 | **0** — 본 WO 는 KPA 범위 |

---

## 6. 변경 파일 (3)

```
apps/api-server/src/routes/kpa/kpa.routes.ts                        (+3 comment, +1 column)
services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx
services/web-kpa-society/src/pages/contents/ContentListPage.tsx
```

**다른 세션 WIP 미포함:** `pnpm-lock.yaml`, `docs/checks/CHECK-O4O-NETURE-SUPPLIER-PARTNER-COMMISSIONS-UI-LOCALIZATION-V1.md`, `apps/api-server/src/scripts/otc-v2-*`, `apps/api-server/src/scripts/data/*` — 미접촉.

---

## 7. typecheck / build

| 대상 | 명령 | 결과 |
|------|------|------|
| api-server | `tsc --noEmit` | ✅ 변경 파일 **0 errors** (전체 13건은 모두 `src/scripts/*` — 다른 세션 WIP, 본 변경과 무관) |
| web-kpa-society | `tsc --noEmit` | ✅ **0 errors** |
| web-kpa-society | `vite build` | ✅ 성공 (20.48s) |

---

## 8. 브라우저 smoke

*(배포 후 기록)*

---

## 9. 미검증 항목

*(배포 후 기록)*

---

*End of CHECK-O4O-KPA-CONTENT-REUSABLE-POLICY-LIST-DETAIL-PARITY-V1*
