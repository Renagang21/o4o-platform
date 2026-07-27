# CHECK-O4O-KPA-STORE-SETTINGS-TEMPLATE-PAGE-RETIREMENT-V1

**WO:** WO-O4O-KPA-STORE-SETTINGS-TEMPLATE-PAGE-RETIREMENT-V1 (G4 설정 화면 중복 정리 — 최종 단계)
**일자:** 2026-07-27
**결과:** `PharmacyTemplatePage` 은퇴 완료. `/store/settings/template` → `/store/settings` 1홉 redirect.

---

## 1. 선행 완료 근거

| WO | commit | 확정 사항 |
|----|--------|----------|
| `...TEMPLATE-DUPLICATE-RETIREMENT-V1` | `dd4f08743` | 판정 B — 당시엔 고유 저장 필드(`template_profile`) 존재로 은퇴 보류 |
| `...TEMPLATE-APPLY-FIX-V1` | `a35fcaccb` / `5d6b9beff` | `/store/settings` 가 템플릿 변경 시 기본 blocks 재생성 + `template_profile` 동기화. 프로덕션 smoke 7건 PASS |

선행 CHECK: [DUPLICATE-RETIREMENT-V1](CHECK-O4O-KPA-STORE-SETTINGS-TEMPLATE-DUPLICATE-RETIREMENT-V1.md) · [APPLY-FIX-V1](CHECK-O4O-KPA-STORE-SETTINGS-TEMPLATE-APPLY-FIX-V1.md)

**은퇴 차단 사유 해소 확인:**

| 당시 차단 사유 | 현재 |
|---------------|------|
| `/store/settings` 템플릿 선택이 매장 홈에 미반영 | 해소 — 프로덕션 실증(공개 `/layout` 이 새 blocks·profile 반영) |
| `template_profile` 을 쓰는 유일한 경로 | 해소 — `PATCH /settings` 가 동기화 |
| 데이터 의존 | 프로덕션 `template_profile <> 'BASIC'` **0건** → 마이그레이션 불필요 |

---

## 2. 삭제 전 재확인 (중지 조건 점검)

| 중지 조건 | 확인 결과 |
|----------|----------|
| 다른 KPA 화면에서 실제 재사용 | **없음** — 활성 import 는 `App.tsx` lazy 1건뿐 |
| 타 서비스가 동일 파일 직접 import | **없음** — 저장소 전체에서 `PharmacyTemplatePage` 참조는 KPA 내부 3건(파일 자신 제외) |
| 공통 package export | **아님** — `packages/*` 미포함 |
| 외부 callback·알림 의존 | **없음** — 활성 인바운드 링크 0 (사이드바·CTA·이메일·테스트 전부 0, 선행 CHECK §4에서 확정) |
| `/settings` canonical 저장 회귀 | **없음** — 본 WO 는 `PharmacyStorePage` 미변경 |
| 동시 세션이 대상 파일 수정 중 | **없음** — 착수 시 dirty 파일은 `operator-dashboard.service.ts`, `AuditLogPage.tsx`, `pnpm-lock.yaml` (대상 아님) |

### legacy API 소비처

```
GET/PUT /stores/:slug/template  (kpa-store-template.controller.ts)
→ 프론트 소비처: PharmacyTemplatePage 가 유일했음 (삭제로 KPA 프론트 소비 0)
```

WO §9·§13 에 따라 **API·`template_profile` 은 이번에 건드리지 않았다.**
GlycoPharm 이 동명 경로 API 를 별도 보유하고(`glycopharm/controllers/store.controller.ts`),
공개 `GET /stores/:slug/template` 은 platform 공개 라우트에도 존재하므로 은퇴 판단은 별도 WO 대상이다.

---

## 3. 변경 내역

| 항목 | 내용 |
|------|------|
| **삭제한 컴포넌트** | `services/web-kpa-society/src/pages/pharmacy/PharmacyTemplatePage.tsx` (201줄) |
| **제거한 import** | [App.tsx:208](services/web-kpa-society/src/App.tsx) `const PharmacyTemplatePage = lazy(...)` |
| **제거한 export** | [pages/pharmacy/index.ts:41](services/web-kpa-society/src/pages/pharmacy/index.ts) barrel export → 은퇴 사유 주석으로 대체 |
| **제거한 stale 주석** | App.tsx 의 "은퇴 보류" 주석(APPLY-FIX-V1 시점) → 은퇴 완료 주석으로 교체 |

