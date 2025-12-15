# 신규 서비스 생성 표준 Work Order 템플릿

> ⚠ 본 문서는 CLAUDE.md v2.0을 기준으로 하며,
> 충돌 시 CLAUDE.md를 우선한다.

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 유형 | 표준 Work Order 템플릿 |
| 적용 대상 | 모든 신규 서비스 생성 |
| 최종 수정 | 2025-12-15 |
| 버전 | 1.0 |

---

# =====================================================================
# Work Order Standard Header (필수)
# =====================================================================

⚠ 1) 브랜치 규칙 (절대 준수)
- develop 브랜치에서 개발 금지
- 반드시 feature/<service-id>-phase<n> 브랜치에서 진행
- 예: feature/diabetes-pharmacy-phase1

⚠ 2) CLAUDE.md 준수
- 본 Work Order는 CLAUDE.md v2.0 규칙을 따른다
- Phase C Baseline Decision 반영 필수
- Core FROZEN / AppStore / InitPack 규칙 적용

⚠ 3) 브랜치 전환 규칙
```bash
# 전환 전
git add .
git commit -m "save state"

# 전환 후
git pull --rebase
```

⚠ 4) AppStore 개발 규칙
- manifest.ts & lifecycle 필수 구현
- manifestRegistry + appsCatalog 등록 필수
- api-server 직접 import 금지
- Controller → Service → Entity 구조 준수

# =====================================================================
# Merge Safety Rules (필수)
# =====================================================================

⚠ 1) Merge 범위 제한
- 본 Work Order에서 생성/수정한 파일만 포함
- 다른 폴더/기능/서비스 변경 금지
- 본인이 수정하지 않은 코드 삭제 금지

⚠ 2) Merge 충돌 처리 순서
1) 본인이 작업한 파일 우선 보존
2) 타 작업자의 파일은 변경 유지
3) 판단 불가 시 임의 수정 금지 → Rena 보고

⚠ 3) Merge 전 필수 절차
```bash
git checkout develop
git pull --rebase
git checkout <feature-branch>
git rebase develop
```

⚠ 4) Merge 후 검증
- dev 환경 빌드 성공
- 본인 작업 영역만 반영되었는지 확인
- 기존 기능 손상 여부 확인

⚠ 5) 절대 금지
- 타 작업자 코드 삭제
- 기존 기능 덮어쓰기
- Core 기능 Work Order 없이 수정

---

# [WORK ORDER] 신규 서비스: {서비스명}

> 아래 템플릿을 복사하여 실제 Work Order 작성 시 사용

---

## 1. 서비스 정보 (필수)

| 항목 | 값 |
|------|-----|
| 서비스 ID | `{service-id}` |
| 서비스명 | {한글명} |
| ServiceGroup | `{serviceGroup}` |
| 목표 상태 | Development / Active |
| 브랜치 | `feature/{service-id}-phase{n}` |

---

## 2. Phase C Baseline 준수 확인 (필수)

### 2.1 서비스 상태 정의

| 상태 | 조건 | 현재 |
|------|------|------|
| Active | Template 존재 + 실사용 | ☐ |
| Development | Template 존재 또는 핵심 앱 준비 | ☐ |
| Experimental | 명시적 experimental 표식 | ☐ |
| Planned | ServiceGroup만 정의 | ☐ |

> ⚠ Template 없는 서비스는 Active 불가

### 2.2 InitPack 필요 여부

| 조건 | InitPack |
|------|----------|
| 목표 상태 = Active | ✅ 필수 |
| 목표 상태 = Development | ☐ 선택 |
| 예외 대상 (platform-core, *ops 등) | ☐ 해당 시 체크 |

---

## 3. 필수 App 구성

### 3.1 Core App (있는 경우)

| App ID | 유형 | AppStore 등록 | 상태 |
|--------|------|---------------|------|
| `{domain}-core` | core | ✅ 필수 | ☐ |

### 3.2 Extension App (있는 경우)

| App ID | 의존 Core | AppStore 등록 | 상태 |
|--------|-----------|---------------|------|
| `{extension-id}` | `{core-id}` | 서비스 Active 시 | ☐ |

### 3.3 Feature/Standalone App (있는 경우)

| App ID | 유형 | AppStore 등록 | 상태 |
|--------|------|---------------|------|
| `{app-id}` | feature/standalone | ✅ 필수 | ☐ |

---

