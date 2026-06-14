# CHECK-O4O-OPERATOR-DASHBOARD-AXIS-ICON-LIVE-SMOKE-V1

> WO-O4O-OPERATOR-DASHBOARD-AXIS-ICON-CONTRACT-LUCIDE-V1 후속 live smoke
> 목적: 4개 서비스 Operator Dashboard 축 아이콘이 emoji가 아닌 lucide icon으로 정상 표시되는지 배포 환경에서 확인한다.
> 실행: 2026-06-14 · Playwright MCP · 계정 `sohae2100@gmail.com`(operator-or-above)

## 1. 배경

`WO-O4O-OPERATOR-DASHBOARD-AXIS-ICON-CONTRACT-LUCIDE-V1`에서 `OperatorAxisGroup.icon: string` 계약은 유지하면서, `AxisNavigationSection` 렌더러에 name-map 기반 lucide icon 해석을 추가했다.

* `icon: '🏪'` 등 emoji raw 렌더 → `icon: 'store'` 등 lucide-name string 전환
* core 렌더러(`AxisIcon`)에서 name → lucide component 매핑
* 미전환 emoji는 fallback 유지(하위호환) / ASCII 미매핑은 생략

## 2. 대상 커밋

* 구현 commit: `838e0cf26`
* 선행 commit: `474cabffa` — K-Cosmetics service-local emoji icon cleanup
* 배포: Deploy Web (run 27495824285) — 4개 서비스 전부 success(공유 패키지 변경 감지 전체 재배포)

## 3. 확인 대상 / 실제 URL

| 서비스 | 경로 | 실 도메인 | 진입 |
|--------|------|-----------|------|
| KPA Society | `/operator` | kpa-society.co.kr | login→/operator |
| GlycoPharm | `/operator` | **미확인** (www.glycopharm.co.kr = SiteGuide 서빙) | ⚠️ |
| K-Cosmetics | `/operator` | k-cosmetics.site | login→/operator |
| Neture | `/operator` | neture.co.kr | login→/admin→/operator |

## 4. 기대 결과

각 축 카드에서: ① emoji가 아닌 lucide icon 표시 ② 레이아웃 무회귀 ③ title/description 동일 ④ link/route 동일 동작 ⑤ 콘솔 오류 없음.

## 5. 서비스별 Smoke 결과

> 판정 근거: 접근성 트리에서 축 카드 title 앞 요소가 emoji 텍스트가 아닌 `img`(lucide svg)로 렌더되는지 + 카드 links/route 보존 확인. K-Cos는 스크린샷 시각 확인 병행.

### 5.1 KPA Society `/operator`

| 항목 | 결과 |
| ---- | ---- |
| 페이지 진입 | PASS |
| 커뮤니티 운영 icon | PASS (MessageSquare svg, ←💬) |
| 매장 HUB 운영 icon | PASS (Store svg, ←🏪) |
| emoji 노출 여부 | 축 카드 emoji 0 |
| 카드 정렬 | PASS (metrics 3 + links 3 보존) |
| CTA/route 동작 | PASS (/operator/forum·members·lms 등 보존) |
| 콘솔 오류 | 무관 오류 3건(기존, 아이콘과 무관) |

메모: 축 카드는 정상. KPA 헤더/로그인 페이지 자체 emoji(💊🏛️🧪)는 본 WO 범위 외(별도 KPA emoji 정비 영역).

### 5.2 GlycoPharm `/operator`

| 항목 | 결과 |
| ---- | ---- |
| 페이지 진입 | ⚠️ 보류 |
| 커뮤니티 운영 icon | 미확인 |
| 약국 HUB 운영 icon | 미확인 |
| emoji 노출 여부 | 미확인 |

메모: `https://www.glycopharm.co.kr` 가 **SiteGuide**(다른 제품, "SiteGuide is powered by O4O Platform") 랜딩을 서빙 → GlycoPharm operator 앱 실 URL 미확인. 정적/배포 검증은 완료(`glycopharm-web` deploy success, tsc PASS, 전환값 `message-square`/`building-2`). 실 URL 확인 후 live 보완 필요.

### 5.3 K-Cosmetics `/operator`

| 항목 | 결과 |
| ---- | ---- |
| 페이지 진입 | PASS |
| 매장 HUB 운영 icon | PASS (Store svg, ←🏪) |
| 콘텐츠 운영 icon | PASS (ClipboardList svg, ←📋) |
| emoji 노출 여부 | 축 카드 emoji 0 |
| 카드 정렬 | PASS (스크린샷 시각 확인 — emerald/blue tone, links 4+4) |
| CTA/route 동작 | PASS |
| 콘솔 오류 | 무관(아이콘과 무관) |

메모: 스크린샷 시각 확인 완료. Store(emerald)·ClipboardList(blue) 정상.

### 5.4 Neture `/operator`

| 항목 | 결과 |
| ---- | ---- |
| 페이지 진입 | PASS |
| 공급·유통 운영 icon | PASS (Package svg, ←📦) |
| 콘텐츠·커뮤니티 운영 icon | PASS (ClipboardList svg, ←📋) |
| emoji 노출 여부 | 축 카드 emoji 0 |
| 카드 정렬 | PASS (links 4+3 보존) |
| CTA/route 동작 | PASS |
| 콘솔 오류 | 무관 |

메모: 축 카드 정상. 단 **Quick Actions 블록**은 여전히 emoji(👥📝🏪📦✅🧪📰🖥️📊) — StructureAction 이지 axis 아님(범위 외, §6 참조).

## 6. 보류/제외 항목

* GlycoPharm live — 실 URL 미확인(SiteGuide 서빙). URL 확인 후 보완.
* `StructureAction`/Quick Action emoji (KPA `'👥'`, Neture Quick Actions 9종) — 축 아이콘 아님. `ADMIN-QUICKACTION-CONVERGE` 영역(core `ActionIcon` name-map 보유).
* 각 서비스 header/footer/login 브랜드 emoji(💊🌿🏛️ 등) — 별도 service-local icon 정비 영역.

## 7. 최종 판정

| 항목 | 결과 |
| ---- | ---- |
| dashboard 진입 | 3/4 PASS (GP 보류) |
| axis icon lucide 표시 | K-Cos·KPA·Neture PASS (6/8 축 = store/clipboard-list/message-square/package 4 name 전부 실증) |
| emoji axis 잔존 | 검증 3개 서비스 축 카드 0 |
| 레이아웃 회귀 | 없음 |
| route/CTA 회귀 | 없음 |
| 콘솔 오류 | 아이콘 관련 0 |

```text
판정: PARTIAL PASS
 - 3/4 서비스(K-Cos·KPA·Neture) live PASS
 - 공유 렌더러(operator-core-ui AxisNavigationSection) 3개 서비스 실증 → 동일 코드패스인 GP도 동작 보장
 - GP 는 실 URL 미확인으로 live 미수행(정적·배포 검증은 완료)
 - building-2(GP 약국 HUB)만 시각 미확인 — 표준 lucide, 위험 낮음
```

## 8. 후속 조치

* GlycoPharm operator 실 URL 확인 → §5.2 live 보완(`message-square`/`building-2` 표시 확인) → 본 CHECK 갱신.
* Quick Action / StructureAction emoji 정비는 `ADMIN-QUICKACTION-FRONTEND-CONVERGE` 영역에서 별도 처리.
