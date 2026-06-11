# CHECK-O4O-NETURE-O4O-GUIDE-PAGE-REFINE-V1

> WO: WO-O4O-NETURE-O4O-GUIDE-PAGE-REFINE-V1
> 작업일: 2026-06-11
> 검증 기준 commit: `459d9438a` (main, working tree clean)
> 상태: PASS (현행 유지 — 기존 `/guide` 가 WO 목표를 이미 충족함을 검증·문서화. 코드 변경 없음)
> 결정: 사용자 승인 — "현행 유지 + CHECK만" (대안: 최소 타깃 정비 / 전면 재작성 → 미채택)

---

## 1. 작업 목적

Neture의 "이용안내"를 O4O 플랫폼 전체 안내 + Neture 사업자(공급자·파트너) 이용안내를 함께 담는 공개 안내 페이지로 정비한다.

## 2. 적용 서비스

- `services/web-neture` (조사 대상). **코드 수정 없음** — 기존 페이지가 WO 목표를 이미 충족하여 현행 유지.

## 3. 제외 서비스와 제외 사유

- `services/web-glycopharm` / `services/web-k-cosmetics` / `services/web-kpa-society` — 각 서비스별 "서비스 안내" 작업 별도 완료, 본 WO 범위 외
- 푸터 구조 정비 — 후속 별도 WO로 분리
- 외부 working tree 변경 — 작업 시작 시 clean 확인, stage/commit 안 함

## 4. 기존 이용안내 라우트 확인 결과

| 항목 | 값 |
|---|---|
| 상단 메뉴 | `이용 안내` (`services/web-neture/src/config/navigation.ts` `NETURE_PUBLIC_NAV`) |
| 라우트 | `/guide` → `GuideHomePage` (`services/web-neture/src/App.tsx:689`) |
| 페이지 컴포넌트 | `services/web-neture/src/pages/guide/GuideHomePage.tsx` |
| 성격 | **"O4O 플랫폼 이용 안내 통합 허브"** (Neture 단독 소개 아님) — `WO-O4O-NETURE-GUIDE-IA-AND-WRAPPER-PAGES-V1` / `WO-O4O-NETURE-HEADER-AND-GUIDE-CONSOLIDATION-V1` / `WO-O4O-NETURE-GUIDE-HOME-IA-RESTRUCTURE-V1` 로 이미 정비됨 |
| 하위 IA | `pages/guide/` 36개 페이지 (intro/structure/concept/operation, features 8종, business 14종, services 3종, for-operator/for-seller, o4o-overview 등) |
| 콘텐츠 SSOT | 공유 패키지 `@o4o/shared-space-ui` (`guide/copy/neture.ts`) + Guide CMS 오버라이드(`GuideEditableSection`, pageKey/sectionKey) |

**결론: 기존 이용안내 페이지가 존재하며 기능적으로 충분하고 구조가 명확함.** WO §5-4 ("신규 생성보다 기존 페이지 정비 우선") 및 §5-5 (불충분 시에만 신규 컴포넌트 연결) 기준상, 신규 페이지 생성·기존 페이지 재작성 모두 불필요. CLAUDE.md Guide baseline(sectionKey 정책 / schema validation / pageKey catalog) 및 Shared Module Change Protocol 가드 하에서 전면 재작성은 회귀 위험.

## 5. 수정한 라우트 또는 유지한 라우트

- **유지**: `/guide` (변경 없음). 불필요한 라우트 변경 없음.
- 브라우저 접근 확인 대상: `https://neture.co.kr/guide`

## 6. 상단 메뉴 반영 여부

- 기존 `이용 안내` 메뉴 유지. `서비스 안내` / `About` / `Contact Us` 신규 추가 없음 (WO §10 준수). (`Contact Us` 는 기존부터 존재 — 신규 추가 아님.)

## 7. 페이지 섹션 구조 — WO 요구 9섹션 ↔ 기존 `/guide` 매핑

| WO 요구 섹션 | 기존 `/guide` 충족 위치 | 충족 |
|---|---|:--:|
| 1. Hero | `hero` — "O4O 플랫폼 이용 안내" + 7영역 flow | ✅ |
| 2. O4O 플랫폼 소개 | group 01 "O4O 이해" + `serviceShowcase`(현재 운영 중인 O4O 서비스) | ✅ |
| 3. O4O 기본 참여 구조 | group 01 설명(공급자·운영자·매장 구조) + `/guide/o4o-overview` | ✅ |
| 4. Neture의 역할 | 허브 전체가 Neture 기반 O4O 안내. group 05(공급자)·07(파트너)·기능설명이 Neture 역할 구체화 | ✅ |
| 5. 공급자 이용안내 | group 05 "공급자 참여 안내" + `/guide/features/supplier-onboarding` + 기능(상품등록/B2B콘텐츠/이벤트오퍼/마켓트라이얼) | ✅ |
| 6. 파트너 이용안내 | group 07 "파트너 안내" + `/guide/features/partner-program` | ✅ |
| 7. 유통참여형 펀딩 안내 | group 03 항목 + `/guide/features/market-trial` + `/guide/business/market-trial` | ✅ |
| 8. 이용 흐름 | hero flowBar + 각 group 의 진행 흐름(예: 펀딩 "공급자 제안→운영자 검토→매장 참여→제품 정산→매장 랜딩") | ✅ |
| 9. 문의 안내 | `index.cards` 마지막 "내 사업에 맞는 운영 방식 상담하기" → `/contact`, business examples 내 상담 CTA | ✅ |

