# O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1

> **QR ↔ 구독(entitlement) 2계층 정책 결정 기록.** QR을 만들 때 구독제를 감안할 필요 없이 지금 발급하고, 구독 도입 시 QR 재발급 없이 resolver에 게이트만 얹는다.
> **상태**: Active(결정) · **날짜**: 2026-07-11 · **성격**: 정책/아키텍처 결정 기록. 구현 착수는 별도 WO.
> 관련 Boundary: Store Ops = `organizationId` (F6). 관련 자산: `store_paid_feature_entitlements`(WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1).

---

## 0. 핵심 결정 (한 줄)

**QR은 "안정적 식별자"만 담는다. 구독 판정은 스캔 시점 resolver의 관심사다. → 구독제를 나중에 도입해도 QR(주소·이미지)은 절대 바꾸지 않는다.** 물리 QR 재인쇄가 가장 비싼 작업인데, 이 구조면 그 일이 발생하지 않는다.

---

## 1. QR 2계층

### 1-A. O4O 상품 기본 QR — 공공재 (무료·영구)
- 대상: 모든 `ProductMaster`. 상품당 1개. 상품의 영구 식별 수단.
- 목표 경로: `/r/{productResourceId}` (F12 baseline 목표 — **현재 미구현**, 지금은 store QR 경로 사용).
- 콘텐츠: **O4O 기본 상품 콘텐츠**(canonical 설명서 등). 공급자·매장 소유 아님.
- 정책: 모든 매장/공급자가 사용 가능 · **개별 상품 과금 없음** · 주소 변경/재발급 없음 · 구독 무관 유지.
- = **O4O 공통 인프라(공공재)**.

### 1-B. 사업용 QR — entitlement 연결 (구독)
- 대상: 매장/공급자가 O4O 기능(콘텐츠 제작·태블릿·코너·캠페인·다국어·매장 안내 등)으로 **직접 생성**하는 QR·화면.
- 경로: `/q/{businessSlug}` (사업용 slug).
- 생성 시 자동 연결: `생성 조직 → 콘텐츠 → 서비스 종류 → 사용 범위 → 구독 entitlement`.
  - slug 해석으로 "누가 만든 것"을 알 수 있음(예: `/q/abc123 → 공급업체 A → SUPPLIER_CONTENT → 비타민C 소개 → entitlement 확인 대상=공급업체 A`).
- 구독 상태에 따라 콘텐츠 분기(§3).

---

## 2. 과금 원칙 (중요)

> **QR 생성 개수에 과금하지 않는다.** O4O에서 만든 콘텐츠를 QR·태블릿·매장 화면에 **지속 배포·운영하는 권한을 구독으로** 제공한다. QR은 그 권한을 연결하는 기술적 수단.

- QR 생성 자체 과금 = 금지(여러 QR 미리 발급 후 해지하는 회피 문제 발생).
- 정확한 표현 = **"사업용 콘텐츠를 생성·배포·운영하는 서비스에 구독을 연결한다."**

---

## 3. Resolver 동작 (구독 게이트 + fallback)

```
사업용 QR 스캔 → slug 해석(org·content·service) → 매장/조직 entitlement 1건 조회
  → ACTIVE   → 해당 사업자 콘텐츠 표시
  → EXPIRED/없음 → 사업자 콘텐츠 비표시 → O4O 기본 상품 콘텐츠(또는 안내 화면)로 전환
```

- **URL·QR 이미지는 그대로 유지**, 보여주는 콘텐츠만 구독 상태로 달라짐 → **이미 인쇄된 QR이 깨지지 않음**.
- 기본 상품 QR(1-A)로의 fallback이 있으므로, 사업용 QR도 최소한 상품 기본 콘텐츠는 항상 보여줄 수 있음.

---

## 4. entitlement 모델 (현재 자산 + 일반화)

- **현재**: `store_paid_feature_entitlements` — `(organizationId, serviceKey, planCode)` 유니크, `status ∈ {ACTIVE,EXPIRED,CANCELED}` + `starts_at/ends_at` + `source`, 정적 헬퍼 `isActive(entitlement, now)`. = 미리 계산된 매장 사용권(pre-computed). 정의 플랜 = `FOREIGN_VISITOR_SALES_SUPPORT` 1개.
- **장기 일반화**(도입 시 결정): 공급자·매장 공통을 위해 `organization_feature_entitlements` 로 일반화 고려. 예:

  | 구독 조직 | serviceKey/plan | 권한 |
  |----------|------|------|
  | 행복약국 | STORE_TABLET | 매장 태블릿 운영 |
  | 행복약국 | STORE_BUSINESS_QR | 매장용 QR 콘텐츠 운영 |
  | A공급업체 | SUPPLIER_CONTENT | 공급자 콘텐츠 등록·공개 |
  | A공급업체 | SUPPLIER_TABLET_DISTRIBUTION | 태블릿용 콘텐츠 배포 |

