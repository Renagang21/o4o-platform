# SiteGuide Domain Strategy

> Version: 1.0
> Date: 2026-01-19
> Status: Foundation (Pre-Development)
> Reference: SITEGUIDE-SERVICE-OVERVIEW

---

## 1. 문서 목적

이 문서는 SiteGuide 서비스의 **도메인 전략과 서비스 경계**를 정의합니다.

---

## 2. 공식 도메인

### 2.1 메인 도메인

| 항목 | 값 |
|------|-----|
| **공식 도메인** | `siteguide.co.kr` |
| **상태** | 확정 |

### 2.2 도메인 사용 목적

| 용도 | URL 패턴 | 설명 |
|------|----------|------|
| 랜딩/마케팅 | `siteguide.co.kr` | 서비스 소개 |
| 사업자 대시보드 | `app.siteguide.co.kr` (예정) | 관리 콘솔 |
| 위젯 CDN | `cdn.siteguide.co.kr` (예정) | 위젯 스크립트 |
| API | `api.siteguide.co.kr` (예정) | 백엔드 API |

---

## 3. 서비스 경계 선언

### 3.1 SiteGuide는 외부 서비스

> **SiteGuide는 Neture 내부 기능이 아닌, 외부 사업자 대상 독립 서비스입니다.**

### 3.2 경계 명시

```
┌─────────────────────────────────────────────────────────────────────┐
│                         O4O Platform                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌───────────────────────┐      ┌───────────────────────┐          │
│   │       Neture          │      │      SiteGuide        │          │
│   │    neture.co.kr       │      │   siteguide.co.kr     │          │
│   ├───────────────────────┤      ├───────────────────────┤          │
│   │ 대상: 약국/의료기관    │      │ 대상: 모든 사업자      │          │
│   │ 범위: 내부 전용        │      │ 범위: 외부 공개        │          │
│   │ 종속: Neture 생태계    │      │ 종속: 없음 (독립)      │          │
│   └───────────────────────┘      └───────────────────────┘          │
│              │                              │                        │
│              └──────────────┬───────────────┘                        │
│                             │                                        │
│                    Shared Infrastructure                             │
│                    (GCP, Auth, AI Core)                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Neture와의 차이점

| 항목 | Neture | SiteGuide |
|------|--------|-----------|
| **도메인** | neture.co.kr | siteguide.co.kr |
| **대상 사용자** | 약국, 의료기관 | 모든 사업자 |
| **서비스 성격** | 약국 전용 플랫폼 | 범용 AI 안내 서비스 |
| **브랜드 연결** | O4O/Neture 브랜드 | SiteGuide 독립 브랜드 |
| **기능 범위** | Signage, LMS, CMS 등 | AI 사이트 안내 전용 |

---

## 4. 도메인 전제 조건

### 4.1 문서/주석에 명시해야 할 사항

모든 SiteGuide 관련 코드와 문서에는 다음을 명시합니다:

1. **SiteGuide는 외부 사업자용 서비스입니다**
2. **Neture 전용 기능이 아닙니다**
3. **독립 도메인(siteguide.co.kr)으로 운영됩니다**

### 4.2 금지 사항

| 금지 | 이유 |
|------|------|
| `neture.co.kr/siteguide` 경로 사용 | Neture 하위 서비스처럼 보임 |
| SiteGuide를 "Neture의 기능"으로 설명 | 종속 관계 오해 유발 |
| Neture 전용 데이터와 혼합 | 서비스 경계 훼손 |

---

## 5. 도메인 이전/확장 가능성

### 5.1 현재 상태

- 코드베이스: O4O Platform monorepo 내
- 인프라: 공유 (GCP Cloud Run)
- 인증: Auth Core 활용 가능

### 5.2 분리 가능 설계

SiteGuide는 **언제든 독립 서비스로 분리 가능한 구조**를 유지합니다.

| 분리 시나리오 | 영향 |
|--------------|------|
| 별도 레포지토리 | 코드 이동만 필요 |
| 별도 인프라 | 배포 설정 변경만 필요 |
| 별도 인증 | Auth 서버 분리 가능 |

### 5.3 분리 용이성 보장 원칙

```
현재 구조:
┌────────────────────────────────────────┐
│           O4O Platform Monorepo        │
│  ┌────────────┐  ┌────────────────┐   │
│  │  Neture    │  │  SiteGuide     │   │
│  │  packages  │  │  packages      │   │
│  └────────────┘  └────────────────┘   │
└────────────────────────────────────────┘

분리 가능 구조:
┌─────────────────┐   ┌─────────────────┐
│   O4O Platform  │   │   SiteGuide     │
│   Monorepo      │   │   Repository    │
│  ┌───────────┐  │   │  ┌───────────┐  │
│  │  Neture   │  │   │  │ SiteGuide │  │
│  └───────────┘  │   │  │  Service  │  │
│                 │   │  └───────────┘  │
└─────────────────┘   └─────────────────┘
```

---

## 6. 서브도메인 전략 (예정)

### 6.1 예상 서브도메인

| 서브도메인 | 용도 | 상태 |
|-----------|------|------|
| `siteguide.co.kr` | 메인 (랜딩) | 계획 |
| `app.siteguide.co.kr` | 사업자 대시보드 | 계획 |
| `api.siteguide.co.kr` | API 서버 | 계획 |
| `cdn.siteguide.co.kr` | 위젯 CDN | 계획 |
| `docs.siteguide.co.kr` | 문서 사이트 | 계획 |

### 6.2 도메인 소유/관리

| 항목 | 값 |
|------|-----|
| 소유 | O4O/Neture 법인 |
| DNS 관리 | Cloudflare (예상) |
| SSL | Let's Encrypt / Cloudflare |

---

## 7. 크로스 도메인 고려사항

### 7.1 위젯 삽입 시

SiteGuide 위젯은 **외부 사업자 사이트에 삽입**됩니다.

| 고려사항 | 대응 |
|----------|------|
| CORS | 허용 도메인 관리 |
| CSP | 사업자 사이트 CSP 호환 |
| 쿠키 | SameSite 정책 준수 |
| 보안 | XSS/Clickjacking 방어 |

### 7.2 인증 연동

| 시나리오 | 방식 |
|----------|------|
| 사업자 로그인 | SiteGuide 자체 인증 또는 Auth Core 연동 |
| 방문자 | 인증 불필요 (익명 사용) |

---

## 8. 브랜딩 분리

### 8.1 SiteGuide 독립 브랜드

SiteGuide는 **독립 브랜드**로 운영됩니다.

| 항목 | Neture | SiteGuide |
|------|--------|-----------|
| 로고 | Neture 로고 | SiteGuide 로고 (별도) |
| 색상 | Neture 브랜드 컬러 | SiteGuide 브랜드 컬러 |
| 메시지 | 약국 전문 | 모든 사업자 |

### 8.2 O4O 연결

사업자 신뢰를 위해 필요 시:
> "SiteGuide is powered by O4O Platform"

---

## 9. 관련 문서

- [SiteGuide Service Overview](./SITEGUIDE-SERVICE-OVERVIEW.md)
- [SiteGuide Architecture Note](./SITEGUIDE-ARCHITECTURE-NOTE.md)

---

## 10. 한 줄 요약

> **siteguide.co.kr은 Neture 종속이 아닌, 모든 사업자를 위한 독립 도메인입니다.**

---

*Created: 2026-01-19*
*Status: Foundation Document*
