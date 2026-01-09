# Monorepo Legacy Interference Investigation V2

> **Type**: Investigation (Deep Dive)
> **Date**: 2026-01-09
> **Status**: COMPLETED
> **Parent**: WO-MONOREPO-LEGACY-COMPLEXITY-INVESTIGATION-V1

---

## 1. 조사 목적

V1에서 "명확한 레거시"를 식별했다면, V2는 다음 질문에 답합니다:

> **"지금 남아 있는 것 중, 개발/디버깅/AI 작업 시 '계속 판단 비용을 발생시키는 요소'는 무엇인가?"**

---

## 2. 조사 결과 요약

| 항목 | 분류 | 필요도 | 이유 |
|------|------|--------|------|
| `apps/app-api-reference/` | ❌ 제거 권장 | High | 사용되지 않는 reference 앱, 혼란 유발 |
| `apps/web-server-reference/` | ❌ 제거 권장 | High | 사용되지 않는 reference 앱, 혼란 유발 |
| `apps/api-server/src/common/dto/example-*.dto.ts` | ⚠️ 정리 후보 | Medium | 템플릿이지만 import 없음, 혼란 가능 |
| `vite.config.shared.js` (중복) | ❌ 제거 권장 | High | `.ts` 버전과 중복, React 버전 불일치 |
| `agent_manifest.md` | ❌ 제거 권장 | High | 과거 Agent 작업 흔적, 더 이상 유효하지 않음 |
| `analyze_docs.js` | ⚠️ 정리 후보 | Low | 일회성 분석 스크립트, scripts/로 이동 권장 |
| `start-chrome-debug.sh` | ⚠️ 정리 후보 | Low | 디버그 도구, scripts/로 이동 권장 |
| `tsconfig.json` + `tsconfig.base.json` | ⚠️ 정리 후보 | Medium | 역할 중복, 어느 것이 기준인지 불명확 |

---

## 3. D1: Import 되지 않는 "그럴듯해 보이는" 파일

### 3.1 Reference 앱들 (❌ 제거 권장)

