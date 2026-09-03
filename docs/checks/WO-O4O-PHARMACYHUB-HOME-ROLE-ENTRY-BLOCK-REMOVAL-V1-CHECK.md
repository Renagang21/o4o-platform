# WO-O4O-PHARMACYHUB-HOME-ROLE-ENTRY-BLOCK-REMOVAL-V1 — CHECK

**판정:** **PASS**
**성격:** PharmacyHub 홈(`/`) UI 제거. 역할·권한·route 계약 변경 **0**
**작성일:** 2026-09-03
**기준 commit:** `eed815e16` (= `origin/main`, ahead/behind 0/0)

---

## 0. 한 줄 결론

PharmacyHub 커뮤니티 홈의 `역할별 진입점` 블록(`CommunityServiceHome.valueGuideSlot`)을 제거했다.
역할별 실제 진입 경로는 GlobalHeader / 사용자 메뉴가 이미 제공하므로 홈에 중복으로 두지 않는다.
**역할 모델 · route · guard 는 무변경**이다.

---

## 1. 변경 파일 (3)

| 파일 | 변경 |
|---|---|
| `services/web-pharmacy-hub/src/pages/community/CommunityHomePage.tsx` | `valueGuidePlacement="after-help"` + `valueGuideSlot`(AppEntrySection "역할별 진입점") 제거. 이 블록 전용이던 `ROLE_ENTRIES` const, `roleEntries` 파생값, `roles` 지역변수 제거. 미사용이 된 import 정리 — `AppEntrySection`(shared-space-ui), `ROLES`·`ROLE_LABELS`·`satisfiesRole`(config/service). `BRAND` 는 heroSlot 에서 계속 사용하므로 유지. 파일 헤더의 "역할별 진입점 카드 → valueGuideSlot" 주석을 현재 구조로 갱신 |
| `services/web-pharmacy-hub/src/pages/RoleEntryPage.tsx` | **삭제**. import 소비처 0 (아래 §3) |
| `services/web-pharmacy-hub/src/App.tsx` | 라우트 주석의 stale 한 줄 `/ 홈 (브랜드 표시 + 역할별 진입점)` 제거. 같은 목록 아래에 이미 `/ 커뮤니티 홈 (canonical · 공통 CommunityServiceHome)` 이 있어 중복이자 사실과 불일치였다 |

---

## 2. 유지 (무변경 확인)

| 항목 | 상태 |
|---|---|
| `PharmacyHubGlobalHeader` 의 역할별 진입 (`satisfiesRole(ROLES.storeOwner/operator/admin)`) | 무변경 |
| `config/navigation.ts` 의 `ROLE_LABELS[ROLES.operator]` → `/operator` nav 항목 | 무변경 |
| `/store-owner` · `/operator` · `/admin` route 와 shell/guard (`App.tsx`) | 무변경 |
| `config/service.ts` 의 `ROLES` · `ROLE_LABELS` · `satisfiesRole` | 무변경 (다른 소비처 존재) |
| 회원가입/로그인/역할 모델 · `JoinStatusPage` 의 승인 후 진입 안내 | 무변경 |
| 다른 서비스(KPA-Society 등)의 역할별 진입 UI | 무변경 (파일 접촉 0) |

---

## 3. `RoleEntryPage` 삭제 근거

```
grep -rn "RoleEntryPage" --include=*.ts --include=*.tsx services/web-pharmacy-hub/src apps packages
  → src/App.tsx:629                    (과거 제거 이력 주석)
  → src/config/operatorMenuGroups.ts:27 (과거 제거 이력 주석)
```

import 0 · JSX 사용 0 · route 등록 0. 남은 2건은 "RoleEntryPage placeholder 에서 실제
`OperatorDashboardPage` 로 교체했다"는 **과거 사실 기록**이므로 그대로 둔다.
raw-source spec(`*.spec.*` / `*.test.*`) 소비처도 0 건이다.

---

## 4. 검증

| 항목 | 결과 |
|---|---|
| `pnpm run type-check` (`tsc -b`, build 에 포함) | ✅ PASS |
| `pnpm run build` (`tsc -b && vite build`) | ✅ PASS — 3887 modules, 17.35s |
| 번들 내 `역할별 진입점` 리터럴 | ✅ **0건** (`grep -c "역할별 진입점" dist/assets/*.js` → 0) |
| 미사용 import 잔재 | ✅ 0 (tsc `noUnusedLocals` 통과) |
| 홈 나머지 슬롯 (hero / 가입상태 밴드 / 공지 / 커뮤니티 이용 안내 / 앱 진입 카드 / CTA / help) | ✅ 무변경 — 제거한 것은 `valueGuideSlot` 하나뿐이라 `CommunityServiceHome` 의 나머지 섹션 간격은 공통 컨테이너 기본 배치를 그대로 따른다 |

**미수행:** 배포 환경 브라우저 desktop/mobile 육안 smoke. 로컬 preview 는 백엔드 API 없이는
공지·최신활동이 에러 상태로만 뜨므로 유효한 레이아웃 검증이 되지 않는다. 대신 위의
**번들 리터럴 0건**으로 블록 부재를 확정했다. 배포 후 육안 확인은 사용자 측에서 수행한다.

---

## 5. Git

| 항목 | 값 |
|---|---|
| 기준 HEAD | `eed815e16` (= `origin/main`) |
| stage 방식 | path-specific (`git add <파일>` · `git rm`) — `git add .` 미사용 |
| 타 세션 dirty·미추적 파일 | 접촉 **0** (`ci-pipeline.yml`, `store-playlist.repository.ts`, `StoreOrderWorktablePage.tsx`, `services/web-kpa-society/src/utils/**`, `apps/api-server/src/__tests__/**` 모두 미접촉) |

---

## 6. 문서 정합

문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

- 발견 1건 = `App.tsx` 라우트 주석의 "홈 = 역할별 진입점" stale 기술. 본 WO 범위 내 파일이므로 인라인 수정했다.
