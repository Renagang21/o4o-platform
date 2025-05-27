# 📁 O4O Platform 개발 폴더 기준 구조

> 이 문서는 ChatGPT, Cursor IDE, GitHub Actions 등 자동화 도구가 사용하는 **표준 코드 디렉터리 기준**입니다.  
> 모든 개발 코드는 반드시 아래 구조에 따라 생성/편집되어야 하며, 이외 위치는 **잘못된 작업**으로 간주됩니다.

---

## 🗂️ 루트 기준: Coding/

```
Coding/
├── o4o-platform/                  # O4O 프로젝트 메인
│   ├── docs/                      # 전체 문서 폴더
│   ├── o4o-api-server/            # Medusa 기반 백엔드
│   ├── o4o-web-server/            # React 기반 프론트엔드
│   └── .env, docker, readme 등
├── ai-services/                  # AI 기반 백엔드
├── common-core/                  # 공통 유틸리티 및 공용 모듈
├── dev-reference/                # 재사용 가능한 문서와 예제
├── rpa/                          # 자동화 스크립트 관련 코드
```

---

## 📌 개발 시 주의사항

- `o4o-web-server/` 안에만 React 코드 생성
- `o4o-api-server/` 외에는 Medusa 관련 코드 생성 금지
- `docs/`는 문서 전용 공간으로 코드 생성 금지
- Cursor 사용 시 `.cursorrules` 설정으로 작업 폴더 고정 권장

---

## ✅ 참조 예시

- ✅ `o4o-web-server/pages/Home.tsx` → 올바른 위치
- ❌ `docs/api/Home.tsx` → 잘못된 위치 (문서 폴더에 코드 생성 금지)
