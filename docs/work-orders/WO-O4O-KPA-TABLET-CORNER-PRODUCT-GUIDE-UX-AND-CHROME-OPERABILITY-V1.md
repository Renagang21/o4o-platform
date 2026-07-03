# WO-O4O-KPA-TABLET-CORNER-PRODUCT-GUIDE-UX-AND-CHROME-OPERABILITY-V1

> Claude Code 작업 요청서
>
> 작성일: 2026-07-03
>
> 선행 작업: `WO-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1`
>
> 관련 조사: `docs/investigations/IR-O4O-STORE-CORNER-TABLET-IMPLEMENTATION-AUDIT-V1.md`

---

## 1. 작업 제목

**O4O KPA 태블릿 공용 안내 UX 개선: 코너/상품 설명 구조 + 크롬 태블릿 운영성**

---

## 2. 배경

선행 WO에서 태블릿 V1은 기본 상태로 다음 원칙에 맞게 정리되었다.

```text
- 공용 안내 화면
- 개인정보 입력 없음
- 상담 요청 기본 OFF
- 상담은 명시적 opt-in에서만 활성
- 상품 상세의 최종 행동은 "직원에게 이 화면 보여주기"
```

이제 다음 단계는 태블릿을 실제 소규모 전문매장에서 더 잘 쓰게 만드는 것이다.

이번 작업의 핵심은 다음 두 가지다.

```text
1. 코너/상품 설명 구조를 고객이 이해하기 쉽게 정리한다.
2. 크롬 태블릿 브라우저 운영에 필요한 안내와 검증 흐름을 보강한다.
```

태블릿은 주문 키오스크가 아니라 **공용 매대 안내 화면**이다. 고객이 매대 앞에서 상품을 짧게 이해하고, 필요하면 직원에게 화면을 보여주며 상담으로 이어지게 해야 한다.

---

## 3. 작업 범위

### 포함

```text
- 기존 show_consultation_button=true row 존재 여부 read-only 조사
- KPA 태블릿 공개 화면의 목록/상세 문구 정리
- 상품 상세 정보 구조 개선: 핵심 설명, 상품 설명 콘텐츠, 기본 상품 설명, 직원에게 보여주기 안내
- KPA 태블릿 편성 화면의 "코너/상품 안내" 관점 문구 정리
- 상품 설명 콘텐츠 선택 UX 보강
- 크롬 태블릿 운영 안내 추가 또는 기존 미리보기/전시 설정 설명 보강
- idle/대기 화면 운영 문구 정리
- CHECK 문서 작성
```

### 제외

```text
- QR Core 정비
- 실제 자동 QR 렌더링 구현
- 저장형 QR-code 생성/통계/메뉴 개편
- 소비자 계정/로그인/관심 저장/CRM
- 상담 요청 고도화
- 주문/장바구니/결제
- 앱/스마트 글래스 구현
- 디지털 사이니지 runtime 통합
- 대규모 메뉴 IA 개편
- StoreCorner/CornerLayout 신규 DB 모델 도입
- device pairing 신규 구현
```

---

## 4. 작업 원칙

### 4.1 지금은 큰 구조 개편이 아니다

이번 작업에서는 새로운 코너 데이터 모델을 만들지 않는다.

현재 구조:

```text
store_tablets
store_tablet_displays
store_tablet_display_settings
idle_playlist_items
selectedContentId / selectedContentHtml
```

이 구조를 활용해 UI/UX를 개선한다.

### 4.2 기능별 메뉴는 유지한다

현재 메뉴 구조를 크게 바꾸지 않는다.

```text
/store/commerce/tablet-displays
```

이 화면 안에서 운영자가 더 자연스럽게 이해하도록 문구와 흐름을 정리한다.

### 4.3 태블릿은 코너형 안내 화면이다

표현은 "상품 진열"보다 "상품 안내", "코너 안내", "태블릿 화면 구성"에 가깝게 맞춘다.

```text
고객이 보는 태블릿:
- 상품을 고른다
- 짧은 설명을 본다
- 필요하면 직원에게 화면을 보여준다

매장 직원이 보는 관리자:
- 태블릿에 보여줄 상품을 고른다
- 상품별로 보여줄 설명 콘텐츠를 선택한다
- 대기 화면을 정한다
- 크롬 태블릿에서 볼 화면을 미리본다
```

---

## 5. 사전 Read-Only 조사

선행 WO 후속 판단으로, 기존 매장에 남아 있는 `show_consultation_button=true` row가 있는지 먼저 확인한다.

주의:

