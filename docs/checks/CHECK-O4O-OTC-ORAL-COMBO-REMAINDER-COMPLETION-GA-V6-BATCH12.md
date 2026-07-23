# CHECK — OTC 경구 복합성분 잔여 완결 GA-V6 batch12 (파일럿 10그룹)

**WO:** WO-O4O-OTC-ORAL-COMBO-REMAINDER-COMPLETION-GA-V6
**에이전트:** 가 (Drug OTC)
**일자:** 2026-07-23
**상태:** PASS — batch12 10그룹 / 95 master KO+EN STORE canonical LIVE, 독립검증 GREEN, 재실행 no-op

---

## 1. 범위 (파일럿)

GA-V5 종료 후 잔여 경구 복합성분(단일 원문·단일 제형·단일 경로) 그룹 중 **상위 안전 in-scope 10그룹**을 파일럿으로 KO+EN 전량 완결. 전체 잔여 규모(§4)에 대한 연속 생산 여부는 본 파일럿 PASS 이후 별도 판단한다.

## 2. 선정 기준

- 잔여 in-scope 후보 풀(pool-regen v5, this-machine 재배선)에서 도출된 708 fp / 2,062 master 중
- **소화효소·제산·담즙 계열(A02AH / A05A / A09A·AA·AC)** 소화불량·위통·속쓰림 복합제 — GA 기존 117 완결 그룹과 동일 ATC 패밀리(알리멘터리)로 민감 계열 아님
- size(마스터 수) 상위 + 단일 제형(정/캡슐) + 단일 경로(oral) + 단일 안전 signature + 단일 source + easy 원문 canonical 정확히 1건인 그룹
- 선정 10그룹 (fp · size): 시알딘정 4218427430774c9c·13 / 리포유정 f994328ac501290b·13 / 베아제정 0d0bb7bea51e5e9a·10 / 세미론정 2ba5b9751a578bd4·10 / 위제로정 ec46f83b056a84b9·10 / 다제스캡슐 0543e8bcca5c2663·8 / 다우제큐정 31a80694d9b40f87·8 / 다이제틴정 43108cb05f7b33b7·8 / 씨메탈시정 a89e74addc957d65·8 / 닥터베아제정 7b6fe68d4df970e9·7. **합 95 master.**

## 3. 43 vs 708 차이 원인

WO 전제의 "잔여 43"은 **GA-V5 batch11 시점의 stale 스냅샷**(당시 select-gate 잔여 53 − batch11 10 = 43)이었다. this-machine 에서 현재 프로덕션 대상 pool-regen 을 재실행한 결과, 완결 117 그룹을 authSet(`source_type<>'mfds_easy_drug'`)·`pending===size` 필터로 자동 배제하고 남은 **실제 in-scope 잔여 = 708 fp / 2,062 master**로 확정. 43은 특정 배치 사이클의 잔량이었고, 전수 sweep 기준 잔여는 그보다 훨씬 크다(HFF combo-b 에서 관찰된 "census select-gate ≠ 전수 sweep"와 동일한 구조).

## 4. 708 잔여 규모 (READY / 제외 / HOLD)

- **총 708 fp / 2,062 master** (pool-regen v5, candidate 필터: size≥3·비-단일성분·정/캡슐/연질캡슐·단일 safety·단일 source·단일 form·단일 route·pending===size)
- 본 파일럿에서 상위 10그룹(95 master)을 READY 로 확정·LIVE. **잔여 698 fp / ~1,967 master**는 동일 파이프로 생산 가능성이 높으나 **그룹별 easy 원문 유효성(효능·용법·주의 존재)·제형/경로 혼입·safety 단일성 미검증** 상태 → 연속 생산 착수 전 배치별 dry-run 게이트 필요.
- 제외/HOLD 세부 분류(제형 혼입·multi-source·grounding 부재)는 파일럿 PASS 승인 후 전수 재조사에서 산출한다.

## 5. 생산 파이프 (기존 무변경 + 신규 경로 사본)

- **KO:** `otc-combo-ko-compose.ga.v6.mjs` — 원본 `otc-combo-ko-compose.ga.mjs`의 **경로 상수만** this-machine 으로 정리한 사본(compose/soften/easySections 의료 로직 byte-identical, 신규 의료 사실 생성 없음). easy_drug 공식 원문 → content_json 충실 재구성.
- **EN:** `otc-oral-combo-leaflet-en-batch12.ga.json` 로 직접 저작 후 config 각 그룹 `en` 블록에 병합. 수치·성분 보존, 한글 렌더 필드 0, summaryTable 3축(Category/How it works/Main symptoms).
- **runner·검증·apply 계약 무변경:** `otc-oral-combo-store-leaflet-runner.ga.ts` 재사용(이중게이트 `--apply` + `OTC_COMBO_LEAFLET_{KO,EN}_CONFIRM=YES`).

## 6. 실행 결과

| 단계 | 결과 |
|------|------|
| KO dry-run ×10 | 전부 PASS · 이상 0 · writePlan authoredConflict 0 |
| KO apply ×10 | 전부 APPLIED · 이상 0 |
| KO 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 · STEP_A INSERT 0 |
| EN dry-run ×10 | 전부 PASS · 이상 0 |
| EN apply ×10 | 전부 APPLIED · 이상 0 |
| EN 재실행(no-op) | 전부 ALREADY_COMPLETE · dbWrite 0 |

## 7. 독립 검증 (runner 밖 직접 DB 쿼리, 95 master)

| 항목 | 값 | 판정 |
|------|----|----|
| 대상 distinct master | 95 | — |
| KO authored canonical STORE | 95 | OK |
| EN canonical STORE | 95 | OK |
| canonicalDup (master/type/lang) | 0 | OK |
| easy 원문 잔여 canonical | 0 | OK (전량 deprecated) |
| target 밖 drift (내 fp 앵커가 비-대상 master 접촉) | 0 | OK |
| 내 fp 앵커 canonical (ko/en) | 95 / 95 | OK |
| per-group ko==en==expected | ALL OK | OK |

**write 계약:** KO 4T(authored INSERT + easy demote + authored flip + audit) + EN 2T = master당 6T. easy canonical → status deprecated, authored KO/EN → 별도 canonical INSERT. source_ref_id = fpToUuid(targetFp) 결정적 앵커.

## 8. 중지 조건 점검

첫 10그룹 공통 분류 오류 0 / source·fingerprint 불일치 0 / 예상 밖 경로·제형 혼입 0 / writePlan≠writeActual 0 / canonicalDup 0 / target 밖 drift 0 → **중지 조건 미발동, 파일럿 PASS.**

## 9. 후속

batch12 PASS. 전체 708 fp 연속 생산 여부와 READY/HOLD/제외 규모는 **사용자 판단 대기**.