**apps/app-api-reference/**
- 소스 파일 5개: `env.ts`, `main.ts`, `auth.middleware.ts`, `api.routes.ts`, `health.routes.ts`
- 어디서도 import 되지 않음
- 참조용이라면 docs에 있어야 함

**apps/web-server-reference/**
- 소스 파일 13개: 완전한 React 앱 구조
- 어디서도 import 되지 않음
- services/web-* 패턴과 혼동 가능

### 3.2 Example DTO 파일들 (⚠️ 정리 후보)

```
apps/api-server/src/common/dto/example-request.dto.ts
apps/api-server/src/common/dto/example-response.dto.ts
```

- 204줄/173줄의 템플릿 파일
- 실제 import 없음 (grep 확인)
- Cheat Sheet 역할이지만, 코드가 아닌 docs가 적합

---

## 4. D2: 참조용/예시용 코드

| 파일 | 판정 | 이유 |
|------|------|------|
| `apps/app-api-reference/*` | ❌ 제거 | 별도 node_modules까지 가진 완전한 앱 |
| `apps/web-server-reference/*` | ❌ 제거 | 별도 node_modules까지 가진 완전한 앱 |
| `example-*.dto.ts` | ⚠️ 문서화 후 제거 | 유용하지만 위치가 잘못됨 |

---

## 5. D3: AI/자동화/스크립트 잔재

### 5.1 루트 레벨 파일 (❌ 제거 권장)

**agent_manifest.md**
```markdown
# Antigravity Agent Manifest
| Agent-Yaksa | Yaksa App Dev | feature/yaksa-report-suite | ...
| Agent-Cosmetics | Cosmetic Retail Dev | feature/cos-retail-ui | ...
```
- 과거 에이전트 분산 작업 흔적
- 현재 main 브랜치 기준으로 무효
- AI가 이 파일을 보면 혼란 발생 가능

### 5.2 루트 레벨 스크립트 (⚠️ 정리 후보)

| 파일 | 판정 | 이유 |
|------|------|------|
| `analyze_docs.js` | ⚠️ scripts/로 이동 | 일회성 분석 도구 |
| `start-chrome-debug.sh` | ⚠️ scripts/로 이동 | MCP 디버그용 |

---

## 6. D4: 이중 기준 설정 파일

### 6.1 vite.config.shared 중복 (❌ 하나 제거)

| 파일 | React 버전 주석 | 크기 |
|------|-----------------|------|
| `vite.config.shared.ts` | React 18.2.0 호환성 | 3,983 bytes |
| `vite.config.shared.js` | React 19 호환성 | 4,494 bytes |

**문제점**: 어느 것이 기준인지 불명확, React 버전 주석 불일치

**권장**: `.js` 파일 제거, `.ts`만 유지

### 6.2 tsconfig 3개 (⚠️ 역할 명확화 필요)

| 파일 | 역할 | 문제 |
|------|------|------|
| `tsconfig.json` | 루트 설정 | base.json과 중복 다수 |
| `tsconfig.base.json` | 확장 설정 | 더 많은 paths/references 포함 |
| `tsconfig.packages.json` | 패키지용 NodeNext | 역할 명확 |

**문제점**: `tsconfig.json`과 `tsconfig.base.json`의 차이가 미미하고, 어느 것을 extends 해야 하는지 불명확

---

## 7. D5: Monorepo 구조 설명 가능성 테스트

### 질문 1: 신규 개발자에게 10분 안에 구조 설명 가능?

**답변: NO**

- apps/ 16개 (reference 2개 포함)
- services/ 5개 (web-* 형태)
- packages/ 65개

패키지가 65개로 너무 많고, apps와 services의 구분 기준이 불명확.

### 질문 2: "이 서비스 추가하려면 어디에 만들죠?"에 즉답 가능?

**답변: NO**

| 유형 | 위치 | 기준 |
|------|------|------|
| 웹 서비스 | services/web-*? apps/*? | 불명확 |
| API | apps/api-server (단일) | 명확 |
| 패키지 | packages/* | 너무 많음 |

### 질문 3: AI에게 "여기 고쳐"라고 말했을 때 오해 가능성 낮은가?

**답변: NO (경미)**

- example DTO 파일들이 혼란 가중
- reference 앱들이 실제 코드와 혼동 가능
- vite.config.shared 중복으로 어느 것을 수정해야 하는지 불명확

---

## 8. 결론

### 8.1 방해 요인 리스트 (정리 필요도 순)

| 순위 | 항목 | 분류 | 정리 필요도 |
|------|------|------|-------------|
| 1 | `apps/app-api-reference/` | ❌ 제거 | **High** |
| 2 | `apps/web-server-reference/` | ❌ 제거 | **High** |
| 3 | `vite.config.shared.js` | ❌ 제거 | **High** |
| 4 | `agent_manifest.md` | ❌ 제거 | **High** |
| 5 | `tsconfig.json` vs `tsconfig.base.json` | ⚠️ 통합 | Medium |
| 6 | `example-*.dto.ts` | ⚠️ docs 이동 | Medium |
| 7 | 루트 스크립트들 | ⚠️ scripts/ 이동 | Low |

### 8.2 최종 판단

> **"이 상태로도 개발은 가능하지만, Reference 앱과 중복 설정 파일은 계속 판단 비용을 발생시킨다."**

---

## 9. 후속 조치 권장

### 즉시 제거 가능 (4개)
1. `apps/app-api-reference/` - 전체 삭제
2. `apps/web-server-reference/` - 전체 삭제
3. `vite.config.shared.js` - 삭제 (.ts만 유지)
4. `agent_manifest.md` - 삭제

### 정리 필요 (3개)
1. `example-*.dto.ts` → `docs/templates/dto-examples.md`로 변환
2. `tsconfig.json` + `tsconfig.base.json` → 역할 명확화 또는 통합
3. 루트 스크립트 → `scripts/`로 이동

---

*Generated: 2026-01-09*
*Investigation Type: Deep Dive (V2)*