### route 처리

```tsx
// before
<Route path="settings/template" element={<PharmacyTemplatePage />} />

// after
<Route path="settings/template" element={<Navigate to="/store/settings" replace />} />
```

- route 자체는 **제거하지 않았다** (과거 북마크 보호).
- `replace` 사용 → 뒤로가기 시 redirect loop 없음.
- 대상 `/store/settings` 는 정적 경로이며 자기 자신으로 되돌리는 규칙이 없어 1홉으로 종료.
- 형제 legacy redirect `settings/layout → /store/settings` 와 동일 패턴.

**새 메뉴·CTA·기능 경로 추가 0.**

---

## 4. 백엔드 · DB 영향

| 항목 | 결과 |
|------|------|
| `GET/PUT /stores/:slug/template` | **변경 0** |
| `PATCH /stores/:slug/settings` | **변경 0** |
| `store-settings-template.ts` / `generateDefaultBlocks` | **변경 0** |
| `template_profile` / `storefront_config` / `storefront_blocks` | **변경 0** |
| DB schema · migration · 운영 데이터 | **변경 0** |
| K-Cosmetics · GlycoPharm · store-ui-core · 사이드바 | **변경 0** |

프론트엔드(KPA) route·컴포넌트 은퇴만 수행했다.

---

## 5. 정적 검증

```
rg "PharmacyTemplatePage|settings/template" services/web-kpa-society
→ App.tsx:1068  (주석)
→ App.tsx:1071  <Route path="settings/template" element={<Navigate to="/store/settings" replace />} />
→ pages/pharmacy/index.ts:41 (은퇴 사유 주석)
```

| 항목 | 기대 | 실제 |
|------|------|------|
| `PharmacyTemplatePage` 활성 참조 | 0 | **0** (주석 2건만) |
| barrel export | 0 | **0** |
| `settings/template` route | redirect 1건 | **1건** |
| 과거 문서(`docs/archive/**`, IR) 참조 | 유지 | 유지 (역사 기록, 미수정) |

---

## 6. typecheck · build

| 검증 | 명령 | 결과 |
|------|------|------|
| typecheck | `npx tsc --noEmit` | **PASS** (에러 0) |
| build | `pnpm --filter @o4o/web-kpa-society build` | **PASS** (built in 25.61s) |
| 삭제 chunk 잔여 | `ls dist/assets \| grep PharmacyTemplate` | **0건** — lazy chunk 미생성 확인 |

---

## 7. browser smoke

<!-- FILLED_AFTER_DEPLOY -->

---

## 8. G4 종료 상태

```
/store/settings            → 매장 홈 디자인 canonical (템플릿·테마·블록, 실제 적용까지 정합)
/store/settings/layout     → /store/settings redirect (legacy)
/store/settings/template   → /store/settings redirect (legacy, 본 WO)
```

**설정 화면 canonical 단일화 완료.**

### 별도 트랙 (본 WO 미포함)

| 항목 | 내용 |
|------|------|
| 로컬 테스트 계정 SSOT | `docs/local/TEST-ACCOUNTS.local.md` 의 `renagang21@gmail.com` 비밀번호 stale(프로덕션 401) |
| K-Cosmetics | `StoreSettingsPage` 가 `applyTemplateDefaults` 미전송 → 동일 템플릿 미적용 결함 잔존 (백엔드 계약은 준비 완료) |
| legacy template API | `GET/PUT /stores/:slug/template` KPA 프론트 소비 0 — 타 소비처 확인 후 은퇴 판단 |

---

## 9. 완료 기준 대비

| 기준 | 결과 |
|------|------|
| PharmacyTemplatePage 삭제 | ✅ |
| 활성 import·export 0 | ✅ |
| `/store/settings/template` → `/store/settings` redirect | ✅ (`replace`, 1홉) |
| canonical 설정 기능 유지 | ✅ (PharmacyStorePage 미변경) |
| 백엔드·DB·migration 변경 0 | ✅ |
| 타 서비스 영향 0 | ✅ |
| typecheck·build PASS | ✅ |
| CHECK 작성 | ✅ (본 문서) |
