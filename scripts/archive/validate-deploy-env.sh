#!/bin/bash

# Validate deployment environment
echo "🔍 Validating deployment environment..."

# Check if required environment variables are set
REQUIRED_VARS=(
  "NODE_ENV"
  "DB_HOST"
  "DB_PORT"
  "DB_USERNAME"
  "DB_NAME"
  "JWT_SECRET"
)

missing_vars=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "❌ Missing required environment variables:"
  printf '%s\n' "${missing_vars[@]}"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_NODE_VERSION="22"
if [[ ! "$NODE_VERSION" =~ ^$REQUIRED_NODE_VERSION ]]; then
  echo "❌ Node.js version $NODE_VERSION does not match required version $REQUIRED_NODE_VERSION"
  exit 1
fi

echo "✅ Environment validation passed"
exit 0