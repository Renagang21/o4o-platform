# O4O Platform Services

> 서비스 및 Core APP 정의 문서

---

## 서비스 독립성 원칙

> **각 서비스는 독립적이며, 다른 서비스에 종속되지 않는다.**

| 공유 가능 | 공유 불가 |
|-----------|----------|
| Core Layer (Auth, CMS, AI 등) | 서비스 전용 데이터 |
| Shared Infrastructure (GCP) | 서비스 전용 비즈니스 로직 |
| 공통 타입/계약 | 서비스 전용 UI 컴포넌트 |

---

## 디렉토리 구조

```
services/
├── _core/apps/          Core APP 정의 (8개)
│   ├── cms-core/
│   ├── digital-signage-core/
│   ├── dropshipping-core/
│   ├── ecommerce-core/
│   ├── forum-core/
│   ├── lms-core/
│   ├── organization-core/
│   └── pharmaceutical-core/
├── cosmetics/           Cosmetics Retail 서비스 정의
└── README.md
```

---

## 새 서비스 추가 시 필수 문서

1. **service-definition.md**: 서비스 정의, 대상, 구성 앱
2. 해당 Core APP의 `app-definition.md` 업데이트
3. CLAUDE.md 반영
