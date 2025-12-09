# CLAUDE.md 업데이트 계획

> Document Organization Standard v1.0 기반
> 생성일: 2025-12-09

---

## 1. 현재 CLAUDE.md 참조 경로

현재 CLAUDE.md에서 참조하는 문서 경로:

```
docs/reference/guidelines/SCHEMA_DRIFT_PREVENTION_GUIDE.md
```

---

## 2. 문서 재조직 후 변경될 경로

### 2.1 핵심 참조 문서 경로 변경

| 현재 경로 | 새 경로 |
|-----------|---------|
| docs/reference/guidelines/SCHEMA_DRIFT_PREVENTION_GUIDE.md | docs/app-guidelines/schema-drift-prevention.md |
| (없음) | docs/app-guidelines/core-app-development.md |
| (없음) | docs/app-guidelines/extension-app-guideline.md |
| (없음) | docs/app-guidelines/manifest-specification.md |

### 2.2 CLAUDE.md 수정 섹션

```markdown
### 8. Schema Policy Compliance (필수)

**모든 엔티티/DB 관련 변경은 아래 문서를 반드시 준수해야 함:**
- **`docs/app-guidelines/schema-drift-prevention.md`**
```

---

## 3. CLAUDE.md 추가 섹션 제안

### 3.1 문서 참조 섹션 추가

```markdown
---

## 참고 문서

### 핵심 개발 가이드라인
- Schema Drift 방지: `docs/app-guidelines/schema-drift-prevention.md`
- Core App 개발: `docs/app-guidelines/core-app-development.md`
- Extension App 개발: `docs/app-guidelines/extension-app-guideline.md`
- CPT/ACF 개발: `docs/app-guidelines/cpt-acf-development.md`

### 문서 구조
- 문서 정리 기준: `docs/_standards/DOCUMENT_ORGANIZATION_STANDARD_v1.0.md`

### 주요 스펙
- Dropshipping: `docs/specs/dropshipping/`
- Forum: `docs/specs/forum/`
- CMS: `docs/specs/cms/`
- Auth: `docs/specs/auth/`
```

---

## 4. 구체적 수정 내용

### 4.1 섹션 8 수정

**현재:**
```markdown
### 8. Schema Policy Compliance (필수)

**모든 엔티티/DB 관련 변경은 아래 문서를 반드시 준수해야 함:**
- **`docs/reference/guidelines/SCHEMA_DRIFT_PREVENTION_GUIDE.md`**
```

**수정 후:**
```markdown
### 8. Schema Policy Compliance (필수)

**모든 엔티티/DB 관련 변경은 아래 문서를 반드시 준수해야 함:**
- **`docs/app-guidelines/schema-drift-prevention.md`**
```

### 4.2 참고 자료 섹션 확장

**현재:**
```markdown
### 참고 자료
- 블록 개발 가이드: `BLOCKS_DEVELOPMENT.md`
- 배포 가이드: `DEPLOYMENT.md`
```

**수정 후:**
```markdown
### 참고 자료

#### 개발 가이드라인
- 블록 개발 가이드: `BLOCKS_DEVELOPMENT.md`
- 배포 가이드: `DEPLOYMENT.md`
- **문서 정리 기준**: `docs/_standards/DOCUMENT_ORGANIZATION_STANDARD_v1.0.md`

#### App 개발 가이드라인 (docs/app-guidelines/)
- Schema Drift 방지: `schema-drift-prevention.md`
- Core App 개발: `core-app-development.md`
- Extension App 개발: `extension-app-guideline.md`
- CPT/ACF 개발: `cpt-acf-development.md`
- AppStore 빌드: `appstore-build.md`

#### 주요 스펙 문서 (docs/specs/)
| 도메인 | 경로 |
|--------|------|
| Dropshipping | `docs/specs/dropshipping/` |
| Forum | `docs/specs/forum/` |
| Cosmetics | `docs/specs/cosmetics/` |
| CMS | `docs/specs/cms/` |
| Auth | `docs/specs/auth/` |
| Organization | `docs/specs/organization/` |
```

---

## 5. 문서 디렉토리 구조 섹션 추가 (선택)

CLAUDE.md에 전체 문서 구조 개요 추가:

```markdown
---

## 문서 구조

```
docs/
├── _standards/      # 문서 정리 기준
├── app-guidelines/  # 핵심 개발 가이드라인
├── specs/           # 앱별 스펙 문서
├── design/          # 아키텍처/설계 문서
├── plan/            # 작업 계획/워크오더
├── dev/             # 개발 조사/분석
├── ops/             # 운영/배포
├── guides/          # 사용자 매뉴얼
├── reference/       # 기술 참고
├── reports/         # 완료 보고서
└── archive/         # 구버전/아카이브
```

**문서 작업 시 규칙:**
- 새 문서 생성 전 `docs/_standards/DOCUMENT_ORGANIZATION_STANDARD_v1.0.md` 확인
- App 관련 스펙은 `docs/specs/{app-id}/`에 배치
- 작업 계획은 `docs/plan/active/`에 배치
- 완료된 작업은 `docs/reports/`로 이동
```

---

## 6. 실행 타이밍

CLAUDE.md 업데이트는 **문서 재조직 완료 후** 실행:

1. ✅ 1단계: 사전 조사 (완료)
2. ✅ 2단계: 기준 정립 (완료)
3. ⏳ 3단계: 재조직 실행 (대기)
4. ⏳ 4단계: CLAUDE.md 업데이트 (대기)
5. ⏳ 5단계: 검증

---

## 7. 검증 체크리스트

업데이트 후 확인 사항:

- [ ] Schema Drift 가이드 경로 유효성
- [ ] app-guidelines/ 디렉토리 존재 확인
- [ ] specs/ 디렉토리 존재 확인
- [ ] 모든 참조 경로 접근 가능
- [ ] Claude Code에서 참조 테스트

---

*최종 업데이트: 2025-12-09*
