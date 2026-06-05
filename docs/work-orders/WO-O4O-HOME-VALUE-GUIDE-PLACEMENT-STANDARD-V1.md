# WO-O4O-HOME-VALUE-GUIDE-PLACEMENT-STANDARD-V1

> O4O Home 의 **역할/시작 카드(valueGuideSlot) 배치 표준**을 확정한다: 기본 = **`before-app-entry`** (역할/시작 카드가 이용 가이드보다 **먼저**). KPA 의 현재 `after-help` 정렬 여부를 결정 항목으로 명시한다.
> **본 문서는 정책 WO(문서)이며, 코드 착수는 별도 지시 후 진행한다.**

- **작성일**: 2026-06-04
- **상태**: 정책 WO 작성 완료 / **코드 착수 대기**
- **선행 IR**: [`IR-O4O-HOME-STANDARD-TEMPLATE-CROSSSERVICE-AUDIT-V1`](../investigations/IR-O4O-HOME-STANDARD-TEMPLATE-CROSSSERVICE-AUDIT-V1.md) (`a04d73ba4`) §5/§12-2
- **관련 최근 커밋**: `1f68218a5` WO-O4O-KPA-HOME-VALUE-CARDS-AFTER-GUIDE-V1 (KPA 를 after-help 로 이동)

---

## 1. 기본 표준 (확정)

**Home 의 역할/시작 카드는 이용 가이드보다 먼저 보인다.**

```text
Home 기본 흐름:
  Hero
  → 주요 최신 정보 / 공지 / 커뮤니티
  → 역할 / 시작 카드 (valueGuideSlot)
  → 이용 가이드 (help)
  → 기타 보조 섹션
```

- `StandardHomeTemplate` 의 `valueGuidePlacement` **기본값 = `before-app-entry`** (이미 템플릿 default — `StandardHomeTemplate.tsx:98`). 본 표준은 이 기본을 **O4O Home 정책으로 명문화**한다.

**근거:**
- 사용자는 Home 진입 시 "이 서비스에서 **나는 어디로 들어가야 하는가**(어떤 역할로 시작)"를 먼저 판단해야 한다.
- 이용 가이드는 **역할 선택 이후의 상세 안내**로 보는 것이 자연스럽다.
- O4O 는 서비스별 역할(공급자/파트너/약국 경영자/매장 경영자/운영자)이 핵심 구조 → 역할/시작 카드가 **Home 초반 안내 기능**을 해야 한다.

---

## 2. 현재 차이 (실측)

| 서비스 | valueGuideSlot | valueGuidePlacement | 위치 | 표준 정합 |
|--------|:--------------:|---------------------|------|:--------:|
| **Neture** | ✅ (공급자/MT/파트너) | (미지정 → 기본) `before-app-entry` | 가이드 **위** | ✅ 표준 |
| **KPA** | ✅ (3 역할) | **`after-help`** (명시 override, `CommunityHomePage.tsx:261`) | 가이드 **아래** | ❌ 표준 이탈 |
| GlycoPharm | ❌ 없음 | — | (역할 카드 미사용) | N/A |
| K-Cosmetics | ❌ 없음 | — | (역할 카드 미사용) | N/A |

- 표준(before-app-entry)은 **이미 템플릿 기본값**이며 Neture 가 따른다.
- **KPA 만 명시적으로 `after-help` 로 덮어씀** (최근 `1f68218a5`). 즉 표준 정렬 = KPA 의 override 제거/변경(1줄).
- Glyco/KCos 는 역할 카드 자체가 없으므로 본 표준 영향 없음(**강제 도입 금지**).

---

## 3. 정책 판단

### 3.1 기본 = `before-app-entry` 통일
4서비스 중 역할 카드를 쓰는 KPA·Neture 의 Home 흐름을 **before-app-entry 로 통일**한다.

