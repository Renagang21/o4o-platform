# CHECK-O4O-OTC-FEXOFENADINE-120MG-REHARVEST-CLOSEOUT-NA-V1

WO: **WO-O4O-OTC-FEXOFENADINE-120MG-REHARVEST-AND-CLOSEOUT-NA-V1** (에이전트 나)
범위: 펙소페나딘염산염 120mg 정 한정. **production DB write 0 · apply 0 · 기존 LIVE 34 미접촉.**
DB 채널: 공유 proxy(5433) 장애 → 전용 Cloud SQL Auth Proxy(127.0.0.1:5434) read-only 사용·종료.
최종 판정: **REVIEW_LATER (HOLD)** — 조건부 생산 게이트 미충족, production write 0.

---

## 0. 핵심 결과 (수치)

| 항목 | 값 |
|---|---|
| 재수확 coarse 모집단(120mg 정) | 63 |
| 기존 LIVE(authored ko+en canonical, ref `0807d871…`) | **34** (미접촉) |
| 신규 검토 target(coarse full-fp `078e29…`) | 14 |
| └ 그 중 authored그대로확장(안전) | 5 |
| └ 그 중 **안전지문불일치(제품별 안전정보 차이)** | **9** |
| coarse 동일·full-fp 상이(easy content variant) | 15 |
| full-content fingerprint 종류(bridge) | 6 |
| 실제 production write | **0** |
| 기존 LIVE drift | 0 (write 없음) |
| canonicalDup | N/A (write 없음) |

---

## 1. 불일치 원인 규명 → **CONTENT_VARIANT** (+ 부수 IDENTIFIER_LINK 제약)

과거 `bridge_n=5` ≠ 현재 easy target 14 의 원인은 단순 모집단 확장이 아니라 **안전지문불일치**다.
bridge SSOT 의 full-fp `078e29228e12cc30`(size 14) 는 자체적으로 `authored그대로확장: 5` + `안전지문불일치: 9` 로 세분류돼 있다.
즉 full-content fp 는 같아도 **9건은 제품별 안전정보(주의/금기 등)가 상이**하여 동일 authored 본문을 그대로 적용할 수 없다.
따라서 진짜 "그대로확장" 안전 집합은 최대 5이며, 14 는 안전 균질 집합이 아니다.

부수적으로, 기존 LIVE 34 의 `mfds_easy_drug` 원문 row 가 DB에 부재(with_easy_any=0, deprecated 아님·삭제됨)하여
**기존 LIVE 34 의 grounding fingerprint 를 재현·대조할 수 없다** → "기존 LIVE 34와 fingerprint/원문 동일" 게이트 검증 불가.

## 2. 생산 게이트 판정 (§4) — 미충족

| 게이트 | 결과 |
|---|---|
| 기존 LIVE 34와 full-content fingerprint 동일 | ✗ 검증 불가(LIVE easy 원문 부재) |
| 성분·함량·제형·경로 동일 | ✓ (전원 펙소페나딘염산염·120밀리그램·정·oral) |
| 효능·용법·금기·주의 동일 | ✗ (안전지문불일치 9) |
| other = 0 | ✗ (안전지문불일치 9 + full-fp 상이 15) |
| 기존 LIVE EN builder byte-identical 재사용 | 검증 불가(대상 안전 이질) |
| target 14 재현·안전 균질 | ✗ (안전 집합 ≤5) |

LIVE 34 자체는 내부 정합(ko md5 kinds=1 · en md5 kinds=1 · source_ref 단일 `0807d871…`) — **변경 대상 아님, 미접촉.**

## 3. HOLD 근거 (§5, 하나라도면 write 0)

- **fingerprint 종류 ≥2**: coarse 6종, target-fp 내 안전 5 / 불일치 9.
- **제품별 안전정보 차이**: 안전지문불일치 9.
- **기존 LIVE와 원문 차이 검증 불가**: LIVE 34 easy 원문 부재.
- **target 14 재현 실패**: 안전 균질 target ≠ 14.
→ 신규 의료 판단 필요. 자동 완결 불가.

## 4. 판정 · 후속

- **REVIEW_LATER (HOLD).** production write 0. 기존 LIVE 34 drift 0.
- 후속(별도 WO): (a) 안전지문 기준으로 5(안전확장) vs 9(안전이질) 분리, (b) LIVE 34 의 원 grounding 원문 복원/대조(easy 원문 부재 원인 규명), (c) 안전 5건만 별도 검증 후 생산 여부 판단. **본 WO 범위(자동 완결)에서는 진행하지 않음.**

## 5. 산출물

- CHECK(본 문서) + 감사 스크립트 `apps/api-server/src/scripts/otc-fexofenadine-120mg-reharvest-audit.ts` + detail JSON `apps/api-server/src/scripts/data/otc-fexofenadine-120mg-reharvest-v1.json`.
- read-only. 공유 proxy 미접촉 · 5434 전용 proxy. 가·다/HFF/pnpm-lock 미접촉. 기존 LIVE 34 미접촉.
