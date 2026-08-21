# CHECK-O4O-GUIDE-CLOSURE-CRITERIA-RECLASSIFICATION-AND-FINALIZATION-V1

- **WO**: WO-O4O-GUIDE-CLOSURE-CRITERIA-RECLASSIFICATION-AND-FINALIZATION-V1
- **성격**: closure 기준 재정의 + 재판정 (신규 Guide 생성 없음)
- **기준 커밋**: `3e5556819` (origin/main, 2026-08-21)
- **선행 CHECK**: [CHECK-O4O-GUIDE-CROSSSERVICE-FINAL-CLOSURE-AUDIT-V1](CHECK-O4O-GUIDE-CROSSSERVICE-FINAL-CLOSURE-AUDIT-V1.md)
- **대상 3건**: KPA-Society · K-Cosmetics · GlycoPharm 의 `/store/sales-channels/foreign-visitor`

---

## 1. 집계 (§12)

```text
재검토 대상: 3
GUIDE_REQUIRED: 0
GUIDE_OPTIONAL: 1
OUT_OF_SCOPE_FOR_GUIDE: 2
INLINE_UX_GAP: 3
미조사: 0
```

```text
A형 실제 필수 Guide gap: 0
VIEW_DUPLICATED: 0
MUST_FIX_BEFORE_CLOSE: 0

최종 판정:
GUIDE_COMMONIZATION = COMPLETE
```

---

## 2. 기존 기준의 문제점

직전 final audit 은 A형 coverage gap 을 다음으로 판정했다.

```text
기능 존재 + user-facing(메뉴 노출) + Guide 없음  →  A형(필수 gap)
```

이 기준은 두 가지를 구분하지 못한다.

1. **구현 상태를 보지 않는다.** 메뉴에 노출돼 있어도 화면이 "이용권 잠금 + 결제 준비 중" 안내에
   머물러 있으면 안내할 사용 흐름 자체가 없다. 이 상태에서 Guide 를 만들면 **없는 기능을 설명하는 문서**가 된다
   (직전 audit 이 stale/dead Guide 로 금지한 것과 같은 결함을 Guide 쪽에서 새로 만드는 셈이다).
2. **화면 자체의 설명 충분성을 보지 않는다.** 목적 문구 · 잠금 사유 · empty state · 다음 행동 CTA 가
   화면 안에 갖춰져 있으면 별도 Guide 는 정보 중복만 늘린다.

또한 직전 audit 의 근거였던 "3 서비스 모두 구독 → 파트너 등록 → QR 발급 → 공개 랜딩의 다단계 흐름"은
**부정확했다.** 그 흐름은 **KPA 에만** 구현돼 있다(아래 §4). K-Cosmetics · GlycoPharm 은 게이트 화면 1개뿐이다.

---

## 3. 새 Guide 필요성 기준 (§2)

### GUIDE_REQUIRED — 다음 중 하나 이상

- 화면만 보고 정상 사용 흐름을 이해하기 어렵다
- 여러 화면을 오가야 하고 순서가 중요하다
- 잘못 사용하면 업무상 혼란·오류 가능성이 크다
- 화면 내 inline help / step 안내가 불충분하다
- 선행 조건을 사용자가 스스로 추론해야 한다

### GUIDE_OPTIONAL — 다음이면 강제하지 않는다

- 화면 자체에서 단계가 명확하다
- 버튼 · 상태 · 설명이 충분하다
- 일반적인 CRUD 또는 wizard 흐름이다
- 기존 서비스/기능 Guide 로 충분히 설명된다
- 별도 Guide 는 정보 중복만 증가시킨다

### OUT_OF_SCOPE_FOR_GUIDE

Guide 체계에서 별도 단위로 관리할 필요가 없는 보조 기능
(미구현 · 게이트 전용 · 안내 대상 흐름 부재 포함).

```text
기능 존재  ≠  Guide 필수
```

---

## 4. 3서비스 실사용성 조사 (§3)

### 구현 범위 실측 — 3 서비스가 같지 않다

| 항목 | KPA | K-Cosmetics | GlycoPharm |
|---|---|---|---|
| route 수 | **6** (`foreign-visitor`, `/payment/success`, `/payment/fail`, `/partners`, `/partners/:partnerId/qr-codes`, public `/foreign-visitor/affiliate/:shortCode`) | **1** | **1** |
| 화면 파일 | 5 (`ForeignVisitorSalesSupportPage` 108L · `ForeignVisitorPartnersPage` 401L · `ForeignVisitorPartnerQrCodesPage` 354L · `ForeignVisitorAffiliatePublicLandingPage` 91L · 결제 결과) | 1 (27L wrapper) | 1 (27L wrapper) |
| 결제(`onSubscribe`) | 주입됨 — Toss prepare → requestPayment | **미주입** → 버튼 disabled | **미주입** → 버튼 disabled |
| 파트너 등록 | 있음 | **없음** | **없음** |
| QR 발급 | 있음 | **없음** | **없음** |
| 공개 랜딩 | 있음 | **없음** | **없음** |

