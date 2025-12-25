# R8 Merge 후보 통합 가능성 판정

> **Investigation ID**: IR-20251225-r8-merge-candidates
> **조사일**: 2025-12-25
> **상태**: 완료

---

## 1. 조사 대상

| 후보 | 병합 대상 | 현재 상태 |
|------|-----------|-----------|
| A | `design-system-cosmetics` → `ui` | 패키지 존재, 미사용 |
| B | `@o4o-apps` 구조 단순화 | signage만 존재, 런타임 참조 있음 |

---

## 2. 조사 결과

### 2.1 design-system-cosmetics → ui 통합 판단

#### 현재 상태
- **위치**: `packages/design-system-cosmetics/`
- **외부 참조**: **0건** (자기 자신의 package.json, index.ts만 참조)
- **파일 구조**:
  - `src/components/AGButton.tsx`, `AGCard.tsx` (2개)
  - `src/theme/colors.ts`, `typography.ts`, `spacing.ts`, `index.ts`

#### ui 패키지와 비교

| 항목 | design-system-cosmetics | ui (Design Core v1.0) |
|------|-------------------------|------------------------|
| AGButton | cosmetics 전용 (mode: seller/partner/supplier/sample) | 범용 (variant 기반) |
| 테마 | cosmeticsTheme (Pink 기반, Mode별 컬러) | tokens (Blue 기반, 시맨틱 컬러) |
| 컴포넌트 수 | 2개 (AGButton, AGCard) | 30+ 개 |
| 실사용 여부 | **미사용** | **적극 사용 중** |

#### 판정: **C (병합 보류 → 삭제 검토)**

**이유**:
1. **외부 참조 0건** - 어떤 앱/패키지에서도 import하지 않음
2. **기능 중복 완료** - ui 패키지에 AGButton, AGCard, theme 모두 존재
3. **Cosmetics 전용 Mode** - 현재 cosmetics 서비스에서도 ui 패키지 사용 중
4. **병합 불필요** - 사용하지 않는 코드를 병합할 이유 없음

**권장 조치**: R8-Drop (Legacy 삭제)로 처리

---

### 2.2 @o4o-apps 구조 단순화 판단

#### 현재 상태
- **위치**: `packages/@o4o-apps/`
- **하위 패키지**: `signage` (1개만 존재)
- **외부 참조**: **16건** (런타임 의존성 있음)

#### 참조 현황

| 참조 위치 | 참조 내용 |
|-----------|-----------|
| `apps/main-site/src/components/registry/ui.tsx` | SignageGrid, SignagePlayer 등 6개 UI 컴포넌트 |
| `apps/main-site/src/components/registry/function.ts` | signageDashboard 등 6개 함수 |
| `apps/api-server/tests/multi-tenant/setup.ts` | NavigationRegistry, ViewRegistry (cms-core 참조) |
| `apps/api-server/package.json`, `tsconfig.json` | 빌드 설정 |
| `apps/main-site/vite.config.ts`, `tsconfig.json` | 빌드 설정 |

#### 구조 분석

```
packages/@o4o-apps/signage/
├── manifest.ts          # AppStore manifest (standalone 타입)
├── lifecycle/           # install, activate, deactivate, uninstall
├── functions/           # 6개 function 파일
├── ui/                  # 6개 UI 컴포넌트 (미구현 참조)
└── views/               # 6개 JSON view 정의
```

#### 판정: **C (병합 보류)**

**이유**:
1. **런타임 의존성 존재** - main-site에서 signage 컴포넌트/함수 직접 import
2. **AppStore 구조 준수** - manifest.ts, lifecycle 완비된 standalone 앱
3. **단순화 대상 불명확** - signage 1개만 존재, "단순화"할 복잡도 없음
4. **@o4o-apps 네임스페이스** - AppStore 앱 전용 위치로 적절함

**권장 조치**: 현행 유지 (추후 AppStore 앱 추가 시 동일 구조 사용)

---

## 3. 최종 판정 요약

| 후보 | 판정 | 조치 |
|------|------|------|
| design-system-cosmetics → ui | **C: 보류** | R8-Drop으로 **삭제** 권장 |
| @o4o-apps 단순화 | **C: 보류** | 현행 유지 |

---

## 4. 다음 단계

### 4.1 design-system-cosmetics 삭제 (R8-Drop)

```bash
# 삭제 대상
rm -rf packages/design-system-cosmetics

# package.json workspace 정리 (필요시)
# pnpm-workspace.yaml 확인
```

**삭제 전 확인사항**:
- [x] 외부 참조 0건 확인 완료
- [ ] pnpm build 성공 확인 (삭제 후)
- [ ] develop/main 푸시

### 4.2 @o4o-apps 유지

- 현재 signage 앱이 유일하게 존재
- 향후 신규 standalone 앱 추가 시 동일 네임스페이스 사용
- 구조 변경 불필요

---

## 5. 결론

**R8 Merge 작업 불필요**

- design-system-cosmetics: 미사용 패키지 → **삭제 대상** (R8-Drop)
- @o4o-apps: 정상 운영 중 → **유지**

"병합"이 아닌 "정리(삭제)"가 필요한 상황입니다.

---

*작성: 2025-12-25*
*IR-20251225-r8-merge-candidates 완료*
