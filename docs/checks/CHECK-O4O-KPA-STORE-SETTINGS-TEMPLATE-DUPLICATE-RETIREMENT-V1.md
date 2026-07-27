# CHECK-O4O-KPA-STORE-SETTINGS-TEMPLATE-DUPLICATE-RETIREMENT-V1

**WO:** WO-O4O-KPA-STORE-SETTINGS-TEMPLATE-DUPLICATE-RETIREMENT-V1 (G4 설정 화면 중복 정리)
**일자:** 2026-07-27
**범위:** KPA `/store/settings` ↔ `/store/settings/template` 중복 판정
**최종 판정:** **B — 일부 고유 기능 존재 → 은퇴 보류 (컴포넌트 삭제 없음 / redirect 없음)**

---

## 1. 결론 요약

`/store/settings/template`(PharmacyTemplatePage)은 **UI 상으로는 중복**이지만 **저장 필드와 실제 적용 경로가 다르다.**
현재 상태에서 은퇴하면 **매장 홈 템플릿을 실제로 변경할 수 있는 유일한 수단이 사라진다.**

핵심 사실:

| | `/store/settings` (PharmacyStorePage) | `/store/settings/template` (PharmacyTemplatePage) |
|---|---|---|
| 저장 API | `PATCH /stores/:slug/settings` | `PUT /stores/:slug/template` |
| 저장 필드 | `organizations.storefront_config.template` (+`theme`, `storefront_blocks`) | `organizations.template_profile` |
| 템플릿 선택이 매장 홈에 반영? | **아니오** — 선택해도 블록 목록 재생성 없음 | **예** — `storefront_blocks` 미저장 매장에서 기본 블록 생성 기준 |
| 권한 체크 | `organization_members.role IN (owner/admin/manager)` | `organizations.created_by_user_id === userId` |

→ WO §9 중지 조건 **"PharmacyTemplatePage만의 고유 저장 필드 존재"** 에 해당. 삭제하지 않음.

---

## 2. 두 화면 기능 비교