K-Cosmetics · GlycoPharm 의 화면은 공통 `ForeignVisitorSalesSupportPanel`(store-ui-core) 한 장이며,
`check` 만 주입한다. 프로덕션 실측 본문에도 **"이용권 결제하기 / 결제 기능은 준비 중입니다."** 로 표시된다.
이용권이 활성화돼도 패널 문구는 "판매지원 기능은 준비 중이며 곧 제공될 예정입니다." 다.

### 서비스별 기록 (§3 항목)

**KPA-Society**

```text
service                       KPA-Society
기능 진입점                    매장 사이드바 "판매 채널 확장 > 외국인 여행객 판매지원"
사용 단계 수                   4 (이용권 결제 → 파트너 등록 → 파트너별 QR 발급 → QR 배포·유입)
화면 내 설명 충분성             충분 — 각 화면 h1 + 목적 설명문, 기능 4개 항목 열거,
                              가격 라벨(서버 catalog 기준 "월 99,000원 · 30일 이용권"),
                              잠금 사유 + "시작하기" CTA, 쓰기 불가 시 버튼 disabled + title 사유,
                              empty state("아직 등록된 파트너가 없습니다" + 다음 행동 문구),
                              폼 필수표시(*) + 예시 placeholder, 로딩/에러/다시 시도
선행조건 가시성                 명확 — 이용권 미보유 시 잠금 배너와 CTA 가 상시 노출(목록 조회는 가능함을 명시)
사용자가 다음 행동을 알 수 있는가  가능 — 진입 화면 하단 "파트너 관리" 카드 → 목록 행의 "QR 관리" 버튼 →
                              QR 상세(랜딩 URL 복사 · SVG 다운로드)로 단선 연결
별도 Guide 필요성               낮음 → GUIDE_OPTIONAL
```

**K-Cosmetics**

```text
service                       K-Cosmetics
기능 진입점                    매장 사이드바 "판매 채널 확장 > 외국인 여행객 판매지원"
사용 단계 수                   0 (게이트 화면 1장. 결제·파트너·QR 미구현)
화면 내 설명 충분성             충분 — 유료 기능 안내 + 제공 예정 항목 4개 + "결제 기능은 준비 중입니다"
선행조건 가시성                 명확(이용권 필요 명시)
사용자가 다음 행동을 알 수 있는가  가능 — 현재 취할 수 있는 행동이 없음이 화면에 명시됨
별도 Guide 필요성               없음 → OUT_OF_SCOPE_FOR_GUIDE (안내할 사용 흐름 자체가 없음)
```

**GlycoPharm** — K-Cosmetics 와 코드·화면·프로덕션 표시 모두 동일. 판정 동일.

---

## 5. 기존 Guide 중복 여부 (§4)

| 확인 대상 | 결과 |
|---|---|
| KPA / KCos / GP guide copy 의 `외국인` 언급 | 각 **0건** |
| 동 copy 의 `판매 채널` 언급 | 각 **0건** |
| Store Guide · QR Guide | 판매 채널 확장 축을 다루지 않음 |
| Neture `/guide/foreign-customer-support` | Neture **플랫폼 사업 안내** 문서로, 매장 유료 기능(이용권·파트너·QR)의 조작 안내가 아니다 → 중복 아님 |

즉 기존 Guide 가 이 기능을 설명하지도 않지만, **중복 회피가 아니라 §3 기준(화면 자체 충분 / 흐름 부재)** 때문에
별도 feature Guide 를 만들지 않는다.

---

## 6. 판정 (§5)

| 서비스 | 판정 | 근거 |
|---|---|---|
| KPA-Society | **GUIDE_OPTIONAL** | 4단계 흐름이 존재하나 화면이 단선(진입 → 파트너 → QR)이고 각 단계에 목적 설명 · CTA · empty state · 잠금 사유 · 예시 placeholder 가 있다. 별도 Guide 는 화면 문구의 재서술이 된다 |
| K-Cosmetics | **OUT_OF_SCOPE_FOR_GUIDE** | 게이트 화면 1장 · 결제/파트너/QR 미구현. Guide 를 만들면 없는 기능을 설명하게 된다 |
| GlycoPharm | **OUT_OF_SCOPE_FOR_GUIDE** | 동일 |

```text
GUIDE_REQUIRED: 0
```

> 향후 K-Cosmetics · GlycoPharm 에 결제·파트너·QR 본체가 도입되거나, KPA 흐름이 화면만으로 이해하기 어려운
> 수준으로 복잡해지면 그 시점의 WO 에서 GUIDE_REQUIRED 로 재판정한다. 현재 상태 기준 판정이다.

