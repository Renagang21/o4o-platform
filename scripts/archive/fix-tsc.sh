#!/bin/bash

# TypeScript wrapper to fix "2" issue
# Execute tsc directly with node

cd "${1:-$(pwd)}"
shift || true

exec node "$(dirname "$0")/../node_modules/typescript/lib/tsc.js" "$@"