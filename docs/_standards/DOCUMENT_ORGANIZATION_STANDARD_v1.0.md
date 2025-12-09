# O4O Platform - Document Organization Standard v1.0

> 전체 문서 개편을 위한 공식 기준
> docs/ 전체 구조를 재정리할 때 사용하는 규칙

---

## 0. 문서 정리 기준의 목적

이 기준은 O4O Platform의 500개 이상 문서를
재조직하고 유지보수 가능한 체계로 만들기 위한 **통합 정리 규칙**입니다.

이 기준은 다음을 목표로 합니다:

- 문서 검색성 향상
- 문서 중복 방지
- 문서의 역할 명확화
- 아카이브/현행 문서 분리
- 개발자/AI 모두가 참조하기 쉬운 구조 구성
- AppStore·Core·Extension·Service 문서의 분리

---

## 1. 최상위 문서 카테고리 구조

모든 문서는 아래 9개의 상위 카테고리 중 하나에 반드시 속해야 한다.

```
docs/
  app-guidelines/     <- Core/Extension/Service/Refactoring/Manifest 기준 문서
  specs/              <- 각 앱 스펙·도메인 사양
  design/             <- 아키텍처·플랫폼 구조 설계
  plan/               <- Task, Work Order, Phase 문서
  dev/                <- 개발 조사, 분석, 코드 레퍼런스
  ops/                <- 배포, 운영, CI/CD, 인프라
  guides/             <- 사용자/관리자 매뉴얼
  reference/          <- 기술 참고(AI spec, API spec, schema)
  reports/            <- 완료 보고서, 릴리즈 노트
  archive/            <- 구버전/과거 자료
```

---

## 2. 카테고리별 문서 기준

### 2.1 app-guidelines/

**플랫폼 전체를 지배하는 개발 기준 문서**
Core, Extension, Service, Refactoring, Manifest 관련 문서만 위치.

-> AI 개발자(Claude.md)에서 참조하는 핵심 문서.

### 2.2 specs/

한 앱(app-id) 또는 한 도메인(domain)의 **기능/요구사항/아키텍처 명세**.

이 폴더에는:
- dropshipping-core.md
- forum-core.md
- lms-core.md
- cosmetics-store.md
- sellerops-core.md

등이 저장됨.

### 2.3 design/

플랫폼 전체 구조 또는 여러 앱을 아우르는 아키텍처 문서.

예시:
- AppStore architecture
- Domain-driven design (DDD) 모델
- Core/Extension Boundary 설계
- Multi-tenant 구조 설계

### 2.4 plan/

Task, Work Order, Phase 문서.

특징:
- 완료되면 reports 폴더로 이동할 수 있음
- 진행 중인 작업은 plan에만 존재

### 2.5 dev/

개발 분석/조사/코드 예제/샘플 구현.

예시:
- dropshipping-core investigation report
- forum-core schema mapping
- hook prototype 예제

### 2.6 ops/

운영·배포·CI/CD·환경설정 문서.

예시:
- deploy-admin.md
- github-actions pipeline 문서
- environment variables spec

### 2.7 guides/

사용자/관리자 UI 매뉴얼, 튜토리얼.

예시:
- admin-dashboard user guide
- main-site 사용 설명
- 약사회 지부 담당자 매뉴얼

### 2.8 reference/

순수 기술 참고용 문서.

예시:
- API v1 spec
- TypeORM relation guide
- Next.js server-side rules
- AI agent integration spec

### 2.9 reports/

완료된 작업 보고서 또는 릴리즈 노트.

규칙:
- plan 문서 중 완료된 것은 reports로 이동
- 회고(retrospective) 문서도 reports로 이동

### 2.10 archive/

더 이상 사용되지 않는 문서.

#### 아카이브 기준:
- 120일 이상 미수정 + legacy 키워드 포함
- WordPress 기반 문서
- 이미 최신 구조로 대체된 스펙
- 완료 후 더 이상 참조되지 않는 작업 보고서(선택)

**주의:** 삭제하지 않고 archive/로 이동함.

---

## 3. 문서 파일 이동 규칙

문서 이동은 다음 기준을 따른다:

### 문서의 "주제" 기준으로 분류

예:
- forum-core architecture -> design/
- forum-core spec -> specs/
- forum-core refactoring plan -> plan/

### 문서의 "상태" 기준으로 분류

- 작업 중 -> plan/
- 완료 -> reports/
- 구버전 -> archive/

### 문서 이름 규칙

파일명은 다음 규칙을 따른다:

```
{app or domain}-{topic}-{version(optional)}.md
예: dropshipping-core-schema-v2.md
```

---

## 4. 중복 문서 처리 규칙

### 중복 발견 시 다음 세 가지 중 선택:

1. 내용이 동일 -> 하나만 남기고 나머지는 archive/
2. 내용 일부 중복 -> 하나로 병합
3. 역할이 다름 -> specs vs design 등으로 분리

병합 시:
- 새 문서 생성 후 기존 문서들은 archive로 이동
- 절대 삭제하지 않음

---

## 5. App 관련 문서 배치 규칙

App 관련 문서는 총 3단계로 분리한다:

### 5.1 App 사양 문서(specs/)

각 App의 기능·API·DB 구조 등을 정리한 문서.

예:
```
specs/dropshipping-core.md
specs/forum-core.md
specs/lms-core.md
```

### 5.2 App 개발 가이드라인(app-guidelines/)

앱 "종류에 따른 개발 규칙" 집합.

예:
```
app-guidelines/core-app-development.md
app-guidelines/extension-app-guideline.md
```

### 5.3 App 작업 문서(plan/)

개발 중인 Task, Work Order, Phase 문서.

---

## 6. Refactoring 문서 처리 기준

Refactoring 문서는 다음 기준을 따른다:

- 대규모 구조 변경 -> app-guidelines/refactoring-audit-guideline.md
- 특정 앱의 구조 변경 -> specs/APPNAME-refactor.md

완료되면 reports로 이동.

---

## 7. 문서 작성 가이드

- markdown 기반
- 챕터 제목은 1~3 depth
- 4 depth 이상 금지
- 용어는 glossary에 정리
- AI-friendly formatting 유지
- Core/Extension/Service 구분 명확히 서술

---

## 8. 문서 Change Management 규칙

- Core 변경 -> app-guidelines/ 문서 업데이트
- Extension 변경 -> 해당 specs 업데이트
- AppStore 변경 -> manifest-specification 업데이트

모든 변경은 CHANGELOG에 추가.

---

## 9. 문서 정리 프로세스 규정

문서 정리는 다음 단계로 진행:

1. 분석 (완료)
2. 기준 정립 (완료)
3. 재조직 (진행 예정)
4. 검증
5. CLAUDE.md 업데이트

---

## 결론

**이 문서 정리 기준(Document Organization Standard v1.0)은 O4O Platform 전체 문서의 "헌법"입니다.**

앞으로 모든 문서 정비는 이 기준을 따라 이루어지며:

- Claude Code
- 개발팀
- 문서 업데이트
- AppStore 변경

모두가 이 기준을 기반으로 일관성을 유지하게 됩니다.

---

*최종 업데이트: 2025-12-09*