---

## 7. INLINE_UX_GAP (§7)

Guide 로 덮지 않고 화면 문구로 기록·처리한다.

| # | 위치 | 내용 | 처리 |
|---|---|---|---|
| 1 | `ForeignVisitorPartnersPage.tsx:108` | "파트너별 QR 발급은 다음 단계에서 제공됩니다." — 실제로는 목록 행에 `QR 관리` 버튼이 있고 `/partners/:partnerId/qr-codes` 가 mount 돼 있다(stale) | **이번 WO 에서 수정** → "파트너별 QR은 목록의 'QR 관리'에서 발급·관리합니다." |
| 2 | `ForeignVisitorPartnerQrCodesPage.tsx:336` | "랜딩 화면은 다음 단계에서 연결됩니다." — 실제로는 `/foreign-visitor/affiliate/:shortCode` 공개 랜딩이 구현·mount 돼 있다(stale) | **이번 WO 에서 수정** → "스캔하면 위 주소의 외국인 고객 안내 화면으로 연결됩니다." |
| 3 | `store-ui-core/ForeignVisitorSalesSupportPanel.tsx` active 상태 | "판매지원 기능은 준비 중이며 곧 제공될 예정입니다." — KPA 는 파트너·QR 이 이미 제공되므로 KPA 기준 stale (KCos·GP 기준으로는 정확) | **미수정 · 후속 backlog** — 3 서비스 공유 컴포넌트라 문구 분기에 props 추가가 필요하다. Shared Module Change Protocol 대상이며 §10 의 "매우 작은 inline copy 개선" 범위를 넘는다. KPA 는 패널 하단 "파트너 관리" 카드가 다음 행동을 제시해 실사용 저해는 없다 |

1·2 는 **화면 문구가 실제 기능보다 뒤처진 stale copy** 로, Guide 추가가 아니라 문구 수정이 정답인 사례다(§7 원칙).

---

## 8. closure census 재분류 (§6)

기존 CHECK 는 소급 변경하지 않는다. 아래는 **새 기준 적용 결과**다.

| 항목 | 직전 audit | 본 WO 재분류 | 사유 |
|---|:--:|:--:|---|
| A형 coverage gap | 3 | **0** | 3건 모두 GUIDE_OPTIONAL / OUT_OF_SCOPE_FOR_GUIDE |
| B형 | 5 | 5 | 변화 없음 |
| C형 | 6 | **9** | A형 3건이 "기능은 있으나 별도 Guide 불필요"(C형)로 이동 |
| MUST_FIX_BEFORE_CLOSE | 3 | **0** | 위와 동일 |
| ACCEPTED_RESIDUAL | 15 | 18 | C형 3 이동 |
| OUTSIDE_GUIDE | 3 | 3 | 변화 없음 |

6종 판정 집계(115 cell)는 **변하지 않는다** — 해당 3 cell 은 여전히 `NOT_IMPLEMENTED`(Guide 미구현)이며,
바뀐 것은 그 미구현이 **closure blocker 인가**의 판단이다.

```text
전체 Guide 모집단: 115
FULLY_COMMON: 85 / CORE_ONLY: 0 / VIEW_DUPLICATED: 0
SERVICE_SPECIFIC: 2 / NOT_IMPLEMENTED: 12 / OUT_OF_SCOPE: 16
미조사: 0
```

---

## 9. 핵심 closure 조건 재확인 (§8)

현재 main(`3e5556819`) 코드로 재검증했다.

| 조건 | 결과 | 근거 |
|---|:--:|---|
| `VIEW_DUPLICATED = 0` | PASS | `ServiceGuidePage.tsx` KPA · KCos · GP **각 13L** wrapper(shared `GuideServiceIntroPage` 위임) |
| `CORE_ONLY blocker = 0` | PASS | CORE_ONLY cell 0 |
| stale / dead / orphan Guide navigation = 0 | PASS | `guideCoverageContract` 10 test(5서비스 dead route 0 + orphan 0) 통과 |
| shared Guide adoption 정상 | PASS | 5서비스 wrapper 13~24L · shared View 내 서비스 분기 0 |
| 5서비스 Guide 주요 route 정상 | PASS | route contract test + 직전 WO 프로덕션 smoke 52/52 |
| 외국인 3건 외 신규 blocker | 없음 | 본 WO 조사 범위에서 추가 발견 0 |

```text
npx vitest run --config packages/shared-space-ui/vitest.config.mjs packages/shared-space-ui/src/guide/__tests__/
3 files / 53 tests  ALL PASS
```

`services/web-kpa-society` typecheck(`tsc --noEmit`) **PASS** (§7 문구 수정 반영).

---

## 10. Production browser smoke (§11)

