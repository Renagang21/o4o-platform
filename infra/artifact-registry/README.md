# Artifact Registry Cleanup Policy

`neture-services` (project id `netureyoutube`) 의 모든 Docker repository 에 적용되는 이미지 보존 정책 정본이다.

## 정책

[`cleanup-policy.json`](cleanup-policy.json)

| name | action | 조건 |
|---|---|---|
| `keep-recent-50-versions` | Keep | package 별 최신 50개 version |
| `delete-untagged-older-than-30d` | Delete | untagged + 30일 초과 |
| `delete-any-older-than-30d` | Delete | 30일 초과 |

Artifact Registry 는 **Keep 정책을 Delete 정책보다 우선** 적용한다. 따라서 어떤 version 이 삭제되려면 `30일 초과` **그리고** `package 내 순위 50위 밖` 을 동시에 만족해야 한다. 현재 배포 중인 image 는 항상 package 내 최상위권이므로 정책에 의해 삭제되지 않는다.

## 적용 대상 repository

| repository | location |
|---|---|
| `o4o-api` | asia-northeast3 |
| `cloud-run-source-deploy` | asia-northeast3 |
| `siteguide` | asia-northeast3 |
| `gcr.io` | us |

## 적용 / 확인

```bash
# 적용 (정책 변경 시 4개 repository 모두에 다시 적용한다)
gcloud artifacts repositories set-cleanup-policies o4o-api \
  --location=asia-northeast3 --policy=infra/artifact-registry/cleanup-policy.json

# 확인
gcloud artifacts repositories describe o4o-api \
  --location=asia-northeast3 --format="value(cleanupPolicies,cleanupPolicyDryRun)"
```

`--dry-run` 으로 먼저 검증하려면 `set-cleanup-policies` 에 `--dry-run` 을 붙인다. 실제 삭제 없이 평가 결과만 Cloud Logging 에 기록된다.

> 배경 및 최초 대량 정리 기록: [`docs/checks/WO-O4O-ARTIFACT-REGISTRY-CLEANUP-POLICY-AND-IMAGE-PRUNE-V1-CHECK.md`](../../docs/checks/WO-O4O-ARTIFACT-REGISTRY-CLEANUP-POLICY-AND-IMAGE-PRUNE-V1-CHECK.md)
