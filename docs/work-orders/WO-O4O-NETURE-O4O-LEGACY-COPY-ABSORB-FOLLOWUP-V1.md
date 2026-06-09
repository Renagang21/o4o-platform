# WO-O4O-NETURE-O4O-LEGACY-COPY-ABSORB-FOLLOWUP-V1 (후속 기록)

> **Type:** Follow-up record (흡수 후보 기록 — 즉시 구현 아님)
> **Date:** 2026-06-09
> **선행:** `WO-O4O-NETURE-O4O-LEGACY-PAGE-DELETE-V1` (커밋에서 `/o4o` 레거시 페이지 트리 삭제)
> **기준 IR:** `docs/investigations/IR-O4O-NETURE-O4O-LEGACY-PAGE-DEPRECATION-AUDIT-V1.md`

---

## 1. 배경

`WO-O4O-NETURE-O4O-LEGACY-PAGE-DELETE-V1` 에서 `/o4o` 레거시 페이지 트리를 삭제했다.
삭제 기준(사용자 확정): **코어 삭제 + targets/site-operator 는 내용 확인 후, 현재 Guide 에
쓸 유효 문안이 있으면 흡수하거나 어디에 흡수할지 기록한 뒤 삭제. 흡수 범위가 크면 삭제를
보류하지 말고 본 후속 기록으로 남긴다.**

targets(5 업종) + site-operator 는 **B2B 사업자 유치용 영업 랜딩**이라 분량이 크고,
로그인 사용자용 Guide 와 성격이 달라 즉시 흡수 범위가 크다. 따라서 본 문서로 흡수 후보를
기록하고 legacy page/route 는 선행 WO 에서 삭제했다.

> 삭제된 원본 카피는 git 히스토리에 보존됨 (삭제 직전 커밋 부모 = `0cae5c7b2` 이후).
> 복원 필요 시 `git show <commit>^:services/web-neture/src/pages/o4o/...` 로 원문 확인.

---

## 2. 삭제된 페이지와 흡수 후보

| 삭제된 legacy page | 원본 경로 | 고유 문안/구조 | 흡수 후보 위치 | 비고 |
|--------------------|-----------|----------------|----------------|------|
| `O4OMainPage` | `/o4o` | O4O 개념·시장 문제·5개 서비스·**운영 원칙 4가지**(매장 실행 중심 / 역할 분리 / 콘텐츠-실행 연결 / AI 보조)·결과 | `/guide/o4o-overview`, `/guide/intro` | 운영 원칙 4문장은 Guide 핵심 개념과 상호 보강 가치. 나머지는 Guide 와 ~40% 중복 |
| `O4OApplyPage` + `ApplyForm` | `/o4o/apply` | 사업 문의 폼(누가/검토 내용/진행 방식 카피) | — (`/contact` 로 대체) | 기능은 `/contact` 가 대체. 카피는 흡수 불요 |
| `SiteOperatorPage` | `/o4o/site-operator` | **기존 사이트 운영자(Cafe24/SaaS) 연결** 안내 — 기존 사이트에 O4O 서비스 연결 활용 | (신규) Business Guide 또는 `/guide` 운영자 영역 | 고유 진입 시나리오. 현 Guide 에 동등 카피 없음 |
| `PharmacyTargetPage` | `/o4o/targets/pharmacy` | 약국 대상 사업자 영업 카피 + 채널 활용(흡수분) | 업종별/사업자별 Guide (미구현) | 업종 맞춤 영업 카피 |
| `ClinicTargetPage` | `/o4o/targets/clinic` | 의료기관 대상 카피 | 〃 | 〃 |
| `DentalTargetPage` | `/o4o/targets/dental` | 치과 대상 카피 | 〃 | 〃 |
| `OpticalTargetPage` | `/o4o/targets/optical` | 안경원 대상 카피 | 〃 | 〃 |
| `SalonTargetPage` | `/o4o/targets/salon` | 미용 대상 카피 | 〃 | 〃 |
| `AboutPage` | (unrouted) | `/o4o/*` 링크 허브(고유 콘텐츠 없음) | — | 고아 dead 페이지, 흡수 불요 |

---

## 3. 권장 후속 작업 (선택, 미착수)

1. **운영 원칙 4문장 흡수** — `O4OMainPage` 의 운영 원칙 4가지를 `netureGuideO4OOverviewProps`
   핵심 개념 섹션에 상호 보강 형태로 반영(소규모, 안전). → `WO-O4O-NETURE-GUIDE-O4O-PRINCIPLES-MERGE-V1` 후보.
2. **사이트 운영자 시나리오** — 기존 사이트 연결(Cafe24/SaaS) 안내를 Business/운영자 Guide 에
   별도 항목으로 신설할지 판단. → 사업 방향 확정 후 별도 WO.
3. **업종별 영업 카피** — 약국/의료/치과/안경원/미용 영업 랜딩 카피가 다시 필요하면, 공개 영업
   페이지(별도 도메인/마케팅 영역)로 재설계. 로그인 Guide 로 흡수보다 **공개 마케팅 페이지 재정의**가
   적합. → 마케팅 요구 발생 시 별도 WO.

> 본 후속들은 사업 방향·마케팅 요구가 확정될 때 착수한다. 현재는 삭제 우선 원칙에 따라
> legacy 는 제거하고 본 기록으로 추적성만 확보한다.

---

*Generated: 2026-06-09 · 흡수 후보 기록 · 원본 카피는 git 히스토리 보존*