프로덕션 로그인(매장 계정) 후 desktop 1440×900 / mobile 390×844 로 확인. **운영 데이터 write 0**
(조회만 수행 · 결제 버튼 미클릭 · 파트너 등록 미수행 — empty state 기준 평가).

| viewport | 서비스 | 경로 | status | 404 | console/pageerror | mobile overflow |
|---|---|---|:--:|:--:|:--:|:--:|
| desktop | KPA | `/store/sales-channels/foreign-visitor` | 200 | 없음 | 0 | 0 |
| desktop | KPA | `/store/sales-channels/foreign-visitor/partners` | 200 | 없음 | 0 | 0 |
| desktop | GP | `/store/sales-channels/foreign-visitor` | 200 | 없음 | 0 | 0 |
| desktop | KCos | `/store/sales-channels/foreign-visitor` | 200 | 없음 | 0 | 0 |
| mobile | KPA | `/store/sales-channels/foreign-visitor` | 200 | 없음 | 0 | 0 |
| mobile | KPA | `/store/sales-channels/foreign-visitor/partners` | 200 | 없음 | 0 | 0 |
| mobile | GP | `/store/sales-channels/foreign-visitor` | 200 | 없음 | 0 | 0 |
| mobile | KCos | `/store/sales-channels/foreign-visitor` | 200 | 없음 | 0 | 0 |

**8/8 PASS** — white screen 0 · JS exception 0 · 메뉴 진입 정상("판매 채널 확장 > 외국인 여행객 판매지원").

실측 본문 요지:

- KPA — "월 이용권 결제하기 / 월 99,000원 · 30일 이용권" + "파트너 관리 — 여행사·가이드·호텔 등 유입 파트너를
  등록하고, 이후 파트너별 QR을 발급할 수 있습니다." → 다음 행동이 화면에 있다.
- KPA `/partners` — 잠금 배너("이용권이 활성화되면 파트너를 등록하고 관리할 수 있습니다. 목록 조회는 가능합니다") +
  필터 + empty state("아직 등록된 파트너가 없습니다 / 여행사, 가이드, 호텔 등 관광객 유입 파트너를 등록해 보세요").
- KCos · GP — "이용권 결제하기(비활성) / 결제 기능은 준비 중입니다." → 사용 흐름 부재가 화면에서 확인된다.

---

## 11. 코드 변경 (§10)

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/ForeignVisitorPartnersPage.tsx` | stale 문구 1줄 수정(INLINE_UX_GAP 1) |
| `services/web-kpa-society/src/pages/pharmacy/ForeignVisitorPartnerQrCodesPage.tsx` | stale 문구 1줄 수정(INLINE_UX_GAP 2) |

금지 항목 준수 — 외국인 여행객 Guide 3개 신규 생성 **없음** · Guide shell 변경 **없음** ·
새 route 추가 **없음** · backend 변경 **없음** · DB migration **없음**.
KPA 프론트 문구 변경이 포함되므로 `web-kpa-society` 는 CI detect-changes 로 자동 배포된다.

---

## 12. 최종 closure 근거 (§9)

```text
A형 실제 필수 Guide gap = 0   (GUIDE_REQUIRED 0)
VIEW_DUPLICATED        = 0
MUST_FIX_BEFORE_CLOSE  = 0
stale / dead / orphan  = 0

GUIDE_COMMONIZATION = COMPLETE
```

Guide 공통화 트랙은 5 서비스 전체에서 **shared Guide 체계로 수렴**했고(FULLY_COMMON 85 / CORE_ONLY 0 /
VIEW_DUPLICATED 0), Guide navigation 의 stale·dead·orphan 은 0 이며, 남은 미구현 Guide 는
**별도 Guide 가 실제 사용자 이해에 필요하지 않은 항목**(GUIDE_OPTIONAL · OUT_OF_SCOPE_FOR_GUIDE ·
기능 부재 B형)뿐이다. `GUIDE_OPTIONAL` 기능에 Guide 가 없다는 이유로 완료를 막지 않는다(§9).

### 후속 backlog (blocker 아님)

- INLINE_UX_GAP 3 — shared `ForeignVisitorSalesSupportPanel` active 상태 문구의 서비스별 분기
  (Shared Module Change Protocol 대상)
- K-Cosmetics · GlycoPharm 외국인 여행객 판매지원 본체 도입 시 Guide 필요성 재판정
- 직전 CHECK 의 ACCEPTED_RESIDUAL 12~14 (KPA 매장 운영 매뉴얼 copy 보강)

---

## 13. 문서 정합 (CLAUDE.md §16)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

직전 CHECK(`CHECK-O4O-GUIDE-CROSSSERVICE-FINAL-CLOSURE-AUDIT-V1`)는 기록물이므로 소급 수정하지 않았다(§6).
본 문서가 그 판정을 대체하는 최신 기준이다.
