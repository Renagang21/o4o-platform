# Business API Template

> **Version**: 1.0
> **Created**: 2025-12-29

이 디렉터리는 새로운 Business API를 생성할 때 사용하는 템플릿입니다.

---

## 사용 방법

### 1. 템플릿 복사

```bash
# 새 비즈니스 서비스 디렉터리 생성
cp -r docs/templates/business-api-template docs/services/{business}/
```

### 2. 플레이스홀더 치환

모든 파일에서 다음을 치환하세요:

| 플레이스홀더 | 치환 대상 | 예시 |
|--------------|-----------|------|
| `{business}` | 비즈니스 이름 (소문자) | `cosmetics`, `yaksa` |
| `{BUSINESS}` | 비즈니스 이름 (대문자) | `COSMETICS`, `YAKSA` |
| `{Business}` | 비즈니스 이름 (PascalCase) | `Cosmetics`, `Yaksa` |
| `{port}` | API 서버 포트 | `3003`, `3004` |

```bash
# 자동 치환 스크립트
cd docs/services/{business}/
sed -i 's/{business}/cosmetics/g' *.md *.yaml
sed -i 's/{BUSINESS}/COSMETICS/g' *.md *.yaml
sed -i 's/{Business}/Cosmetics/g' *.md *.yaml
sed -i 's/{port}/3003/g' *.md *.yaml
```

### 3. OpenAPI 엔드포인트 정의

`openapi.template.yaml`을 기반으로 실제 엔드포인트를 정의하세요.

### 4. 규칙 확인

생성된 문서가 다음 규칙을 준수하는지 확인:

- [ ] 모든 테이블 prefix: `{business}_`
- [ ] Scope: `{business}:read/write/admin`
- [ ] 금지 API 없음 (users, auth, settings)
- [ ] Core DB 쓰기 코드 없음

---

## 템플릿 파일 목록

| 파일 | 설명 |
|------|------|
| `openapi.template.yaml` | OpenAPI 스펙 템플릿 |
| `api-rules.template.md` | API 규칙 문서 템플릿 |
| `web-integration-rules.template.md` | Web 연동 규칙 템플릿 |
| `deployment-boundary.template.md` | 배포 경계 문서 템플릿 |
| `service-flow.template.md` | 서비스 흐름 문서 템플릿 |

---

## 체크리스트

새 Business API 생성 시 확인사항:

### 문서

- [ ] `api-rules.md` 생성 완료
- [ ] `openapi.yaml` 정의 완료
- [ ] `web-integration-rules.md` 생성 완료
- [ ] `deployment-boundary.md` 생성 완료
- [ ] `service-flow.md` 생성 완료

### 코드 구조

- [ ] `apps/{business}-api/` 디렉터리 생성
- [ ] `apps/{business}-web/` 디렉터리 생성 (필요 시)
- [ ] DB 마이그레이션 스크립트 준비

### CLAUDE.md 반영

- [ ] §15 Business API Template Rules 적용 확인
- [ ] 필요 시 도메인 전용 섹션 추가 (§16+)

---

## 참조

- docs/architecture/business-api-template.md
- CLAUDE.md §15 Business API Template Rules
- docs/services/cosmetics/ (구현 예시)
