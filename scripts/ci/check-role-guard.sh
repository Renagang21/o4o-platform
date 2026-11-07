#!/usr/bin/env bash
# ROLE_GUARD_TEST_BASELINE_V1 정적 분석 (GUARD-005~007) — services/web-*/src/**/*.{ts,tsx}
#
# WO-O4O-CI-SHORT-JOB-CONSOLIDATION-V1 (IR-O4O-PRIVATE-CI-BUDGET-V1 §8-4)
#   종전 `ci-guard-policy.yml`(별도 workflow · 별도 job, 실행 약 27초에 1분 청구)의 검사를 패턴 그대로 옮겼다.
#   이제 CI Pipeline 의 Detect job 이 모든 run 에서 실행한다. 위반이 있으면 exit 1.
#
#   bash scripts/ci/check-role-guard.sh [root]      # root 기본값: 저장소 루트(현재 디렉터리)
set -u
ROOT="${1:-.}"
cd "$ROOT" || exit 2
shopt -s nullglob
TARGETS=(services/web-*/src/)
if [ ${#TARGETS[@]} -eq 0 ]; then
  echo "GUARD-005~007: services/web-*/src 없음 — 검사 대상 0"
  exit 0
fi

FAIL=0
scan() { grep -rn --include="*.ts" --include="*.tsx" "$1" "${TARGETS[@]}"; }

echo "::group::GUARD-005 — user.role direct comparison"
if scan 'user\.role\s*[!=]=\s*'; then
  echo "::error::GUARD-005 FAIL: user.role direct comparison detected"
  echo "Fix: Replace with user.roles.includes() or user.roles.some()"
  FAIL=1
fi
if scan 'user?\.role\s*[!=]=\s*'; then
  echo "::error::GUARD-005 FAIL: user?.role direct comparison detected"
  FAIL=1
fi
echo "::endgroup::"

echo "::group::GUARD-006 — user.currentRole"
if scan 'user[?]\?\.currentRole'; then
  echo "::error::GUARD-006 FAIL: user.currentRole usage detected"
  echo "Fix: Replace with user.roles[0] or user.roles.includes()"
  FAIL=1
fi
echo "::endgroup::"

echo "::group::GUARD-007 — RoleGuard without allowedRoles"
if scan '<RoleGuard>'; then
  echo "::error::GUARD-007 FAIL: RoleGuard without allowedRoles detected"
  echo "Fix: Add allowedRoles prop, e.g. <RoleGuard allowedRoles={['admin']}>"
  FAIL=1
fi
echo "::endgroup::"

if [ "$FAIL" -ne 0 ]; then exit 1; fi
echo "Guard Policy Check (GUARD-005 · 006 · 007): ALL PASSED — Ref: docs/platform-core/ROLE_GUARD_TEST_BASELINE_V1.md"