| 항목 | `/store/settings` | `/store/settings/template` |
|------|------------------|---------------------------|
| 템플릿 목록 출처 | 하드코딩 `TEMPLATES` ([PharmacyStorePage.tsx:50-55](services/web-kpa-society/src/pages/pharmacy/PharmacyStorePage.tsx#L50-L55)) | 하드코딩 `TEMPLATES` ([PharmacyTemplatePage.tsx:24-49](services/web-kpa-society/src/pages/pharmacy/PharmacyTemplatePage.tsx#L24-L49)) |
| 템플릿 종류 | BASIC / COMMERCE_FOCUS / CONTENT_FOCUS / MINIMAL (4종, 동일) | 동일 4종 (+블록 구성 미리보기 텍스트) |
| 현재값 조회 | `GET /stores/:slug/settings` → `cfg.template ?? template_profile` | `GET /stores/:slug/template` → `template_profile` |
| 저장 | `PATCH /settings` (명시적 "변경사항 저장" 버튼) | `PUT /template` (카드 클릭 즉시 저장) |
| 저장 필드 | `storefront_config.{template,theme,blocks}` + `storefront_blocks` | `template_profile` |
| 미리보기 | iframe 실제 매장 홈 + 데스크톱/모바일 폭 토글 | 새 탭 링크만 |
| 초기화 | 없음 | 없음 |
| 블록 편집 | 있음 (순서/on-off/limit) | 없음 |
| 테마 | 있음 (4종) | 없음 |
| 권한 | `isPharmacyOwner` (FE) + org_members role (BE) | PharmacyGuard (FE) + `created_by_user_id` (BE) |
| 저장 후 이동 | 이동 없음 (iframe 새로고침) | 이동 없음 (토스트만) |

**고유 기능 = 없음(UI 관점) / 있음(계약 관점).** 화면·레이아웃·문구 차이는 고유 기능으로 보지 않았고, **저장 필드와 실제 적용 여부의 차이**만을 고유 기능으로 판정했다.

---

## 3. 실제 적용 경로 (판정의 근거)

공개 매장 홈 렌더 계약 ([store-public-home.handler.ts:76-79](apps/api-server/src/routes/platform/store-public/store-public-home.handler.ts#L76-L79)):

```
hasCustomBlocks = storefront_blocks?.length > 0
blocks = hasCustomBlocks ? storefront_blocks
                         : generateDefaultBlocks(template_profile || 'BASIC')
```

- 공개 매장 홈은 `storefront_config.template` 을 **읽지 않는다.** ([StorefrontHomePage.tsx:138-160](services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx#L138-L160) — 소비 필드는 `blocks` + `theme` 뿐)
- `/store/settings` 의 템플릿 카드 클릭은 `setTemplate(t.id)` 만 수행 → 블록 목록 재생성 없음 → 저장 시 **직전 템플릿의 블록이 그대로 `storefront_blocks` 로 굳는다.** 즉 **템플릿 선택이 매장 홈에 반영되지 않는다.**
- `/store/settings/template` 은 `template_profile` 을 바꾸므로, `storefront_blocks` 미저장 매장에서 기본 블록 구성이 실제로 바뀐다.

### 프로덕션 실측 (read-only SELECT, `organizations WHERE isActive=true`)

| 지표 | 값 |
|------|----|
| 활성 매장 총계 | 17 |
| `storefront_blocks` 미저장 | **16** |
| `template_profile <> 'BASIC'` | **0** |
| `storefront_config.template` 보유 | 1 |
| `cfg.template` ↔ `template_profile` 불일치 | 0 |

해석:
- **지금까지 템플릿 화면으로 프로필을 바꾼 매장은 0건** → 삭제해도 **기존 데이터 손실은 없다.**
- 그러나 17개 중 **16개가 blocks 미저장** → 이 매장들에서 템플릿을 실제로 바꿀 수 있는 경로는 **`/store/settings/template` 뿐**이다. 은퇴하면 그 능력이 0이 된다.

> 백엔드 주석은 `template_profile` 을 "deprecated fallback" 으로 표기 ([store-settings.controller.ts:17](apps/api-server/src/routes/o4o-store/controllers/store-settings.controller.ts#L17)) 하지만, **대체 경로(canonical 화면의 템플릿 적용)가 아직 동작하지 않으므로 deprecation 이 완결되지 않았다.**

---

## 4. 활성 인바운드

저장소 전체 검색(`settings/template`, `PharmacyTemplatePage`, `navigate/href/targetUrl`):

| 분류 | 결과 |
|------|------|
| 활성 UI 링크 | **0** |
| 홈 CTA | 0 |
| 사이드바 | 0 |
| 알림·이메일·외부 링크 | 0 |
| legacy redirect | 0 |
| 테스트 | 0 |
| 코드 참조 | `App.tsx` lazy import + Route, `pages/pharmacy/index.ts` barrel export (3건) |
| 문서 | `docs/archive/**` 감사 문서 + `docs/investigations/IR-O4O-KPA-MY-STORE-FULL-STRUCTURE-AUDIT-V1.md` (모두 과거 감사 기록) |

→ **hidden route (URL 직접 접근 전용), 활성 인바운드 0.** 다른 서비스(GlycoPharm/K-Cosmetics)는 이 컴포넌트를 공유하지 않는다(GlycoPharm 은 자체 `store.controller.ts` 의 동명 API 를 별도 보유).

---

## 5. 흡수 가능성 판단 (WO §4-B)

canonical 화면이 템플릿을 실제 적용하게 하려면 둘 중 하나가 필요하다.

| 방안 | 필요한 변경 | WO §7 저촉 |
|------|-----------|-----------|
| (a) 템플릿 변경 시 프론트에서 블록 재생성 | `generateDefaultBlocks` 를 프론트에 복제 또는 공통 패키지 추출 (현재 `@o4o/ui` 에 없음 — 백엔드 `store-public-utils.ts` 에만 존재) | **저촉** — 공통 템플릿 컴포넌트 추출 금지 / 기능 확장 금지 |
| (b) `PATCH /settings` 가 `template_profile` 도 쓰거나 블록을 재생성 | 백엔드 컨트롤러 변경 | **저촉** — 백엔드 API 변경 금지 |
| (c) 프론트에서 저장 시 `PUT /template` 을 추가 호출 | 권한 체크 축이 다름(`created_by_user_id` vs org_members) → 정당한 소유자에게 403 위험, deprecated 경로 신규 의존 | 기능 확장 + 회귀 위험 |

→ **흡수 규모가 이 WO 허용 범위를 넘는다.** WO §4-B "흡수가 크면 구현 중단 후 별도 WO 제안" 에 따라 중단.

---

## 6. 실제 변경 내역

| 파일 | 변경 |
|------|------|
| [PharmacyStorePage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyStorePage.tsx) | stale 문구 1건 정정 (WO §6 허용). `"변경 시 블록 목록이 재설정됩니다"` → 실제 동작(블록 재설정 없음 / 저장된 블록 우선)으로 정정 + 근거 주석 |
| [App.tsx](services/web-kpa-society/src/App.tsx) | `settings/template` Route 에 **은퇴 보류 사유 주석** 추가 (다음 감사에서 재중복 판정 방지) |

**삭제한 컴포넌트: 없음.**
**route 처리: 변경 없음** (`settings/template` → `PharmacyTemplatePage` 유지, redirect 미도입).
**redirect 미도입 이유:** redirect 도 삭제와 동일하게 `template_profile` 쓰기 경로를 제거하므로, 삭제 중지 조건이 redirect 에도 동일하게 적용된다.

### 변경 0 확인

| 항목 | 결과 |
|------|------|
| DB write / migration | **0** |
| 백엔드 API | **0** |
| 템플릿 데이터·종류 | **0** |
| 매장 storefront 설정(운영 데이터) | **0** |
| store-ui-core / 공통 모듈 | **0** |
| 사이드바 | **0** |
| GlycoPharm · K-Cosmetics | **0** |

---

## 7. 검증

### 정적 검색

```
rg "PharmacyTemplatePage|settings/template" services/web-kpa-society
→ App.tsx (lazy import 1 + Route 1 + 주석), pages/pharmacy/index.ts (barrel 1), PharmacyTemplatePage.tsx 자체
→ 활성 UI 인바운드 0 (변경 전후 동일)
```

### typecheck

```
cd services/web-kpa-society && npx tsc --noEmit
→ PASS (에러 0)
```

### browser smoke

기능·라우트 변경이 없고(문구 1건 + 주석), 저장 경로에 손대지 않았으므로 **저장 smoke 는 수행하지 않았다** (WO §8 — 운영 데이터 원상복구 불확실 시 저장 smoke 금지). 대신 **프로덕션 DB read-only SELECT 로 실제 데이터 분포를 실측**하여 §3 판정 근거를 확보했다.

---

## 8. 후속 WO 제안

**WO-O4O-KPA-STORE-SETTINGS-TEMPLATE-APPLY-FIX-V1 (선행)**

1. `/store/settings` 에서 템플릿 변경 시 블록 목록이 실제로 해당 템플릿 기본 구성으로 재생성되도록 수정
   - `generateDefaultBlocks` 를 프론트·백엔드 공유 가능한 위치로 정리(또는 `PATCH /settings` 가 `template` 변경 시 블록 재생성)
2. `template_profile` ↔ `storefront_config.template` 단일화 방향 확정 (deprecation 완결)
3. 위 완료 후 **본 WO 재개** → PharmacyTemplatePage 삭제 + `/store/settings/template` → `/store/settings` redirect

현재 프로덕션에 `template_profile <> 'BASIC'` 매장이 0건이므로, 선행 WO 완료 시 **데이터 마이그레이션 없이** 은퇴 가능하다.

---

## 9. 완료 기준 대비

| 기준 | 결과 |
|------|------|
| 두 화면의 실제 계약 확인 | ✅ 저장 필드·적용 경로·권한축 차이 확정 |
| 고유 기능 없을 때 삭제 | ⛔ **고유 기능 존재 → 삭제 안 함** (WO §9 중지 조건) |
| redirect 도입 | ⛔ 동일 사유로 미도입 |
| canonical 단일화 | ⏸ 후속 WO 선행 필요 |
| 기존 템플릿 선택·저장 기능 보존 | ✅ 양 화면 모두 보존 |
| DB·API·migration 변경 0 | ✅ |
| store-ui-core 변경 0 | ✅ |
| typecheck PASS | ✅ |
| CHECK 작성 | ✅ (본 문서) |
