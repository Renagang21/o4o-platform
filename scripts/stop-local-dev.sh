#!/bin/bash

# O4O Platform 로컬 개발 환경 종료 스크립트

echo "🛑 O4O Platform 로컬 개발 환경 종료"
echo "===================================="

# PID 파일에서 프로세스 종료
if [ -d .dev-pids ]; then
    for pidfile in .dev-pids/*.pid; do
        if [ -f "$pidfile" ]; then
            PID=$(cat "$pidfile")
            SERVICE=$(basename "$pidfile" .pid)
            if kill -0 $PID 2>/dev/null; then
                echo "종료 중: $SERVICE (PID: $PID)"
                kill $PID
            fi
            rm "$pidfile"
        fi
    done
fi

# 추가로 남아있는 프로세스 정리
pkill -f "npm run dev" || true
pkill -f "vite" || true
pkill -f "nodemon" || true

echo "✅ 모든 개발 서버가 종료되었습니다."