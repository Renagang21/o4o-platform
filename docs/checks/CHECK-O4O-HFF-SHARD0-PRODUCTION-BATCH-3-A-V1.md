# CHECK — HFF shard 0 자동 완결형 생산 Batch 3 (Agent A)

- 기준 commit: `cf95b9d5c`(select 직접주입 + mga-TE 파서 gap 보강). 실행 HEAD `48bf1aa9a`.
- 성격: shard 0 전용 · `--exclude-taken` · `--statement-nos-file` 직접주입 · **자동 apply**(게이트 통과 시 무프롬프트) · 독립검증.

## 1. 시각·기준선(실측)

| 항목 | 값 |
|------|----|
| 시작 | 2026-07-22 05:40:42Z |
| 종료 | 06:11:21Z (≈31분) |
| 시작 totalComboLive(실측, 새 연결) | ~2,491 |
| 종료 totalComboLive | ~2,782 (내 기여 +82, 나머지 동시 세션) |

## 2. shard 계획

- `hff-combo-shard-plan --shard 0 --shard-count 3`(FNV-1a): **326 signature · 후보합 924**. shard 교집합 0(선행 all-shards 검증).

## 3. 자동생산 결과 (326 signature 전량 처리)

| 결과 | 수 |
|------|:-:|
| **APPLIED(자동)** | **16그룹 / 82건** |
| DROP(elig<4) | 277 |
| SELECT_FAIL(미지원 원료) | 32 (몰리브덴·요오드 등 미등록 원료 포함 대형 종합비타민 → 안전 skip) |
| GATE_FAIL / APPLY_FAIL | 0 / 0 |
| REVIEW_LATER(BLOCKED) | 0 |

### 생산 16그룹 (그룹별 수)
```
비타민C+비타민E 9 · 나이아신+비오틴+A+B1+B12+B2+B6+C+D+E+K+엽산+판토텐산 6 · 나이아신+망간+A+B12+B6+C+D+아연+판토텐산 6 · A+B1+B2+B6+C+D+E 6
나이아신+망간+비오틴+A+B1+B12+B2+B6+C+D+E+셀레늄+아연+엽산+판토텐산 5 · 비타민B1+비타민B2 5 · 마그네슘+아연 5 · 비타민E+셀레늄 5 · 마그네슘+B1+B6 5 · 비오틴+B12 5 · 비타민C+비타민E+아연 5
비타민B12+비타민D+엽산 4 · 비타민B6+엽산 4 · 망간+비타민D+아연+칼슘 4 · 망간+비타민D+비타민K 4 · A+B2+C+D+E 4
```
- **mga-TE 파서 보강 효과**: 비타민E 조합(vc-ve 9·ve-se 5·vc-ve-zn 5·다수 종합비타민)이 다수 해금 → shard 1(7)보다 개선.
- **자동 apply 게이트**(전부 충족): dry-run postVerifyPass · canonicalDup 0 · 예상write=target×4 · rollback manifest · master/candidate/source_ref 정상. **GATE_FAIL 0**.

## 4. 독립 사후검증 (새 연결, read-only)

| 항목 | 실측 |
|------|:-:|
| s0-* masters | **82** |
| STORE canonical SPD | **164** (ko 82 / en 82) |
| canonicalDup | **0** |
| candidate links(approved_new_master) | **82** |
| 총 write | 328 (82×4) · 기존 LIVE drift 0 |

## 5. 보고 요약

```text
시작 05:40:42Z · 종료 06:11:21Z (≈31분)
조사 signature: shard0 326 (교집합 0)
READY 82 · REVIEW_LATER 0 · DROP 277 · SELECT_FAIL 32 · GATE/APPLY_FAIL 0
그룹 16 · KO 설명서 82 · EN 설명서 82 · KO/EN 디자인 각 82
DB write 328 · canonicalDup 0 · 기존 LIVE drift 0
totalComboLive ~2,491 → ~2,782 (내 기여 +82)
시간당 처리량(생산) ≈ 160건/시간 · (스캔) 326 signature/~31분
rollback manifest 16 (shard0-batch/manifests)
독립 사후검증 PASS
```

- **목표 500~900 대비 실적 82**: shard 0 미승격 producible 이 사실상 고갈(우량 기생산 2,491+). `--exclude-taken` 후 잔여 대부분 grounding/identity HOLD(예 vd-zn 264·vc-zn 25 → ELIGIBLE 0). mga-TE 복구로 비타민E 조합만 추가 해금. 무리한 apply 없이 게이트 통과분만 안전 커밋. 전체 중지 조건 해당 없음.

*자동 apply 는 사전승인 반복생산 원칙. 사후검증 read-only. 미지원 원료 registry 확장은 별도 트랙.*
