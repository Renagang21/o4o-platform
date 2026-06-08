# WO-O4O-GUIDE-REAL-WORKFLOW-VALIDATION-AUDIT-V1 (Investigation Report)

> **유형**: Investigation Report / Validation Audit (조사 전용 — 코드/Guide/route/IA 변경 없음)
> **일자**: 2026-06-08
> **선행**: IR-O4O-NETURE-GUIDE-HOME-IA-AUDIT-V1, IR-O4O-BUSINESS-GUIDE-RECLASSIFICATION-AUDIT-V1, IR-O4O-GUIDE-FULL-STRUCTURE-AUDIT-V1
> **목적**: Guide 체계 자체가 아니라 **실제 Workspace 이용 흐름** 관점에서 Guide 연결성이 충분한지 검증한다. (Guide 신규 작성 종료 판정용)

---

## 0. 결론 요약

| 검증 축 | 판정 |
|--------|:----:|
| Guide → Workspace 아웃바운드 링크 | 🟢 PASS (데드링크 0 / 43 route 전부 실재) |
| Workspace → Guide 백링크 | 🔴 GAP (전역 헤더 "이용 안내"만 / workspace 화면 0건) |
| Dead Guide (설명 있고 기능 없음) | 🟢 사실상 없음 (강좌·설문·광고·구독은 "준비 단계"로 정직 표기 + 미링크) |
| Missing Guide — 공개 사용자 | 🟢 사실상 없음 (공급자/매장/파트너 흐름 커버) |
| Missing Guide — 운영자 콘솔 | 🟡 17개 콘솔 화면 무가이드 (별도 트랙) |

**최종 판정: A(공개 Guide 콘텐츠 추가 불필요) + D(Workspace→Guide 백링크 보강 = 유일한 실질 다음 작업).** 운영자 콘솔 운영 매뉴얼은 공개 Guide와 다른 별도 트랙으로 분리 판단.

---

## 1. Guide → Workspace 매핑표 ★산출물 1 — 🟢 PASS

`neture.ts`의 모든 guide primaryAction.to / index card route / routeLabel(실 route) 43개를 `App.tsx` <Route>와 대조 → **전부 존재, 데드링크 0**.

대표 검증 (요청 핵심 8개 포함):

| Guide 출처 | 링크 route | App.tsx | 판정 |
|-----------|-----------|:------:|:----:|
| for-operator / business-* | `/o4o/apply` | ✓ | OK |
| feature event-offer | `/supplier/event-offers` | ✓ | OK |
| feature b2b-content | `/supplier/b2b-content` | ✓ | OK |
| feature copilot / onboarding | `/supplier/dashboard` | ✓ | OK |
| for-seller | `/seller/qr-guide` | ✓ | OK |
| for-seller | `/workspace/hub` | ✓ | OK |
| for-seller | `/supplier/signage/manage` | ✓ | OK |
| o4o-overview / for-seller | `/store/my-products` | ✓ | OK |
| feature market-trial | `/market-trial` · `/supplier/market-trial/new` | ✓ | OK |
| feature partner-program | `/partner` · `/partner/settlements` | ✓ | OK |
| feature forum-resources | `/forum` · `/forum/write` · `/resources` · `/notices` | ✓ | OK |
| Business Guide 9 + hub | `/guide/business/*` | ✓ | OK |

→ **Guide가 가리키는 기능 진입점은 모두 실재한다. 데드링크 없음.**

---

## 2. Workspace → Guide 매핑표 ★산출물 2 — 🔴 GAP

실제 앱 화면에서 `/guide/*` 로 가는 백링크 조사 결과 — **전역 헤더 1곳을 제외하면 0건**.