```text
- SELECT만 수행한다.
- UPDATE/DELETE/마이그레이션 금지.
- 결과만 CHECK 문서에 기록한다.
```

예상 SQL:

```sql
SELECT
  show_consultation_button,
  COUNT(*)::int AS count
FROM store_tablet_display_settings
GROUP BY show_consultation_button
ORDER BY show_consultation_button DESC;
```

가능하면 조직별 목록도 read-only로 확인한다.

```sql
SELECT
  organization_id,
  show_consultation_button,
  updated_at
FROM store_tablet_display_settings
WHERE show_consultation_button = true
ORDER BY updated_at DESC
LIMIT 50;
```

판단:

```text
이번 WO에서는 true row를 변경하지 않는다.
그대로 둠 / 매장 안내 / 일괄 false 마이그레이션 중 선택은 별도 사용자 판단으로 남긴다.
```

---

## 6. 우선 확인할 파일

| 영역 | 파일 |
|---|---|
| 태블릿 공통 런타임 | `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` |
| 태블릿 타입 | `packages/tablet-kiosk-core/src/types.ts` |
| KPA 태블릿 공개 wrapper | `services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx` |
| KPA 태블릿 공개 API client | `services/web-kpa-society/src/api/tablet.ts` |
| KPA 태블릿 편성 화면 | `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` |
| KPA 태블릿 편성 API client | `services/web-kpa-society/src/api/tabletDisplays.ts` |
| 태블릿 관리 API | `apps/api-server/src/routes/platform/store-tablet.routes.ts` |
| 공개 태블릿 API | `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` |
| 공개 상품 조회 | `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` |

---

## 7. 구현 요구사항

### 7.1 공개 태블릿 목록 화면 문구 정리

현재 공개 런타임의 기본 문구가 일반 상품 안내에 가깝다.

개선 방향:

```text
상품 안내
관심 있는 상품을 터치하면 자세히 안내해드립니다
```

이를 공용 매대 안내 성격으로 정리한다.

권장 문구:

```text
매장 상품 안내
궁금한 상품을 터치해 설명을 확인해 보세요
```

또는:

```text
코너 상품 안내
상품을 터치하면 자세한 설명을 볼 수 있습니다
```

주의:

```text
새 StoreCorner 모델은 만들지 않으므로 실제 코너명 동적 표시가 어려우면 일반 문구로 둔다.
```

### 7.2 상품 상세 구조 정리

상품 상세는 다음 순서로 이해되게 한다.

```text
1. 상품 이미지
2. 상품명
3. 가격 또는 가격 문의
4. 선택된 상품 설명 콘텐츠가 있으면 해당 콘텐츠
5. 없으면 기본 상품 설명/요약
6. 직원에게 보여주기 안내
7. 돌아가기
```

특히 selected content가 있는 경우와 없는 경우의 폴백이 운영자와 고객 모두에게 자연스러워야 한다.

고객 화면에서는 "콘텐츠 없음" 같은 내부 문구를 노출하지 않는다.

### 7.3 "직원에게 보여주기" 영역을 명확하게 만든다

선행 WO에서 개인정보 입력/상담 요청을 제거했다. 이번 작업에서는 상품 상세 하단 안내를 더 안정적인 UI 영역으로 정리한다.

권장 UI:

```text
궁금하신 점이 있나요?
이 화면을 직원에게 보여주세요.
```

옵션:

```text
직원이 상품을 더 쉽게 안내할 수 있습니다.
```

주의:

```text
- 버튼처럼 보이되 접수 동작이 없는 UI는 피한다.
- 실제 submit/click handler를 만들지 않는다.
- 직원 호출, 알림, 상담 요청으로 오해될 문구를 피한다.
```

### 7.4 매장 취급 상품 문구 정리

용어 정책:

```text
StoreLocalProduct = 매장 취급 상품
OrganizationProductListing = O4O 주문 가능 상품
```

공개 화면에서 내부 용어가 필요 없으면 "매장에서 직접 안내하는 상품" 정도로 부드럽게 쓴다.

권장 문구:

```text
이 상품은 매장에서 직접 안내하는 상품입니다.
자세한 내용은 이 화면을 직원에게 보여주세요.
```

관리자 화면에서는 기존 사용자 용어 정책에 맞춘다.

```text
매장 취급 상품
O4O 주문 가능 상품
```

다만 현재 화면에 이미 `취급 중인 O4O 제품`, `매장 경영활용 제품` 같은 서비스 고유 용어가 있다면, 무리하게 전면 변경하지 말고 문맥상 어색한 부분만 정리한다.

### 7.5 상품 설명 콘텐츠 선택 UX 보강

