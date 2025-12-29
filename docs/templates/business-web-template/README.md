# Business Web Template

> **Version**: 1.0
> **Status**: Mandatory Template
> **Created**: 2025-12-29

이 디렉터리는 새로운 Business Web 생성을 위한 **표준 템플릿**입니다.

---

## 1. 템플릿 구성

| 파일 | 용도 |
|------|------|
| `web-rules.template.md` | Web 역할 및 금지 사항 |
| `routing-rules.template.md` | 라우팅 설계 규칙 |
| `api-contract-usage.template.md` | API 연동 규칙 |
| `deployment-boundary.template.md` | 배포 경계 정의 |
| `service-flow.template.md` | 서비스 흐름도 |

---

## 2. 사용 방법

### 2.1 복사

```bash
# 1. 템플릿 디렉터리 복사
cp -r docs/templates/business-web-template docs/services/{business}/web/

# 2. 앱 디렉터리 생성
mkdir -p apps/{business}-web
```

### 2.2 플레이스홀더 치환

```bash
cd docs/services/{business}/web/

# {business} → 실제 서비스명 (예: cosmetics, yaksa)
sed -i 's/{business}/cosmetics/g' *.md
sed -i 's/{BUSINESS}/COSMETICS/g' *.md
sed -i 's/{Business}/Cosmetics/g' *.md

# {date} → 생성일
sed -i 's/{date}/2025-12-29/g' *.md

# {port} → 개발 포트
sed -i 's/{port}/3002/g' *.md
```

### 2.3 플레이스홀더 목록

| 플레이스홀더 | 설명 | 예시 |
|--------------|------|------|
| `{business}` | 서비스 소문자명 | cosmetics, yaksa |
| `{BUSINESS}` | 서비스 대문자명 | COSMETICS, YAKSA |
| `{Business}` | 서비스 PascalCase | Cosmetics, Yaksa |
| `{date}` | 문서 생성일 | 2025-12-29 |
| `{port}` | 개발 서버 포트 | 3002, 3003 |

---

## 3. 생성 후 체크리스트

### 3.1 필수 확인 사항

- [ ] 모든 플레이스홀더 치환 완료
- [ ] `apps/{business}-web/` 디렉터리 생성
- [ ] 환경변수 설정 (.env.example)
- [ ] API Base URL 환경변수 확인

### 3.2 금지 확인 사항

- [ ] 비즈니스 로직 구현 없음
- [ ] DB/ORM 직접 접근 없음
- [ ] JWT 발급/검증 로직 없음
- [ ] 하드코딩 URL 없음
- [ ] `/api/*` 라우트 없음

---

## 4. 디렉터리 구조 예시

```
apps/{business}-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── {entities}/
│   │   │   ├── page.tsx        # 목록
│   │   │   └── [id]/
│   │   │       └── page.tsx    # 상세
│   │   └── admin/
│   │       └── {entities}/
│   │           ├── page.tsx    # 관리 목록
│   │           ├── new/
│   │           │   └── page.tsx
│   │           └── [id]/
│   │               └── page.tsx
│   ├── components/
│   │   ├── ui/                 # 공통 UI
│   │   └── {entities}/         # 엔티티별 컴포넌트
│   ├── services/
│   │   └── {business}-api.ts   # API 클라이언트
│   ├── hooks/
│   │   └── use{Entity}.ts      # React Query 훅
│   └── lib/
│       └── auth.ts             # 인증 유틸 (저장/전달만)
├── public/
├── .env.example
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 5. 환경변수 템플릿

```bash
# .env.example

# API URLs (필수)
{BUSINESS}_API_URL=https://{business}-api.neture.co.kr
CORE_API_URL=https://api.neture.co.kr

# 클라이언트 노출용 (Next.js)
NEXT_PUBLIC_{BUSINESS}_API_URL=https://{business}-api.neture.co.kr
NEXT_PUBLIC_CORE_API_URL=https://api.neture.co.kr

# 개발 환경
NODE_ENV=development
```

---

## 6. 참조 문서

- [Business Web Template Rules](../../architecture/business-web-template.md)
- [Business API Template Rules](../../architecture/business-api-template.md)
- [Multi-Business Operations](../../architecture/multi-business-operations.md)
- CLAUDE.md §16 Business Web Template Rules

---

*이 템플릿은 모든 Business Web의 시작점입니다. 템플릿 없이 임의 생성은 금지됩니다.*
