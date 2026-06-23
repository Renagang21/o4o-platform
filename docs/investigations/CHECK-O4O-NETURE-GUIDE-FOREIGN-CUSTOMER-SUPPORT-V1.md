# CHECK-O4O-NETURE-GUIDE-FOREIGN-CUSTOMER-SUPPORT-V1

WO: **WO-O4O-NETURE-GUIDE-FOREIGN-CUSTOMER-SUPPORT-V1**
작업 제목: Neture 가이드 — 외국인 고객 응대 가이드 추가 (운영 매뉴얼)

## 1. 목적
KPA 다국어 상품 콘텐츠 파일럿으로 만든 기능(QR·태블릿·다국어 안내)을 실제 매장 운영 문맥으로 연결하는
**운영 매뉴얼**을 Neture 가이드에 추가한다. 기능 구현이 아니라 가이드 콘텐츠 작업.

## 2. 조사 결과
- `/guide` 카드 목록: `GuideHomePage.tsx` `homeProps.steps`. "판매자 / 매장 이용 안내"(step 06) `items: {label, route}[]` (L153-163).
- 상세 페이지 패턴: 정적 JSX (`SectionTitle`/`Bullets` 헬퍼, 다른 API 없음) — `GuideBusinessTouristStorePage.tsx` 기준.
- 라우트: `App.tsx` lazy import + `<Route>`, export 는 `pages/guide/index.ts` barrel.
- **중복 확인**: 기존 `/guide/business/foreign-customer-store` 는 "외국인 많은 지역 매장" **시장 시나리오**(누가/왜). 본 작업 `/guide/foreign-customer-support` 는 QR/태블릿/콘텐츠 **운영 방법**(어떻게) — 별개. 충돌 없음.

## 3. 변경 (web-neture, frontend 문서/콘텐츠 4파일)
- `pages/guide/GuideForeignCustomerSupportPage.tsx` (신규) — 상세 매뉴얼 9섹션 + hero + 운영정책 + CTA
- `pages/guide/index.ts` — export 추가
- `App.tsx` — lazy import + `Route path="/guide/foreign-customer-support"`
- `pages/guide/GuideHomePage.tsx` — step06 items 에 카드 `{ '외국인 고객 응대 가이드', '/guide/foreign-customer-support' }` (QR 가이드 다음)

상세 페이지 섹션: 어떤 상황 / 준비 / 콘텐츠 만들기 / Store Hub 가져오기 / 매장 상품 연결 / QR / 태블릿 / 직원 응대 예시 / 운영 주의사항.

## 4. 용어·경계 준수
- 사용: 매장 취급 상품 / O4O 주문 가능 상품 / 다국어 상품 안내 콘텐츠 / 고객용 보기 / QR 보기 / 태블릿 보기 / Store Hub.
- 금지(미사용): 내 매장 상품 / 소비자 결제 / 관광객 결제 / 자동 주문 / 앱 결제.
- 운영정책 명시: 가져오기=매장 전용 사본 / 원본 수정·삭제 무영향 / 링크·QR 발급=공개 / 보관=비노출.
- KPA 기능 코드·GP/KCos·API·DB·migration **무변경**.

## 5. 검증
### 5.1 정적
- web-neture `pnpm build` (tsc && vite build) — **PASS** (✓ built, chunk-size 경고 외 에러 0).
### 5.2 배포 후 UI smoke
(작성 예정 — neture.co.kr 배포 후 /guide 카드 + /guide/foreign-customer-support 렌더)

## 6. 성공 기준 대비
1. /guide 카드 추가 — ✅(코드)  2. 상세 페이지 렌더 — (smoke)  3. 흐름 이해 가능 — ✅(콘텐츠)
4. KPA 언급/GP·KCos 오해 방지 — ✅  5. 결제/앱 혼동 없음 — ✅  6. 기존 카드 회귀 — (smoke)

## 7. 후속
KPA 파일럿 closure([[CHECK-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-PILOT-CLOSURE-V1]]) 이후 운영 매뉴얼 연결 완료.
다음 = Cross-service adoption IR (GP/KCos).