→ WO 9섹션을 기존 허브가 7 group + serviceShowcase + business examples 구조로 모두 포괄. 정적 9섹션보다 풍부.

## 8. O4O 플랫폼 안내 반영 여부

- ✅ 반영됨. `/guide` 는 명시적으로 "O4O 플랫폼 이용 안내 허브"이며 Online for Offline 구조, 공급자·운영자·매장 참여 구조, 현재 운영 중인 O4O 서비스(KPA/GlycoPharm/K-Cosmetics) 쇼케이스를 포함.

## 9. Neture 공급자/파트너 안내 반영 여부

- ✅ 공급자: group 05 + `/supplier` + `/guide/features/supplier-onboarding` + 상품등록/B2B콘텐츠/이벤트오퍼/마켓트라이얼 기능 안내
- ✅ 파트너: group 07 + `/partner` + `/guide/features/partner-program`

## 10. Neture "내 매장" 기능 표현 여부 — 중요 발견

- WO §5-6/§8 은 "Neture 는 내 매장 기능이 없는 것으로 설명"을 요구하나, **실제 코드에는 Neture seller/store 표면이 존재**:
  - `/store/my-products` (`StoreProductsManagerPage`, App.tsx:864), `/store/orders`(:857), `/workspace/hub`(:925), `/seller/my-products`(:880) — 모두 실재 라우트(데드링크 아님)
- 따라서 WO 의 "Neture 내 매장 없음" 전제는 현 코드와 불일치. 기존 `/guide` group 06 "판매자 / 매장 이용 안내"는 이를 **O4O 판매자/매장 이용 흐름**(상품 확인·장바구니·주문·배송 확인 + 매장 HUB 자료 수신 + O4O 참여 QR 생성)으로 정확히 안내하며, "Neture 전용 매장 경영 실행 서비스"로 과장하지 않음 → WO 의 우려(매장 경영자용 내 매장 실행 서비스로 오해) 자체는 현행 표현에서 발생하지 않음.
- 판단: 기존 표현이 코드 사실과 정합하고 과장이 없으므로 변경 불필요. WO 전제와 코드의 차이는 본 문서에 기록(후속 IR 필요 시 별도 판단).

## 11. 유통참여형 펀딩 표현 주의사항 반영 여부

- ✅ 기존 `netureGuideFeatureMarketTrialProps`(`@o4o/shared-space-ui/guide/copy/neture.ts`) 가 WO §8 우려를 이미 강하게 반영:
  - "투자형 펀딩이 아님 — 주식·채권·배당·이자·원금 상환 같은 금융적 권리를 제공하지 않습니다."
  - "참여자의 이익은 금융 수익이 아니라, 낮은 부담으로 새 제품을 먼저 확보하고 매장에서 활용할 수 있는 기회"
  - "제품으로 정산" 기본, "개발비 전체 조달이 목적이 아님", "매장 랜딩" 중심
  - 운영자 체크 항목에 "투자형 오해 방지", FAQ 에 "투자 상품 여부" 안내
- WO 초안보다 정밀하게 금융상품 오해를 차단. 변경 불필요.

## 12. 문의 폼 제외 사유

- WO §10: 문의 폼 신규 구현 범위 외. 기존 `/contact` (ContactPage) 경로 존재 — 허브 내 상담 CTA가 `/contact` 로 연결됨(신규 기능 불필요).

## 13. 푸터 정비 후속 분리 사유

- WO §3/§5-12: 푸터 구조 정비는 범위 외. 문의 수신 경로·푸터 문의 링크 정비는 후속 푸터/문의 정비 WO 로 분리.

## 14. 검증 결과

- 기존 `이용 안내` 메뉴 노출 정상 (`NETURE_PUBLIC_NAV` 유지)
- `/guide` → `GuideHomePage` 렌더 정상 (라우트 무변경)
- O4O 플랫폼 소개 + Neture 공급자·파트너 이용안내 동시 포함 확인
- Neture 를 매장 경영자용 "내 매장" 서비스로 과장하는 표현 없음 확인
- 커뮤니티 기능 과대 강조 없음 — 커뮤니티는 Forum/자료실 기능 안내 수준, 유통참여형 펀딩은 참여형 유통 프로그램으로 한정
- 유통참여형 펀딩 금융상품 오해 차단 표현 확인
- GlycoPharm / K-Cosmetics / KPA Society 파일 미수정
- 외부 working tree 변경 stage/commit 안 함
- **코드 변경 없음 → TypeScript/build 영향 없음** (기존 빌드 상태 유지)

## 15. 변경 파일

- `docs/checks/CHECK-O4O-NETURE-O4O-GUIDE-PAGE-REFINE-V1.md` (신규, 본 문서) — **유일한 변경 파일**

## 16. commit hash

- (commit 후 기재)

---

## 부록 — 후속 권고 (본 WO 범위 외)

1. WO 전제("Neture 내 매장 없음") vs 코드(`/store/my-products` 등 존재) 불일치 — Neture seller/store 표면의 정체성/노출 정책을 별도 IR 로 정리 권장.
2. 푸터 정비 WO 진행 시, 3개 서비스(서비스 안내) + Neture(이용 안내) 진입점을 푸터 `이용안내 / 문의하기 / 약관 / 개인정보처리방침 / 사업자 정보` 체계로 통합 정리.