KPA 태블릿 편성 화면에서 상품별 설명 콘텐츠 선택 영역을 더 명확하게 한다.

현재 구조:

```text
표시할 설명 콘텐츠
이 제품에 연결된 콘텐츠가 없습니다.
```

개선 방향:

```text
상품 상세에서 보여줄 설명
연결된 설명 콘텐츠가 있으면 태블릿 상세 화면에서 우선 표시됩니다.
연결된 설명 콘텐츠가 없으면 기본 상품 설명이 표시됩니다.
```

콘텐츠 후보가 없을 때:

```text
연결된 설명 콘텐츠가 없습니다.
태블릿에는 기본 상품 설명이 표시됩니다.
```

콘텐츠 후보가 있을 때:

```text
설명 콘텐츠 선택 안 함
```

의미:

```text
선택 안 함 = 기본 상품 설명 사용
```

가능하면 select 옆 또는 아래에 이 의미를 짧게 안내한다.

### 7.6 관리자 화면의 섹션 이름 정리

문구 개선 후보:

| 현재 | 개선 후보 |
|---|---|
| 태블릿 진열 관리 | 태블릿 상품 안내 관리 |
| 진열할 제품 선택 | 태블릿에 보여줄 상품 선택 |
| 현재 진열 구성 | 현재 태블릿 화면 구성 |
| 표시할 설명 콘텐츠 | 상품 상세에서 보여줄 설명 |
| Idle 재생 목록 | 대기 화면 |
| 전시 설정 | 태블릿 화면 설정 |

주의:

```text
route, 데이터 구조, API 이름은 바꾸지 않는다.
화면 문구 중심으로만 정리한다.
```

### 7.7 크롬 태블릿 운영 안내 보강

태블릿은 앱이 아니라 크롬 브라우저에서 실행된다. 관리자 화면에 운영자가 확인할 수 있는 안내가 필요하다.

가능한 위치:

```text
/store/commerce/tablet-displays 상단 안내 영역
또는 미리보기 버튼 근처
또는 태블릿 목록/선택 영역 하단
```

권장 문구:

```text
크롬 태블릿에서 매장 태블릿 주소를 열어 사용합니다.
홈 화면 바로가기로 추가하면 주소 입력 없이 실행할 수 있습니다.
화면이 바뀐 뒤에는 새로고침하거나 다시 열어 최신 구성을 확인하세요.
```

필요하면 간단 체크리스트로 표시한다.

```text
- 크롬에서 태블릿 주소 열기
- 홈 화면에 바로가기 추가
- 화면 자동 꺼짐 시간 확인
- 미리보기로 상품 상세 확인
```

하지 않을 것:

```text
- 실제 PWA manifest/service worker 신규 구현
- Android kiosk/MDM 연동
- 자동 부팅/원격 제어 구현
```

### 7.8 미리보기 설명 정리

현재 미리보기는 공개 태블릿 화면을 재사용한다. 미리보기 안내 문구를 크롬 태블릿 운영 기준으로 조금 더 명확히 한다.

권장 문구:

```text
현재 저장된 태블릿 화면을 미리 봅니다.
실제 크롬 태블릿에서는 화면 크기와 방향에 따라 표시가 달라질 수 있습니다.
```

가능하면 다음 확인 항목을 안내한다.

```text
- 상품 목록
- 상품 상세
- 설명 콘텐츠 표시
- 직원에게 보여주기 안내
- 대기 화면 전환
```

### 7.9 idle/대기 화면 문구 정리

`Idle 재생 목록`은 운영자에게 기술적으로 느껴진다.

개선 방향:

```text
대기 화면
사용자가 조작하지 않을 때 보여줄 이미지나 영상을 설정합니다.
```

주의:

```text
디지털 사이니지와 합치지 않는다.
태블릿 대기 화면은 태블릿 전용 보조 화면이다.
```

---

## 8. QR 관련 처리

이번 작업에서 QR 구현은 하지 않는다.

정책:

```text
- QR Core 정비는 별도 채팅방/별도 WO에서 진행한다.
- 자동 QR/저장형 QR 구조는 이번 작업에서 만들지 않는다.
- 태블릿 UI 문구에서 QR을 과도하게 강조하지 않는다.
```

단, 기존 showQr 설정이나 QR 진입 배지가 있으면 깨지지 않게 유지한다.

---

## 9. 디지털 사이니지 관련 처리

태블릿 대기 화면과 디지털 사이니지는 목적이 다르다.

```text
태블릿 대기 화면
= 사용자가 조작하지 않을 때 태블릿이 보여주는 보조 화면

디지털 사이니지
= 별도 플레이어/스케줄/홍보 화면
```

