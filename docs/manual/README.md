# O4O Platform Manual

> 서비스별 사용자 매뉴얼 (스크린샷 포함)

## 구조

```
manual/
  overview/           전체 플랫폼 개요
  kpa-society/        KPA Society (커뮤니티 + 분회)
    operator/         운영자 매뉴얼
    admin/            관리자 매뉴얼
    pharmacist/       약사 매뉴얼
    assets/           스크린샷
  glycopharm/         GlycoPharm
    operator/         운영자 매뉴얼
    assets/           스크린샷
  glucoseview/        GlucoseView
    operator/         운영자 매뉴얼
    assets/           스크린샷
  k-cosmetics/        K-Cosmetics
    operator/         운영자 매뉴얼
    assets/           스크린샷
  neture/             Neture
    operator/         운영자 매뉴얼
    assets/           스크린샷
```

## 생성 방식

- Playwright MCP를 통한 자동 스크린샷 캡처
- `manual-scenarios.json` 시나리오 기반 실행
- Markdown + 이미지 조합

## 역할별 분류

| 역할 | 진입점 | 대상 서비스 |
|------|--------|------------|
| Operator | `/operator` | 전체 |
| Admin | `/admin` | KPA, Store |
| Pharmacist | `/pharmacy` | KPA |
| Owner | `/pharmacy/hub` | KPA |
