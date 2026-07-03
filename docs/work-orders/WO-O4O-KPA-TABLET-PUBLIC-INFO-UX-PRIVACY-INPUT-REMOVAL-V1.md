# WO-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1

> Claude Code 작업 요청서
>
> 작성일: 2026-07-03
>
> 관련 조사: `docs/investigations/IR-O4O-STORE-CORNER-TABLET-IMPLEMENTATION-AUDIT-V1.md`

---

## 1. 작업 제목

**O4O KPA 태블릿 공용 안내 UX 정비: 개인정보 입력·상담 요청 제거**

---

## 2. 배경

O4O 태블릿 V1은 소규모 전문매장의 공용 매대 안내 화면이다.

사용 환경은 다음과 같이 확정한다.

```text
- 크롬 태블릿 사용
- 앱/PC 프로그램이 아니라 크롬 브라우저에서 동작
- 주문, 장바구니, 결제 없음
- 소비자 로그인, 개인정보 입력, 상담 요청 접수 없음
- QR Core 정비는 별도 작업
```

현재 태블릿 런타임에는 아직 과거의 상담 요청 흐름이 남아 있다.

```text
- 이름 입력
- 요청 사항 입력
- 직원에게 안내 요청 버튼
- 상담 요청 POST
- 요청 상태 polling 화면
```

이 흐름은 공용 태블릿 V1 원칙과 맞지 않는다. 개인정보 입력이나 상담 접수는 후속 모바일 앱/PWA 또는 O4O 소비자 관리 기능에서 별도 설계해야 한다.

이번 작업은 **태블릿을 입력 장치가 아니라 안내 장치로 정리**하는 것이 목적이다.

---

## 3. 작업 범위

### 포함

```text
- KPA 태블릿 공개 화면에서 개인정보 입력 UI 제거
- KPA 태블릿 공개 화면에서 상담 요청 버튼/상태 화면 제거 또는 기본 비활성화
- 상품 상세 하단 문구를 "직원에게 이 화면을 보여주세요" 흐름으로 변경
- KPA 태블릿 편성 화면의 전시 설정 문구 정리
- 상품 설명 콘텐츠 미연결 시 기본 상품 설명 폴백 안내 보강
- 기존 태블릿 미리보기에서 변경 사항 확인
```

### 제외

```text
- QR Core 정비
- 저장형 QR-code 생성/수정/통계
- QR 메뉴 개편
- 소비자 계정
- 소셜 로그인
- 관심 상품 저장
- 상담 요청/CRM 기능
- 모바일 앱 구현
- 스마트 글래스 구현
- 디지털 사이니지 runtime 통합
- 주문/장바구니/결제
```

---

## 4. 핵심 정책

### 4.1 태블릿은 공용 안내 화면이다

태블릿에서는 고객을 식별하지 않는다.

```text
태블릿에서 하지 않는다:
- 이름 입력
- 연락처 입력
- 요청사항 입력
- 상담 요청 접수
- 회원가입/로그인
```

### 4.2 고객 행동은 "직원에게 보여주기"로 마무리한다

상품 상세 하단의 기본 문구는 다음 방향으로 바꾼다.

```text
이 제품이 궁금하신가요?
이 화면을 직원에게 보여주세요.
```

또는 화면 공간에 맞게:

```text
직원에게 이 화면을 보여주세요.
```

### 4.3 개인정보·상담 접수는 후속 모바일 앱/PWA로 분리한다

코드 주석 또는 UI 설명에 다음 원칙이 드러나야 한다.

```text
태블릿 V1에서는 개인정보 입력과 상담 요청 접수를 제공하지 않는다.
이 기능은 향후 모바일 앱/PWA 또는 O4O 소비자 관리 기능에서 별도 설계한다.
```

---

## 5. 우선 확인할 파일

| 영역 | 파일 |
|---|---|
| 태블릿 공통 런타임 | `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` |
| 태블릿 공통 타입 | `packages/tablet-kiosk-core/src/types.ts` |
| KPA 태블릿 wrapper | `services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx` |
| KPA 태블릿 API client | `services/web-kpa-society/src/api/tablet.ts` |
| KPA 태블릿 편성 화면 | `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` |
| KPA 태블릿 편성 API client | `services/web-kpa-society/src/api/tabletDisplays.ts` |
| 태블릿 관리 API | `apps/api-server/src/routes/platform/store-tablet.routes.ts` |
| 공개 태블릿 API | `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` |

주의:

```text
태블릿 런타임은 공통 패키지다.
KPA 외 K-Cosmetics/GlycoPharm wrapper도 사용할 수 있으므로,
공통 패키지 변경 시 다른 서비스 영향 여부를 확인한다.
```