| 위치 | Guide 백링크 | 비고 |
|------|:---:|------|
| 전역 헤더 (NetureGlobalHeader, navigation.ts) | ✅ `/guide` | "이용 안내" — 유일·전역 진입점 |
| 공급자 workspace (SupplierSpaceLayout, products/event-offer/library/dashboard) | ❌ | 사이드바·화면 내 guide 링크 0. (일부는 `fetchGuidePageContent`로 **본문만 인라인 표시**, 링크 아님) |
| 파트너 workspace (PartnerSpaceLayout) | ❌ | 0 |
| 매장 workspace (HubPage `/workspace/hub`, /store/*) | ❌ | 0 |
| 운영자 콘솔 | ⚠️ 간접 | `/operator/guide-contents`(가이드 **편집** 화면)만 있고 공개 `/guide/*` 백링크 없음 |

**핵심**: 사용자가 workspace 안에서 막혔을 때 관련 Guide로 돌아갈 동선이 **전역 헤더 외에 없다.** 여러 화면이 `fetchGuidePageContent`로 안내 문구를 인라인 렌더하지만, "더 알아보기 → 해당 Guide" 링크는 없음.

---

## 3. Dead Guide 목록 ★산출물 3 — 🟢 사실상 없음

설명은 있으나 실기능이 없는 항목:

| 항목 | Guide 위치 | 실기능 | 판정 |
|------|-----------|:------:|------|
| 강좌(LMS) | operator-revenue §강좌와 설문 | ❌(타입만) | 🟢 "준비 단계"로 명시 + **미링크** → dead 아님 |
| 설문 | operator-revenue §강좌와 설문 | ❌(타입만) | 🟢 동일 |
| 광고 수익화 | operator-revenue §광고와 스폰서십 | ◐(배치 관리만, 수익화 없음) | 🟢 "준비 단계" 명시 |
| 운영 패키지·구독 | operator-revenue §운영 패키지와 구독 | ❌ | 🟢 "준비 단계" 명시 |

→ 이들은 모두 **operator-revenue 가이드에서 "준비 단계/향후 가능"으로 정직하게 라벨**되고 **클릭 route를 부여하지 않았다**(GuideHomePage 주석: "route 없는 항목 데드링크 0 원칙"). 따라서 **진짜 Dead Guide는 없음**. 단 강좌·설문·광고는 기능 구현 시 정식 편입 필요(로드맵).

---

## 4. Missing Guide 목록 ★산출물 4

### 4-1. 공개 사용자(공급자/매장/파트너) — 🟢 사실상 없음
공급자(상품등록·B2B·오퍼·펀딩·Copilot), 매장(for-seller가 HUB·내매장·QR·POP·사이니지·주문 전부), 파트너(partner-program) 흐름은 Guide로 커버됨.

### 4-2. 운영자 콘솔 운영 화면 — 🟡 17개 무가이드 (별도 트랙)
운영자/관리자 콘솔의 실제 기능 다수가 Guide 설명 없음 (operatorMenuGroups.ts + App.tsx 실측):

| 영역 | 무가이드 콘솔 화면(예) |
|------|----------------------|
| 콘텐츠/광고 | 커뮤니티 광고 관리(/operator·/admin community-admin), 홈페이지 CMS, 가이드 문구 관리 |
| 사이니지 | 운영자 사이니지 HQ(/operator/signage/hq-media 외 5) |
| AI/분석 | AI 리포트·카드리포트·운영·자산품질, 포럼 분석 |
| 상품/카탈로그 | 카테고리·브랜드·마스터·상품정리·카탈로그 임포트·카테고리 매핑 |
| 승인/운영 | 상품-서비스 승인, 공급자 활성화, 문의 메시지 |
| 거버넌스 | 운영자/역할 관리, 회원 완전삭제, 파트너 현황·정산·커미션 |

→ 이는 **공개 Guide(역할/기능/Business)와 성격이 다른 "운영자 콘솔 운영 매뉴얼" 영역**이다. 공개 Guide 트랙의 누락이 아니라, 별도 트랙(운영자 onboarding/콘솔 도움말)으로 다뤄야 한다.

---

## 5. 사용자 유형별 실제 이용 흐름도 ★산출물 5

```text
공급자   헤더 이용안내 → /guide → ⑤공급자 → /supplier
         → 상품등록(/supplier/products) → 오퍼(/supplier/event-offers)
         → 펀딩(/supplier/market-trial) → 주문(/supplier/orders)
         아웃바운드 🟢 / 화면에서 Guide 복귀 🔴(헤더만)

매장     /guide → ⑥판매자·매장 → for-seller
         → 매장HUB(/workspace/hub) → 내매장(/store/my-products)
         → 승인상품·오퍼·주문(/store/orders)
         아웃바운드 🟢 / 화면→Guide 백링크 🔴

운영자   /guide → ②서비스 운영자 → for-operator → Business Guide
         → (실제 콘솔 /operator/*) — 콘솔 화면별 Guide 없음 🟡
         아웃바운드 🟢 / 콘솔 운영 매뉴얼 공백 🟡

파트너   /guide → ⑦파트너 → /partner → 정산(/partner/settlements)
         아웃바운드 🟢 / 백링크 🔴
```

---

## 6. 판정 & 다음 단계

### 판정 (제시된 A~E 중)
- **A (공개 Guide 콘텐츠 추가 불필요)** ✅ — 공급자/매장/파트너 공개 흐름은 충분, 데드링크 0.
- **D (Workspace 진입 UX 보강)** ✅ — **유일한 실질 다음 작업**: workspace 화면에서 관련 Guide로 가는 백링크(또는 인라인 "더 알아보기 →") 추가.
- B(Cross-link)는 직전 WO로 Guide↔Guide는 완료 → 남은 것은 D의 Workspace↔Guide.
- C(Guide 보강)·E(재설계) = 불필요.

### 다음 작업 우선순위
1. **WO-O4O-NETURE-WORKSPACE-TO-GUIDE-BACKLINK-V1** (권장 1순위) — 공급자/매장/파트너 주요 화면에 관련 `/guide/*` 백링크 추가(이미 있는 `fetchGuidePageContent` 인라인 블록에 "전체 안내 보기 →" 링크 1개씩). 신규 Guide 0, route 0, 링크만.
2. **(별도 트랙) 운영자 콘솔 운영 매뉴얼 검토** — 17개 콘솔 화면은 공개 Guide가 아니라 운영자 콘솔 도움말/onboarding으로 별도 IR. 지금 공개 Guide에 끼워넣지 않음.
3. 강좌·설문·광고·구독은 **기능 구현 선행 후** Guide 편입(로드맵, 보류).

### Guide 트랙 종료 판정
> **공개 Guide 신규 작성 트랙은 종료 가능**(판정 A). 남은 것은 문서가 아니라 **Workspace→Guide 동선(판정 D)** 한 가지이며, 이는 경량 백링크 WO로 닫을 수 있다. 운영자 콘솔 매뉴얼은 별도 트랙.

---

## 7. 이번 감사에서 수정하지 않은 것
코드/Guide/route/IA/DB **무변경**. 백링크·콘솔 매뉴얼 **미구현**(GAP/NEXT로만 기록). 문서만 작성.