- **기존 테이블 즉시 변경 불필요.** 실제 구독 서비스 도입 시 일반화 여부 결정.

---

## 5. 태블릿 · 공급자 차등 과금

- **태블릿이 구독과 특히 잘 맞음**: 화면 생성 조직·사용 매장·태블릿·화면 세트·콘텐츠가 이미 명시 → 어느 매장에 배포되는지 명확.
- **공급자 차등 과금은 "태블릿 배포"에서**: 공통 상품 QR은 어느 매장 스캔인지 알기 어려워 매장 수 과금에 부적합. 태블릿 콘텐츠는 배포 매장이 명확 → **활성 배포 매장 수** 기준 플랜(Basic 10 / Standard 50 / Business 200 / Enterprise 별도) 가능.
- 초기: 양쪽 동시 과금보다 **서비스별 주 비용부담자**를 정하는 것이 좋음(공급자 구독=콘텐츠 작성·배포 / 매장 구독=태블릿 화면 구성·운영).

---

## 6. 지금 / 나중 (구현 지침)

**지금 (forward-compatible, 최소):**
- QR은 **식별만**(org·product·content) 담아 계속 발급 — 구독 무관. (현행 유지)
- resolver 설계에 **"entitlement→콘텐츠 분기 + 미구독 fallback" 자리**만 논리적으로 확보. 지금은 "구독 없음=전부 통과(매장/사업 콘텐츠 표시)"로 두면 됨.
- **절대 금지**: QR 행에 구독 상태 복사(`qr.subscription_active` 등). 매장/조직당 entitlement 1건만 관리하고 QR 수천 개가 공유.

**나중 (구독 도입 시 — QR 무변경):**
1. 카탈로그에 QR/태블릿 플랜코드 추가(예: `STORE_BUSINESS_QR`, `SUPPLIER_TABLET_DISTRIBUTION`).
2. resolver에 `isActive(entitlement(org, plan))` 체크 1곳 + fallback 분기.
3. (트래픽 큼) entitlement 캐시(Redis, TTL 5~30분) + 상태변경 시 해당 조직 캐시만 무효화. 스캔 로그는 비동기/카운터.
→ **QR 재발급 0 · QR 데이터 마이그레이션 0.**

---

## 7. 현재 상태 (실측, 2026-07-11) · 확인 필요

| 항목 | 상태 |
|------|------|
| entitlement 원시자료 | ✅ `store_paid_feature_entitlements` 존재(org+serviceKey+planCode, ACTIVE/EXPIRED/CANCELED, isActive 헬퍼). 플랜 1개(FOREIGN_VISITOR). |
| QR resolver 게이트 | ⚠️ `/qr/{slug}`(store-qr-landing)은 `qr.is_active`만 확인, **entitlement 미연동**. |
| `/r/{resourceId}` 기본 상품 QR | ⚠️ **미구현**(F12 목표). |
| 공급자 entitlement | ⚠️ 테이블은 organizationId-키(일반적)이나 "Store Ops" 전제 모델링. **공급자(NetureSupplier)↔organizationId 매핑 확인/일반화** = 도입 시 과제. |

---

## 8. 권장 정책 문장 (SSOT)

> O4O ProductMaster에 기본 제공되는 상품 QR은 상품 공통 정보 접근을 위한 영구 QR로서 **무료**로 제공한다.
> 공급자·매장 경영자가 O4O의 콘텐츠 제작·태블릿·코너·캠페인 등 **사업 기능으로 생성하는 QR·화면은 생성 조직과 서비스 사용권(entitlement)에 연결**한다.
> 사업용 콘텐츠는 해당 조직의 **구독이 유효한 동안 제공**하며, **구독 종료 시 QR은 유지하되 O4O 기본 콘텐츠 또는 안내 화면으로 전환**한다.
> 과금은 "QR 생성"이 아니라 **"사업용 콘텐츠를 생성·배포·운영하는 서비스 구독"**에 연결한다.

---

*결정 기록. 구현·일반화(organization_feature_entitlements)·resolver 게이트·플랜 카탈로그 확장은 구독 서비스 도입 WO에서.*