---

## 6. 구현 요구사항

### 6.1 공개 태블릿 상세 화면에서 개인정보 입력 제거

현재 `TabletKioskPage` 상품 상세 화면에는 다음 입력이 있다.

```text
- 이름 (선택사항)
- 요청 사항 (선택사항)
```

이 입력 UI를 태블릿 V1 기본 화면에서 제거한다.

기대 결과:

```text
상품 상세 화면에는 이름/요청사항 input이 보이지 않는다.
```

### 6.2 상담 요청 버튼 제거 또는 V1 기본 비활성화

현재 버튼:

```text
직원에게 안내 요청
```

V1에서는 이 버튼을 상담 접수 기능으로 쓰지 않는다.

권장 구현:

```text
- submitInterest 버튼을 기본 렌더링하지 않는다.
- 하단 action bar에는 "돌아가기"와 안내 문구만 둔다.
- 필요하면 기존 API와 submitted/status mode는 후속 호환을 위해 남기되, 기본 UI에서는 접근 불가능하게 한다.
```

하단 안내 문구 예:

```text
이 제품이 궁금하시면 이 화면을 직원에게 보여주세요.
```

### 6.3 `showConsultationButton` 기본 정책 변경

현재 display settings 기본값은 `showConsultationButton: true`로 확인된다.

V1 정책에서는 기본값을 false로 바꾼다.

대상 후보:

```text
packages/tablet-kiosk-core/src/TabletKioskPage.tsx
services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx
apps/api-server/src/routes/platform/store-tablet.routes.ts
apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts
services/web-kpa-society/src/api/tabletDisplays.ts
services/web-kpa-society/src/api/tablet.ts
```

주의:

```text
DB 기존 값이 true인 매장은 UI가 계속 켜질 수 있다.
이번 작업에서는 신규 기본값과 UI 기본 동작을 V1 정책에 맞추고,
기존 데이터 일괄 마이그레이션이 필요한지는 별도 판단으로 남긴다.
```

### 6.4 전시 설정 문구 정리

KPA 태블릿 편성 화면의 전시 설정에서 상담 요청을 적극 기능처럼 보이게 하는 문구를 줄인다.

현재 성격:

```text
상담 요청 버튼
상담 요청은 주문이 아니며, 고객이 관심을 표시하면 약국 근무자에게 알림이 전송됩니다.
```

개선 방향:

```text
상담 요청 버튼
후속 기능입니다. 태블릿 V1에서는 공용 안내 화면 원칙에 따라 사용하지 않는 것을 권장합니다.
```

또는 더 강하게:

```text
상담 요청 버튼
현재 태블릿 V1에서는 사용하지 않습니다. 상담 요청/개인정보 입력은 후속 모바일 앱/PWA 기능에서 다룹니다.
```

권장:

```text
가능하면 설정 항목 자체를 숨기거나 disabled 처리한다.
숨기기 어렵다면 기본 OFF + 후속 기능 설명으로 낮춘다.
```

### 6.5 상품 상세 CTA 문구 변경

태블릿 상세 화면의 최종 행동은 접수가 아니라 현장 상담 보조다.

적용 문구:

```text
이 제품이 궁금하신가요?
이 화면을 직원에게 보여주세요.
```

매장 취급 상품에도 같은 원칙을 적용한다.

현재 유사 문구:

```text
매장 자체 상품입니다. 직원에게 직접 문의해주세요.
```

개선 방향:

```text
이 제품은 매장에서 직접 안내하는 상품입니다.
이 화면을 직원에게 보여주세요.
```

### 6.6 상품 설명 콘텐츠 미연결 안내 보강

KPA 편성 화면에서 상품에 연결된 콘텐츠가 없을 때 현재는 단순히 없다고만 표시된다.

개선 문구:

```text
이 제품에 연결된 설명 콘텐츠가 없습니다.
태블릿에는 기본 상품 설명이 표시됩니다.
```

가능하면 후속 행동 안내도 붙인다.

```text
상품별 설명을 별도로 보여주려면 먼저 상품 설명 콘텐츠를 만들고 이 제품에 연결하세요.
```

단, 이번 작업에서 콘텐츠 생성/연결 신규 플로우를 만들 필요는 없다.

---

## 7. QR 관련 처리

이번 작업에서 QR Core는 다루지 않는다.

현재 확인:

```text
showQr는 실제 상품 상세 QR 표시가 아니라 ?from=qr 진입 배지 표시 수준으로 보인다.
```

이번 작업의 QR 원칙:

```text
- QR 생성/저장/통계/메뉴는 수정하지 않는다.
- 태블릿 화면에서 QR이 필요하다는 정책만 보존한다.
- 실제 자동 QR 렌더링은 별도 QR Core 작업에서 처리한다.
```

따라서 Claude Code는 QR 구현을 새로 만들지 않는다.

---

## 8. 디지털 사이니지 관련 처리

태블릿 idle 화면은 현재 자체 minimal player를 사용한다. 이 구조를 유지한다.

```text
하지 않는다:
- signage runtime을 tablet runtime에 합치기
- tablet 편성 화면을 signage playlist 편성으로 변경
- corner-display block을 tablet 상세 화면 대체로 사용
```

공유 가능한 것은 상품/콘텐츠/이미지/영상 원천뿐이다.

---

## 9. 검증 기준

### 9.1 정적 검증

```text
- TypeScript typecheck 가능한 범위에서 통과
- lint 또는 기존 프로젝트 표준 검증이 있으면 실행
- 상담 요청 UI 제거 후 미사용 import/state/action이 남지 않는지 확인
```

### 9.2 화면 검증

KPA 태블릿 공개 화면:

```text
/tablet/:slug
```

확인 항목:

```text
- 상품 목록이 정상 표시된다.
- 상품 상세 진입이 정상 동작한다.
- 상품 상세에 이름 input이 없다.
- 상품 상세에 요청사항 input이 없다.
- 상품 상세에 "직원에게 안내 요청" 버튼이 없다.
- 상품 상세에 "이 화면을 직원에게 보여주세요" 안내가 보인다.
- 돌아가기 동작이 정상이다.
- idle 화면 진입/복귀가 깨지지 않는다.
```

KPA 태블릿 관리자 화면:

```text
/store/commerce/tablet-displays
```

확인 항목:

```text
- 태블릿 목록/선택이 정상이다.
- 상품 추가/정렬/제거가 정상이다.
- 상품별 설명 콘텐츠 선택이 정상이다.
- 연결 콘텐츠가 없을 때 기본 상품 설명 폴백 안내가 보인다.
- 전시 설정에서 상담 요청 문구가 V1 정책에 맞게 정리되어 있다.
- 미리보기에서 개인정보 입력/상담 요청 UI가 보이지 않는다.
```

### 9.3 API 영향 확인

이번 작업은 UI 정책 정비가 중심이다.

```text
- 기존 상담 요청 API를 삭제하지 않아도 된다.
- 단, 공개 태블릿 UI에서 기본 접근되지 않아야 한다.
- 기존 API 삭제/DB 마이그레이션은 이번 범위가 아니다.
```

---

## 10. 산출물

작업 완료 후 다음을 작성한다.

```text
docs/checks/CHECK-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1.md
```

CHECK 문서에는 다음을 포함한다.

```text
- 변경 파일 목록
- 제거/숨김 처리한 개인정보 입력 흐름
- 상담 요청 버튼 기본 비활성화/제거 방식
- 태블릿 상세 화면 최종 문구
- 관리자 편성 화면 문구 변경
- typecheck 결과
- 브라우저 또는 수동 검증 결과
- QR Core/소비자 관리/앱은 미구현 범위로 남겼다는 기록
```

---

## 11. 완료 조건

이 작업은 다음 조건을 만족하면 완료로 본다.

```text
1. 태블릿 공개 상품 상세에서 개인정보 입력 UI가 사라졌다.
2. 태블릿 공개 상품 상세에서 상담 요청 접수 버튼이 기본 노출되지 않는다.
3. 상품 상세의 최종 행동 문구가 "직원에게 이 화면 보여주기" 흐름으로 바뀌었다.
4. 관리자 태블릿 편성 화면의 상담 요청 관련 문구가 V1 정책에 맞게 정리되었다.
5. 콘텐츠 미연결 시 기본 상품 설명 폴백 안내가 표시된다.
6. 태블릿 상품 목록/상세/돌아가기/idle/m preview가 회귀하지 않는다.
7. QR Core, 소비자 관리, 앱 기능을 새로 만들지 않았다.
```

---

## 12. 구현자 주의

```text
이 작업은 태블릿 UX 정비다.
QR Core 정비가 아니다.
소비자 관리 기능 개발이 아니다.
상담 요청 기능 고도화가 아니다.
디지털 사이니지 통합 작업이 아니다.
```

태블릿 V1의 역할은 다음 한 문장으로 고정한다.

```text
태블릿은 소규모 전문매장의 공용 상품·코너 안내 화면이며,
고객 입력을 받지 않고 직원 상담을 보조한다.
```