### 3.2 KPA `after-help` 처리 — **결정 항목**
KPA 는 최근 `1f68218a5`(WO-O4O-KPA-HOME-VALUE-CARDS-AFTER-GUIDE-V1)로 의도적으로 `after-help` 가 되었다. 그 WO 의 논리는 "KPA 역할 카드를 **역할별 이용 안내** 성격으로 보아 가이드 **뒤**에 배치". 본 표준은 "역할 카드 = **시작 진입**" 으로 보아 가이드 **앞**을 권장한다 → **두 해석이 충돌**.

| 옵션 | 내용 | 영향 |
|------|------|------|
| **(권장) A. KPA 도 before-app-entry 로 정렬** | `CommunityHomePage.tsx:261` `valueGuidePlacement` 제거 또는 `before-app-entry` 로 변경 | `1f68218a5` 의 KPA placement 결정을 **표준에 맞춰 되돌림**. 4서비스 흐름 통일 |
| B. KPA 만 `after-help` 예외 유지 | 변경 없음 | KPA 만 흐름 상이. **예외 사유를 문서에 명문화 필수** (커뮤니티/콘텐츠 중심 + 역할 카드=이용 안내 성격) |

> **권장: A.** 현재는 예외보다 4서비스 기본 흐름 통일이 낫다. 단 A 는 최근 WO(`1f68218a5`)를 되돌리는 판단이므로, 코드 착수 전 **본 표준 승인으로 그 되돌림을 정당화**한다.

---

## 4. 제외 범위 (본 정책 WO 단계)

```text
- 코드 수정 금지 (문서만)
- Home 구조 대규모 개편 금지
- HeroBannerSection.tsx — 미접촉
- StandardHomeTemplate.tsx — 정책 문서 단계에서 미수정 (기본값이 이미 before-app-entry라 변경 불필요)
- Market Trial CTA 아이콘 작업(dcc4b55a9)과 섞지 않음
- 외부 세션 WIP(store-asset 등) — 미접촉
- Glyco/KCos 에 역할 카드 강제 도입 금지
```

---

## 5. 후속 코드 작업 기준 (별도 WO/지시)

정책 승인(옵션 A) 후 코드 단계:

```text
대상: services/web-kpa-society/src/pages/CommunityHomePage.tsx (valueGuidePlacement 1줄)
변경: valueGuidePlacement="after-help" 제거(→ 기본 before-app-entry) 또는 ="before-app-entry"
불변: valueGuideSlot 내용 / 문구 / 링크 / 역할 카드 구성 / 다른 섹션 / help 내용
주의:
  - StandardHomeTemplate / HeroBannerSection 미접촉 (placement 는 KPA 페이지에서만 조정)
  - Home 외부 세션 활성 → sync + path-specific staging 필수
검증:
  - web-kpa-society tsc
  - KPA / (회귀 확인용) Neture Home desktop/mobile smoke:
      · KPA Home 역할 카드가 이용 가이드 "위"로 이동했는지
      · Neture 기존 before-app-entry 회귀 없음
      · 섹션 순서 외 회귀 없음(문구/링크/카드 동일)
  - CHECK 문서 작성
```

> 코드 변경은 **placement 최소 1줄**. 문구/링크/섹션 내용은 변경하지 않는다.

---

## 6. Git 기준 (정책 WO 커밋)

```text
- path-specific staging만 (git add . / git commit -am 금지)
- staged 는 본 WO 문서 1개만
- 다른 세션 WIP / HeroBanner / StandardHomeTemplate staged 시 즉시 중단
```
권장 커밋 메시지: `docs: standardize home value-guide placement policy`

---

## 7. 완료 기준

**정책 WO 단계:** 기본 표준(before-app-entry) 명문화 / 현재 차이(KPA after-help) 기록 / KPA 처리 결정 항목(권장 A) 명시 / 후속 코드 기준 포함 / 코드 수정 없음 / staged 1개 / commit·push.

**(후속) 코드 단계:** KPA placement 표준 정렬 / 문구·링크·섹션 불변 / tsc PASS / KPA·Neture smoke PASS / CHECK 작성.

---

*Home value-guide 배치 표준 = before-app-entry. KPA after-help 정렬(권장 A)은 정책 승인 후 별도 코드 단계. 본 문서는 정책 요청서이며 코드 변경을 포함하지 않는다.*
