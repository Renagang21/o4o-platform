# O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1

> 이 문서는 운영자 매장 HUB 콘텐츠 게시 기준 문서다.
> RichTextEditor 기반 항목별 게시 표준이며, Source Ingestion은 후속 문서에서 정의한다.

## 문서 목적

운영자가 매장 HUB에 게시하는 콘텐츠의 유형, 게시 방식, 매장 측 대응 구조를 정의한다.

## §1. 매장 HUB의 역할

매장 HUB는 **매장 경영자가 내 매장 실행 자산을 만들 수 있도록 운영자가 구성한 자료 공간**이다.

- 운영자: HUB에 콘텐츠 게시·분류·진열
- 매장 경영자: HUB에서 필요한 자료를 복사·활용 → 내 매장 실행

## §2. HUB 게시 항목 (6종)

| 항목 | 코드 | 설명 |
|------|:----:|------|
| 상품 상세 | `product` | 제품 설명, 성분, 사용법 등 |
| POP | `pop` | 매장 내 포스터·안내물 제작용 |
| QR 코드 | `qr` | 매장 QR 코드 링크·자료 |
| 블로그 | `blog` | 전문 정보성 콘텐츠 |
| 사이니지 | `signage` | 디지털 디스플레이 콘텐츠 |
| 고객 안내문 | `guide` | 매장 내 고객 안내 문구 |

> 설문(Survey)은 V1 범위 외. 후속 문서에서 정의.

## §3. 게시 원칙

1. **항목별 독립 게시**: 각 항목 유형은 독립 편집기로 게시한다.
2. **RichTextEditor 기반**: 텍스트·이미지·링크 중심 편집. 복잡한 코드 삽입 최소화.
3. **가시성 제어**: 게시 → 가시성 설정(serviceKey/organizationId 기반) → 매장 측 노출.
4. **Source Ingestion 보류**: 공급자 원천 자료의 직접 자동 수집·변환은 별도 WO에서 정의.

## §4. 게시 흐름

```
운영자
 ├─ 항목 유형 선택 (상품/POP/QR/블로그/사이니지/안내문)
 ├─ RichTextEditor로 콘텐츠 작성
 ├─ 가시성 설정 (serviceKey 또는 organizationId 기반)
 └─ HUB 게시
      ↓
매장 경영자
 ├─ HUB에서 항목 열람
 ├─ 내 매장 실행 자산으로 복사
 └─ 내 매장에서 활용
```

## §5. 매장 측 대응 구조

매장 HUB 항목과 내 매장 메뉴는 **같은 축으로 정렬**된다.

| HUB 항목 | 내 매장 메뉴 |
|----------|------------|
| 상품 상세 | 내 매장 상품 |
| POP | 내 매장 POP |
| QR 코드 | 내 매장 QR |
| 블로그 | 내 매장 블로그 |
| 사이니지 | 내 매장 사이니지 |
| 고객 안내문 | 내 매장 고객 안내 |

> 상세: `docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md`

## §6. 금지 사항

- 공급자가 HUB에 직접 콘텐츠를 제작·게시하는 구조 금지
- HUB 항목이 매장 메뉴 축과 달라지는 구조 금지 (설문 제외)
- 운영자가 매장 경영자 대신 내 매장을 직접 제어하는 구조 금지
- Source Ingestion(원천 자료 자동 변환)을 이 문서 범위에서 구현 금지 (별도 WO 필요)

## 후속 문서

| 문서 | 관계 |
|------|------|
| `O4O-3-ROLE-FLOW-BASELINE-V1.md` | 운영자 HUB 게시 책임 근거 |
| `O4O-STORE-MENU-CANONICAL-TREE-V1.md` | 매장 HUB ↔ 내 매장 메뉴 축 정렬 기준 |
| `O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md` | 운영자 5 Workspace UX 기준 |

---
*작성 기준: O4O Operator HUB 콘텐츠 게시 표준 (2026-06)*
*상태: Active Baseline*
