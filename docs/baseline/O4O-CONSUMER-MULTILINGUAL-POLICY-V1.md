# O4O-CONSUMER-MULTILINGUAL-POLICY-V1

> **소비자에게 보이는 외국어는 한국어 원본을 AI 로 번역해 보여 주고, 한국어를 함께 보인다.** 언어별 콘텐츠를 따로 만들지 않는다.
> **상태**: Active · **날짜**: 2026-11-13(확정 2026-11-13 통합 담당) · **성격**: 정책 결정 기록. 구현은 별도 WO.
> **근거**: 2026-11-13 사용자 결정(아래 §1). 관련 실행 기록: [`WO-O4O-OTC-TRANSLATION-QUALITY-SAMPLE-V1`](../work-orders/WO-O4O-OTC-TRANSLATION-QUALITY-SAMPLE-V1.md)(코드 branch `claude/intelligent-cray-o2p4u3-multilingual`).

---

## 0. 핵심 결정 (한 줄)

```text
원본 = 한국어 1개 → 소비자가 언어를 고르면 AI 번역 → 외국어 화면에 한국어 병기(기본 켜짐)
```

## 1. 배경

- 소비자 대상 콘텐츠는 AI 번역 서비스로 보여 주기로 했다. 그래서 언어별로 따로 쓰는 「다국어 제품 콘텐츠」는 필요하지 않다.
- 지금 코드에는 시기가 다른 세 경로가 함께 남아 있다(2026-11-13 조사):

  | 경로 | 저장 | 이 정책에서 |
  |---|---|---|
  | 다국어 제품 콘텐츠 — 언어별 페이지를 사람이 작성 · QR 공개 링크 | `store_/operator_multilingual_product_content_*` | **새로 만들지 않는다.** 이미 발급된 공개 링크는 계속 열린다 |
  | OTC 영문 설명 — 번역 품질 때문에 미리 번역해 저장 | `shared_product_descriptions`(`language='en'`) | 표본 비교(§4) 결과로 정한다. 그때까지 새로 만들거나 늘리지 않는다 |
  | 콘텐츠 안 AI 번역값 — 소비자 · 태블릿 화면이 읽음 | 콘텐츠 `content_json.translations` | 이 정책의 방향(한국어 원본 + AI 번역)과 같다 |

- 상담용 실시간 번역(`neture-pharmacy` 상담)은 대화 번역이라 이 정책의 대상이 아니다.

## 2. 규칙

1. **원본은 한국어 하나다.** 소비자 대상 콘텐츠(제품 설명 · 매장 안내 · QR 랜딩 · 태블릿 화면)는 한국어로만 작성 · 수정한다.
2. **번역은 AI 가 한다.** 소비자가 언어를 고르면 운영 번역 경로(`CONTENT_TRANSLATION` 정책)로 번역한다.
3. **번역은 다시 쓴다.** 같은 원본 · 같은 언어는 한 번 번역해 저장해 두고 재사용한다. 원본이 바뀌면 그 번역은 버리고 다시 번역한다. 번역본을 사람이 따로 고쳐 관리하지 않는다.
4. **외국어 화면에는 한국어를 병기한다.**
   - 기본값은 켜짐이고, 매장(약사)이 끌 수 있다.
   - 매장 안에서 약사가 소비자와 같은 화면을 보며 설명하기 위해서다.
   - 이 병기가 「AI 번역」 표시를 겸한다.
5. **번역은 원문의 의미를 바꾸지 않는다.** 숫자(용량 · 횟수 · 연령) · 금지 표현 · 투여 경로가 원문과 다르면 오역이다. 번역 프롬프트와 표본 검사가 이 기준을 쓴다.

## 3. 바뀌는 것

- QR 자산 선택 창에서 「다국어 제품 콘텐츠」 탭을 뺀다(1단계, 코드 branch 위 링크).
- 이미 인쇄 · 배포된 다국어 QR 은 그대로 열린다. 다국어 제품 콘텐츠의 작성 화면 · 배지 · 운영자 HUB 정리와 저장 표 처리는 이 문서 확정 뒤 별도 WO 로 한다(운영 데이터 확인 필요).

## 4. OTC

- OTC 내용(용법 · 용량 · 금기)은 허가 정보(식약처 · FDA · WHO)라 원문이 같다. 확인할 것은 번역 품질뿐이다.
- 쓰이는 곳은 매장 안이고, 매장에는 약사가 있다.
- 표본 30건으로 운영 번역 경로를 기존 영문과 비교한다([`WO-O4O-OTC-TRANSLATION-QUALITY-SAMPLE-V1`](../work-orders/WO-O4O-OTC-TRANSLATION-QUALITY-SAMPLE-V1.md)).
  - **실제 오역 0건:** OTC 도 §2 로 통일한다. 기존 영문은 비교 기준으로만 남긴다.
  - **오역 있음:** 그 유형을 번역 프롬프트에 반영할지, 기존 영문을 검수 번역으로 우선할지 정한다.

## 5. 영향을 받는 기준 문서 (2026-11-13 이 정책을 가리키도록 표기)

| 문서 | 내용 |
|---|---|
| [`O4O-STORE-MENU-CANONICAL-TREE-V1`](O4O-STORE-MENU-CANONICAL-TREE-V1.md) | 「다국어」를 상품 화면의 작업으로 둔 행(§1 · 상품 상세정보 행) |
| [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT`](O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT.md) | 「고급 다국어 운영」을 구독 사업 기능으로 둔 문장 |
| [`O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1`](O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1.md) | 「다국어」를 QR 생성 기능으로 둔 대상 목록 |
| [`OTC-DESCRIPTION-DESIGN-GUIDE`](../guides/OTC-DESCRIPTION-DESIGN-GUIDE.md) · [`OTC-EN-TRANSLATION-GUIDE`](../guides/OTC-EN-TRANSLATION-GUIDE.md) | 영문 설명 제작 기준 · 다국어 공개 랜딩(D) — §4 판정 뒤 |

## 6. 문서 정합

2026-11-13 확정과 함께 `CANONICAL-INDEX` §6 에 등재했다. §5 의 문서에는 이 정책을 가리키는 표기를 넣었다(본문 판정은 이 문서가 우선한다).
