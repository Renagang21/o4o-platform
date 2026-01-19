# O4O Platform Services

> 이 디렉토리는 O4O Platform의 **독립 서비스 문서**를 관리합니다.

---

## 서비스 목록

| 서비스 | 도메인 | 대상 | 상태 |
|--------|--------|------|------|
| **SiteGuide** | siteguide.co.kr | 모든 사업자 | Foundation |
| Neture | neture.co.kr | 약국/의료기관 | Active |
| GlycoPharm | glycopharm.com | 당뇨 관련 | Active |
| K-Cosmetics | k-cosmetics.co.kr | 화장품 | Active |

---

## 서비스 독립성 원칙

### 핵심 원칙

> **각 서비스는 독립적이며, 다른 서비스에 종속되지 않습니다.**

### 공유 가능한 것

- Core Layer (Auth Core, CMS Core, AI Core, etc.)
- Shared Infrastructure (GCP, Cloudflare)
- 공통 타입/계약

### 공유 불가능한 것

- 서비스 전용 데이터
- 서비스 전용 비즈니스 로직
- 서비스 전용 UI 컴포넌트

---

## 디렉토리 구조

```
docs/services/
├── README.md           # 이 파일
├── siteguide/          # SiteGuide 서비스 문서
│   ├── SITEGUIDE-SERVICE-OVERVIEW.md
│   ├── SITEGUIDE-DOMAIN-STRATEGY.md
│   ├── SITEGUIDE-ARCHITECTURE-NOTE.md
│   └── WO-SITEGUIDE-BUSINESS-ONBOARDING-V1.md
└── [future-service]/   # 향후 추가될 서비스 문서
```

---

## 새 서비스 추가 시 필수 문서

새로운 독립 서비스를 추가할 때는 다음 문서를 작성해야 합니다:

1. **SERVICE-OVERVIEW.md**: 서비스 정의, 대상, 가치
2. **DOMAIN-STRATEGY.md**: 도메인 전략, 경계
3. **ARCHITECTURE-NOTE.md**: 플랫폼 내 위치, 의존성 규칙

---

*Last Updated: 2026-01-19*
