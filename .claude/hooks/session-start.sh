#!/usr/bin/env bash
# Claude Code SessionStart hook — 클라우드 세션 의존성 설치.
# - CLAUDE_CODE_REMOTE=true 일 때만 동작한다(로컬 세션은 SETUP.md 의 수동 설치를 따른다).
# - lockfile 기준 설치(pnpm install --frozen-lockfile)만 한다. lockfile 을 바꾸지 않는다.
# - 실패해도 세션을 막지 않는다: 오류는 출력만 하고 항상 exit 0.
# - 동기화 요약은 session-start.mjs 가 맡는다. 이 파일은 설치만 한다.
if [[ "${CLAUDE_CODE_REMOTE:-}" != "true" ]]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || { echo "[deps] 프로젝트 디렉터리 이동 실패 — 설치 건너뜀"; exit 0; }

corepack enable >/dev/null 2>&1 || true
pm_version="$(node -p "(require('./package.json').packageManager||'').split('@')[1]||''" 2>/dev/null)"
if command -v pnpm >/dev/null 2>&1; then
  PNPM=(pnpm)
elif [[ -n "$pm_version" ]]; then
  PNPM=(npx --yes "pnpm@${pm_version}")
else
  echo "[deps] pnpm 을 찾지 못함 — 설치 건너뜀"; exit 0
fi

log="$(mktemp 2>/dev/null || echo /tmp/o4o-session-deps.log)"
start=$(date +%s)
if CI=true "${PNPM[@]}" install --frozen-lockfile --prefer-offline >"$log" 2>&1; then
  echo "[deps] pnpm install --frozen-lockfile 완료 ($(( $(date +%s) - start ))s)"
else
  echo "[deps] pnpm install 실패(세션은 계속) — 마지막 출력:"
  tail -n 15 "$log"
fi
exit 0
