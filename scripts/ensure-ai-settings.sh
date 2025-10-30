#!/bin/bash

echo "🔧 Ensuring AI Settings table exists in production..."

# Detect the correct base path (works for both dev and production environments)
if [ -d "/home/ubuntu/o4o-platform" ]; then
  BASE_PATH="/home/ubuntu/o4o-platform"
elif [ -d "/home/dev/o4o-platform" ]; then
  BASE_PATH="/home/dev/o4o-platform"
else
  echo "❌ Error: Cannot find o4o-platform directory"
  exit 1
fi

cd "$BASE_PATH/apps/api-server"

# Build the project first
echo "📦 Building API server..."
pnpm run build

# Run the SQL directly using TypeORM query
echo "📊 Creating AI Settings table if not exists..."
npx typeorm-ts-node-commonjs -d src/database/data-source.ts query "CREATE TABLE IF NOT EXISTS ai_settings (id SERIAL PRIMARY KEY, provider VARCHAR(255) NOT NULL UNIQUE, apiKey TEXT, defaultModel VARCHAR(255), settings JSON, isActive BOOLEAN DEFAULT true, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"

# Add index
npx typeorm-ts-node-commonjs -d src/database/data-source.ts query "CREATE INDEX IF NOT EXISTS idx_ai_settings_provider ON ai_settings(provider)"

# Register migration
npx typeorm-ts-node-commonjs -d src/database/data-source.ts query "INSERT INTO typeorm_migrations (name, timestamp) SELECT '1706000000000-CreateAISettings', 1706000000000 WHERE NOT EXISTS (SELECT 1 FROM typeorm_migrations WHERE name = '1706000000000-CreateAISettings')"

echo "✅ AI Settings table setup complete!"

# Test the endpoint
echo "🧪 Testing AI settings endpoint..."
curl -X GET http://localhost:3001/api/v1/ai-settings 2>/dev/null | head -c 100

echo ""
echo "🎉 AI Settings API is ready!"