## 4. App 필수 파일 체크리스트

각 앱에 대해 아래 파일이 존재해야 함:

```
packages/{app-id}/
├── src/
│   ├── manifest.ts           ☐
│   ├── backend/
│   │   ├── index.ts          ☐
│   │   ├── controllers/      ☐
│   │   ├── services/         ☐
│   │   └── entities/         ☐
│   ├── frontend/
│   │   ├── pages/            ☐
│   │   └── components/       ☐
│   └── lifecycle/
│       ├── index.ts          ☐
│       ├── install.ts        ☐
│       ├── activate.ts       ☐
│       ├── deactivate.ts     ☐
│       └── uninstall.ts      ☐
└── package.json              ☐
```

---

## 5. AppStore 등록 체크리스트

### 5.1 manifestRegistry 등록

파일: `apps/api-server/src/app-manifests/manifestRegistry.ts`

```typescript
import { {AppId}Manifest } from '@o4o/{app-id}/manifest';

export const manifestRegistry = {
  // ... 기존 항목
  '{app-id}': {AppId}Manifest,
};
```

☐ 등록 완료

### 5.2 appsCatalog 등록

파일: `apps/api-server/src/app-manifests/appsCatalog.ts`

```typescript
{
  appId: '{app-id}',
  name: '{앱 이름}',
  version: '1.0.0',
  description: '{설명}',
  category: '{category}',
  type: '{core|feature|extension|standalone}',
  serviceGroups: ['{serviceGroup}'],
  dependencies: { '{dep-app}': '>=1.0.0' }, // 필요 시
},
```

☐ 등록 완료

---

## 6. Service Template (Active 목표 시 필수)

### 6.1 Template 파일 위치

```
apps/api-server/src/services/templates/{service-id}/
├── config.json
├── apps.json
└── README.md
```

### 6.2 Template 구성

☐ config.json 작성
☐ apps.json (포함 앱 목록) 작성
☐ InitPack 연동 (Active 목표 시)

---

## 7. 작업 순서

### Phase 1: 기반 구축

1. ☐ feature 브랜치 생성
2. ☐ Core App 생성 (해당 시)
3. ☐ manifest.ts 작성
4. ☐ lifecycle/ 구현
5. ☐ backend/ 기본 구조 생성

### Phase 2: 기능 구현

6. ☐ Entity 정의 (Migration-First)
7. ☐ Service/Controller 구현
8. ☐ Frontend 페이지 구현

### Phase 3: 통합

9. ☐ AppStore 등록 (manifestRegistry, appsCatalog)
10. ☐ 빌드 테스트 (`pnpm build`)
11. ☐ develop 머지

### Phase 4: 활성화 (Active 목표 시)

12. ☐ Service Template 생성
13. ☐ InitPack 구성
14. ☐ 통합 테스트

---

## 8. 완료 기준 (Definition of Done)

| 항목 | 상태 |
|------|------|
| 모든 앱 manifest.ts 존재 | ☐ |
| 모든 앱 lifecycle/ 존재 | ☐ |
| AppStore 등록 완료 | ☐ |
| `pnpm build` 성공 | ☐ |
| develop 브랜치 머지 | ☐ |
| Service Template 생성 (Active 시) | ☐ |
| InitPack 구성 (Active 시) | ☐ |

---

## 9. 커밋 가이드

```bash
# Phase 1 완료 시
git add packages/{app-id}/
git commit -m "feat({service-id}): Phase 1 - 기반 구축"

# Phase 2 완료 시
git commit -m "feat({service-id}): Phase 2 - 기능 구현"

# Phase 3 완료 시
git add apps/api-server/src/app-manifests/
git commit -m "feat({service-id}): Phase 3 - AppStore 등록"

# 최종
git checkout develop
git merge feature/{service-id}-phase{n}
git push origin develop
```

---

## 참조 문서

| 문서 | 용도 |
|------|------|
| `CLAUDE.md` | Platform Constitution (최우선) |
| `docs/app-guidelines/work-order-standard-header.md` | Work Order 표준 헤더 |
| `docs/app-guidelines/manifest-specification.md` | Manifest 규격 |
| `docs/app-guidelines/phase-d-new-app-checklist.md` | 신규 앱 체크리스트 |
| `docs/reports/phase-c-round2-baseline-decision.md` | Phase C Baseline |

---

*Template v1.0 - 2025-12-15*
