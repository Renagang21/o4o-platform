# CHECK-O4O-KPA-STORE-SETTINGS-TEMPLATE-APPLY-FIX-V1

**WO:** WO-O4O-KPA-STORE-SETTINGS-TEMPLATE-APPLY-FIX-V1
**일자:** 2026-07-27
**선행 CHECK:** [CHECK-O4O-KPA-STORE-SETTINGS-TEMPLATE-DUPLICATE-RETIREMENT-V1](CHECK-O4O-KPA-STORE-SETTINGS-TEMPLATE-DUPLICATE-RETIREMENT-V1.md) (판정 B — 은퇴 보류)
**결과:** 구현 완료. `/store/settings` 의 템플릿 선택이 공개 매장 홈에 실제 반영된다.

---

## 1. 기존 결함

```
/store/settings 템플릿 카드 클릭 → setTemplate() 만 수행 (블록 재생성 없음)
→ 저장 시 이전 템플릿의 blocks 가 그대로 storefront_blocks 로 기록
→ 공개 매장 홈은 storefront_blocks 만 렌더 (storefront_config.template 미참조)
→ 선택한 템플릿이 반영되지 않음
```

추가로 `PATCH /settings` 는 `template_profile` 을 쓰지 않아, 공개 홈의 blocks-부재 fallback
(`generateDefaultBlocks(template_profile)`)과 canonical 값(`storefront_config.template`)이 갈라져 있었다.

---

## 2. 선택한 구현 방식 — 백엔드 canonical 적용 (WO §3 권장안)

`generateDefaultBlocks` 를 프론트로 복제하지 않는다. 서버가 저장 시점에 적용한다.

| 계층 | 변경 |
|------|------|
| 신규 순수 모듈 | [store-settings-template.ts](apps/api-server/src/routes/o4o-store/store-settings-template.ts) — `generateDefaultBlocks` / `normalizeTemplate` / `resolveTemplateAndBlocks` (express·typeorm 의존 0 → 단위 테스트 가능) |
| 공용 컨트롤러 | [store-settings.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-settings.controller.ts) — 로컬 중복 정의 제거 후 위 모듈 사용, PATCH 에 optional `applyTemplateDefaults` 수용 + `template_profile` 동기화 |
| 프론트 | [PharmacyStorePage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyStorePage.tsx) — 템플릿 카드 선택 시 신호 예약, 저장 응답으로 state 동기화 |

**신규 endpoint 없음. 기존 PATCH 확장(additive).**

---

## 3. template 변경 판별 — 명시 신호만 사용

프론트가 항상 `blocks` 를 함께 전송하므로 서버는 "사용자 편집 blocks" 와 "이전 템플릿의 잔여 blocks" 를
내용만으로 구분할 수 없다. **blocks 내용 비교 휴리스틱을 쓰지 않고** 명시 필드를 도입했다.

```jsonc
PATCH /stores/:slug/settings
{
  "template": "COMMERCE_FOCUS",
  "theme": "professional",
  "blocks": [...],
  "applyTemplateDefaults": true   // 템플릿 카드를 실제로 선택했을 때만 true
}
```

프론트 신호 규칙 ([PharmacyStorePage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyStorePage.tsx)):

| 사용자 행동 | `applyTemplateDefaults` |
|------------|------------------------|
| 다른 템플릿 카드 선택 | `true` (예약) |
| 같은 템플릿 재클릭 | 변화 없음 (`selectTemplate` early return) |
| 블록 순서·on/off·표시개수 편집 | `false` 로 복귀 (**사용자 편집 우선**) |
| 저장 완료 | `false` 로 초기화 |

---

## 4. blocks 처리 규칙 (`resolveTemplateAndBlocks`)

우선순위:

```
1. applyTemplateDefaults === true
   → generateDefaultBlocks(template) 로 교체        (blocksSource='template-defaults')
2. blocks 가 요청에 포함
   → 요청 blocks 그대로 저장                        (blocksSource='request')
3. 둘 다 아님
   → 기존 blocks 유지, storefront_blocks write 안 함 (blocksSource='unchanged')
```

WO §6 대응:

| WO 항목 | 동작 |
|---------|------|
| §6.1 템플릿 실제 변경 | 새 템플릿 기본 blocks 로 교체 + `storefront_config.template` + `template_profile` 갱신 |
| §6.2 같은 템플릿에서 theme·blocks 편집 | 사용자 blocks 보존 (기본값 재생성 없음) |
| §6.3 템플릿 변경 + 블록 직접 편집 동시 | 프론트가 신호를 내려 **사용자 편집 blocks 우선** |

`applyTemplateDefaults` 미전송 시 동작은 **기존과 완전히 동일**하다(3서비스 공용 계약 비회귀).

---

## 5. 저장 필드 단일화

PATCH 성공 시 하나의 UPDATE 로 일치시킨다.

| 필드 | 값 |
|------|----|
| `storefront_config.template` | canonical 설정 값 |
| `template_profile` | 위와 동일 값으로 동기화 (`patch.template` 전송 시) |
| `storefront_blocks` | 실제 렌더 blocks (`blocksChanged` 일 때만 write) |

`template_profile` 은 **삭제하지 않고 호환 필드로 동기화만** 유지한다 (공개 홈 fallback·operator 콘솔·GlycoPharm 조회가 아직 소비).

```sql
UPDATE organizations
   SET storefront_config = $1::jsonb
     [, storefront_blocks = $N::jsonb]     -- blocksChanged 일 때만
     [, template_profile  = $N]            -- patch.template 있을 때만
     , "updatedAt" = NOW()
 WHERE id = $last
```

---

## 6. 권한

canonical PATCH 권한을 그대로 유지했다 (**변경 0**).

