# IR-O4O-LMS-HUBTEMPLATE-VISIBILITY-COLUMN-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** 3서비스 `/lms` hub 가 `LmsHubTemplate` 으로 수렴된 현재, 공개/회원제 visibility 표시가 일관되게 동작하는지 조사하고 후속 WO 를 정한다.
> **결과: 판정 A (frontend mapper 보강)** — backend `/lms/courses` 응답에 visibility/requiresApproval/isPaid 가 이미 포함(service-neutral). KPA 만 wrapper 에서 매핑해 배지 표시. **GP·KCos 는 매핑 누락**으로 category fallback. 따라서 backend 변경 불요, **GP/KCos wrapper mapCourse 에 visibility 매핑만 추가**하면 됨.
> **작성일:** 2026-06-13 · 기준 HEAD `d8a5823bf`
> **선행:** `WO-O4O-LMS-KPA-COURSESPAGE-HUBTEMPLATE-ALIGNMENT-V1` · `WO-O4O-LMS-HUBTEMPLATE-SERVICE-ACCENT-V1`

---

## 1. 목적

`/lms` 목록 hub 가 3서비스 모두 `LmsHubTemplate` 로 수렴됐으나 공개/회원제 배지는 KPA 에서만 보인다. visibility 표시의 3서비스 일관성을 조사하고 후속 WO 범위를 확정한다. read-only.

## 2. LmsHubTemplate visibility 처리 방식

- `LmsHubCourse.visibility?: 'public' | 'members'` (+ `requiresApproval?`, `isPaid?`) — optional.
- "유형" 컬럼 render: **`row.visibility` 지정 시** 공개/회원제(+승인필요/유료) 배지, **미지정 시 `category` 배지 fallback**(backward-compatible).
- 즉 템플릿은 이미 visibility-aware. 표시 여부는 **각 서비스 wrapper 가 visibility 를 매핑하는지**에 달림.

## 3. 서비스별 visibility 매핑 상태

| 서비스 | wrapper mapCourse 가 visibility 매핑? | 목록 표시 | 비고 |
|---|:---:|---|---|
| **KPA** | ✅ `visibility: c.visibility === 'public' ? 'public' : 'members'` (+requiresApproval/isPaid) | 공개/회원제 배지 | KPA `Course` 타입에 visibility 선언됨 |
| **GlycoPharm** | ❌ `mapCourse` 가 visibility 미매핑 | category fallback | 리스트 `LmsCourse` 타입엔 visibility 없음(detail 타입엔 있음) |
| **K-Cosmetics** | ❌ `mapCourse` 가 visibility 미매핑 | category fallback | `LmsCourse` 타입에 visibility/requiresApproval/isPaid 미선언 |

## 4. API 응답 / adapter 차이

- **backend `Course` 엔티티**(`interactive-content-core/Course.ts`): `visibility`(varchar, default `MEMBERS`), `requiresApproval`(boolean), `isPaid`(boolean) **모두 보유**. `/lms/courses` 는 service-neutral 단일 endpoint → **3서비스 응답에 동일하게 포함**.
- **근거:** KPA 가 같은 endpoint 응답에서 visibility 를 읽어 배지를 표시(정상 동작) → 응답에 visibility 가 실제로 존재함을 실증.
- **차이는 frontend adapter 뿐:** GP/KCos 의 리스트 `LmsCourse` 타입이 visibility 를 선언/매핑하지 않아 `mapCourse` 가 누락. 응답 JSON 에는 값이 있으나 매핑 단계에서 버려짐.

## 5. category fallback 동작

- `LmsHubCourse.visibility` 미지정 → 유형 컬럼이 `category` 텍스트 배지. GP/KCos 현재 이 경로.
- fallback 자체는 **backward-compatible 설계**(의도된 안전망)지만, GP/KCos 에서 **공개/회원제 구분 미노출**이라는 비대칭을 만든다. category 와 visibility 는 별개 축이므로 fallback 이 visibility 를 대체하지 못함.

## 6. requiresApproval / isPaid 충돌 여부

- visibility 배지(공개/회원제) + 보조 배지(승인필요/유료)는 KPA 에서 함께 정상 렌더(템플릿 §2 구조). 충돌 없음. GP/KCos 도 매핑만 추가하면 동일 동작.

## 7. 판정 및 권장 후속 WO

**판정: A — frontend mapper 보강.**
- backend/API 응답에 visibility 가 이미 존재(§4) → **backend·DB·API 계약 변경 불요**(B 아님).
- KCos 정책상 공개/회원제 구분을 숨길 이유 없음(KPA 와 동일 도메인) → C(fallback 유지) 아님.
- KCos 는 `LmsCourse` 타입에 visibility/requiresApproval/isPaid 추가 + `mapCourse` 매핑. GP 는 `mapCourse` 매핑 추가(필요 시 리스트 타입에 visibility 보강).

**권장 후속 WO:** `WO-O4O-LMS-KCOSMETICS-HUB-VISIBILITY-MAPPING-V1`
- 1차: KCos `EducationPage` mapCourse 에 visibility 매핑(+ `LmsCourse` 타입 필드 추가).
- 함께: GlycoPharm `EducationPage` mapCourse 도 동일 보강(GP 도 현재 미매핑) — **단일 WO 로 GP+KCos 동시 정렬 권장**(KPA 는 이미 완료). WO 명을 `WO-O4O-LMS-GPKCOS-HUB-VISIBILITY-MAPPING-V1` 로 일반화 가능.
- 주의: visibility 값은 응답 JSON 에 string 으로 존재 → `'public' | 'members'` 로 normalize(KPA 패턴: `=== 'public' ? 'public' : 'members'`).

## 8. Neture 제외 확인

- Neture 는 LMS 대상 아님 — `/lms` hub·`LmsHubTemplate` 소비 없음(이전 `CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`). 본 IR 도 Neture 미수정·미조사 대상.

## 9. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-LMS-HUBTEMPLATE-VISIBILITY-COLUMN-V1.md`)
- [x] 코드/package/lock/Dockerfile/backend 변경 없음 (read-only)
- [x] LmsHubTemplate visibility-aware 컬럼 확인 (§2)
- [x] KPA(매핑됨)/GP(미매핑)/KCos(미매핑) 상태 (§3)
- [x] backend Course 에 visibility/requiresApproval/isPaid 존재 → 응답 포함 확인 (§4)
- [x] 판정 A + 후속 WO (§7), Neture 제외 (§8)

---

*End of IR-O4O-LMS-HUBTEMPLATE-VISIBILITY-COLUMN-V1*