이번 작업에서는 두 runtime을 합치지 않는다.

---

## 10. 검증 기준

### 10.1 정적 검증

```text
- KPA web typecheck
- api-server typecheck, 변경 시
- 공통 tablet-kiosk-core를 소비하는 서비스 영향 확인
- 미사용 import/state/style 제거
```

### 10.2 Read-only DB 조사 검증

CHECK 문서에 다음을 기록한다.

```text
- show_consultation_button=true row count
- false row count
- null/row 없음 기본값 정책
- 이번 작업에서 데이터 변경 없음
```

### 10.3 KPA 관리자 화면 검증

대상:

```text
/store/commerce/tablet-displays
```

확인:

```text
- 화면 제목/섹션 문구가 태블릿 공용 안내 목적에 맞다.
- 상품 선택/현재 구성 기능이 유지된다.
- 상품 설명 콘텐츠 select가 유지된다.
- 콘텐츠 미연결 시 기본 상품 설명 폴백 안내가 보인다.
- 대기 화면 문구가 자연스럽다.
- 크롬 태블릿 운영 안내가 보인다.
- 미리보기 버튼/오버레이가 정상이다.
```

### 10.4 KPA 공개 태블릿 화면 검증

대상:

```text
/tablet/:slug
```

확인:

```text
- 상품 목록 문구가 공용 안내 화면에 맞다.
- 상품 상세가 정상 진입된다.
- 선택 콘텐츠가 있으면 우선 표시된다.
- 선택 콘텐츠가 없으면 기본 상품 설명/요약이 표시된다.
- 고객 화면에 "콘텐츠 없음" 같은 내부 문구가 보이지 않는다.
- 개인정보 입력/상담 요청 버튼이 다시 나타나지 않는다.
- 직원에게 화면을 보여주라는 안내가 보인다.
- 돌아가기 동작이 정상이다.
- idle 진입/복귀가 깨지지 않는다.
```

### 10.5 회귀 방지

```text
- QR Core 새 구현 없음
- 상담 요청 기능 재노출 없음
- 주문/장바구니/결제 경로 추가 없음
- 사이니지 runtime import 없음
- DB 마이그레이션 없음
```

---

## 11. 산출물

작업 완료 후 CHECK 문서를 작성한다.

```text
docs/checks/CHECK-O4O-KPA-TABLET-CORNER-PRODUCT-GUIDE-UX-AND-CHROME-OPERABILITY-V1.md
```

CHECK 문서에는 다음을 포함한다.

```text
- 변경 파일 목록
- read-only show_consultation_button row 조사 결과
- 공개 태블릿 목록/상세 문구 변경
- 상품 설명 콘텐츠 선택 UX 변경
- 크롬 태블릿 운영 안내 추가/수정 내용
- idle/대기 화면 문구 변경
- typecheck 결과
- 브라우저 검증 결과
- 비범위(QR Core/소비자 관리/사이니지 통합/앱) 미착수 기록
```

---

## 12. 완료 조건

```text
1. 태블릿 공개 화면이 공용 매대 안내 화면처럼 보인다.
2. 상품 상세가 "설명 확인 → 직원에게 보여주기" 흐름으로 자연스럽다.
3. 상품 설명 콘텐츠가 있을 때/없을 때 모두 고객 화면이 어색하지 않다.
4. 관리자 편성 화면에서 상품 설명 콘텐츠 선택 의미가 명확하다.
5. 크롬 태블릿 운영 안내가 관리자에게 보인다.
6. idle/대기 화면이 디지털 사이니지와 혼동되지 않게 설명된다.
7. 개인정보 입력/상담 요청/주문/QR Core/사이니지 통합이 다시 들어오지 않았다.
8. CHECK 문서가 작성되었다.
```

---

## 13. 구현자 주의

이번 작업은 큰 기능 개발이 아니다.

```text
문구와 화면 흐름을 정리해
태블릿을 "작업 기능"이 아니라 "매장 공용 안내 경험"으로 보이게 만드는 작업이다.
```

특히 다음을 피한다.

```text
- 새 코너 DB 모델 만들기
- QR 자동 생성 구현하기
- 상담 요청 기능 되살리기
- PWA/Service Worker를 이번 범위에서 새로 만들기
- signage player를 tablet에 붙이기
```

태블릿 V1의 기준 문장은 다음이다.

```text
크롬 태블릿에서 실행되는 O4O 태블릿은
소규모 전문매장의 상품/코너 설명을 돕는 공용 안내 화면이다.
```