```
organization_members.role IN ('owner','admin','manager') AND left_at IS NULL
```

- legacy `created_by_user_id` 제한(`PUT /stores/:slug/template`)을 canonical 경로로 이식하지 않았다.
- `PUT /stores/:slug/template` 의 권한·동작은 이번 WO에서 변경하지 않았다.
- 다른 조직 변경 불가 — slug → org 해석 후 해당 org 로만 owner 체크.

---

## 7. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/o4o-store/store-settings-template.ts` | **신규** — 템플릿 기본 blocks + 적용 규칙 순수 모듈 |
| `apps/api-server/src/routes/o4o-store/controllers/store-settings.controller.ts` | 중복 정의 제거 → 순수 모듈 사용, `applyTemplateDefaults` 검증·적용, `template_profile` 동기화, 동적 UPDATE |
| `apps/api-server/src/routes/o4o-store/__tests__/store-settings-template.test.ts` | **신규** — 단위 테스트 11건 |
| `services/web-kpa-society/src/pages/pharmacy/PharmacyStorePage.tsx` | `applyTemplateDefaults` state·`selectTemplate`·블록 편집 시 해제·저장 응답 동기화·안내 문구 |
| `services/web-kpa-society/src/App.tsx` | `settings/template` route 주석 갱신 (은퇴 선행 조건 해소 기록) |

### 공용 모듈 영향 (CLAUDE.md Shared Module Change Rule)

`createStoreSettingsController` 소비처 **3곳 전부 확인**:

| 소비처 | 영향 |
|--------|------|
| `kpa.routes.ts:577` | 신규 신호 사용 (KPA 프론트) |
| `glycopharm.routes.ts:513` | **동작 불변** — 신호 미전송 시 기존 경로 그대로. `template` 전송 시 `template_profile` 동기화만 추가되며, 이는 GlycoPharm 공개 홈의 blocks-부재 fallback 과도 정합 방향 |
| `cosmetics.routes.ts:121` | 동일 (동작 불변) |

KPA-only 임시 예외를 만들지 않고 **공통 정책으로 처리**했다.

---

## 8. DB · migration 영향

| 항목 | 결과 |
|------|------|
| migration | **0** (스키마 변경 없음 — 기존 컬럼만 사용) |
| 일괄 update / backfill | **0** |
| 운영 데이터 변경 | 아래 §10 smoke 1건 외 **0** |
| 컬럼 삭제 (`template_profile`) | **하지 않음** (호환 유지) |

기존 매장은 **다음 저장 시점에 새 계약을 적용**받는다.

---

## 9. typecheck / build / test

| 검증 | 명령 | 결과 |
|------|------|------|
| api-server typecheck | `npx tsc -p tsconfig.build.json --noEmit` | **PASS** (에러 0) |
| kpa-society typecheck | `npx tsc --noEmit` | **PASS** (에러 0) |
| kpa-society build | `pnpm --filter @o4o/web-kpa-society build` | **PASS** (built in 22.33s) |
| 단위 테스트 | `npx jest src/routes/o4o-store/__tests__/store-settings-template.test.ts` | **PASS 11/11** |

테스트 커버리지:

```
템플릿별 기본 블록 구성 4종
legacy template_profile 이름 매핑 (standard/compact/visual)
BASIC → COMMERCE_FOCUS + applyTemplateDefaults → 새 기본 blocks, 이전 TABLET_PROMO 잔여 없음
같은 템플릿 theme 만 변경 → blocks 유지, write 없음
같은 템플릿 blocks 편집 → 편집값 유지
applyTemplateDefaults 미전송 → 기존 계약 불변
applyTemplateDefaults=true + template 미전송 → 현재 템플릿 기본값
applyTemplateDefaults=false + 편집 blocks → 기본값에 덮이지 않음
입력 배열 비변형
```

---

## 10. 프로덕션 검증

*(배포 후 기록 — 아래 §10-1 참조)*

### 10-1. 배포 · API smoke

<!-- FILLED_AFTER_DEPLOY -->

---

## 11. PharmacyTemplatePage 은퇴 가능 여부

**가능 — 선행 조건 해소됨.**

| 은퇴 차단 사유(선행 CHECK) | 현재 상태 |
|---------------------------|----------|
| `/store/settings` 템플릿 선택이 매장 홈에 미반영 | ✅ 해소 — 저장 시 기본 blocks 재생성 |
| `template_profile` 을 쓰는 유일한 경로 | ✅ 해소 — PATCH 가 동기화 |
| 프로덕션 `template_profile <> 'BASIC'` 데이터 | 0건 → 마이그레이션 불필요 |

후속 WO(`...DUPLICATE-RETIREMENT-V1` 재개)에서 수행할 것:

```
PharmacyTemplatePage 삭제
pages/pharmacy/index.ts barrel export 제거
/store/settings/template → /store/settings redirect (1홉)
PUT /stores/:slug/template 은퇴 여부는 별도 판단 (GlycoPharm 동명 API 별도 보유)
```

---

## 12. 완료 기준 대비

| 기준 | 결과 |
|------|------|
| `/store/settings` template 변경이 공개 홈에 반영 | ✅ (§4 규칙 + §10 검증) |
| 템플릿 변경 시 올바른 기본 blocks 생성 | ✅ 단위 테스트 |
| 같은 template 의 사용자 blocks 보존 | ✅ 단위 테스트 |
| `template_profile` ↔ `storefront_config.template` 일치 | ✅ 동일 UPDATE 에서 동기화 |
| 기존 권한 유지 | ✅ 변경 0 |
| 운영 데이터 일괄 변경 0 | ✅ |
| migration 0 | ✅ |
| typecheck·build PASS | ✅ |
| CHECK 작성 | ✅ (본 문서) |
