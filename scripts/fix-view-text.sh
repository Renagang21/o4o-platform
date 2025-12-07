#!/bin/bash
#
# Fix e2e-test-view text in database
# Changes "Eㅅㄷㄷㅅㄴ" to "E테스트"
#

set -e

echo "🔧 Fixing e2e-test-view text..."

# Load environment variables
cd /home/ubuntu/o4o-platform/apps/api-server
if [ -f .env ]; then
  source .env
elif [ -f .env.development ]; then
  source .env.development
fi

# Check current text
echo "📄 Current text:"
PGPASSWORD=$DB_PASSWORD psql -h ${DB_HOST:-localhost} -U ${DB_USERNAME:-o4o_user} -d ${DB_NAME:-o4o_db} -c "SELECT schema->'components'->0->'props'->>'text' as current_text FROM cms_views WHERE slug = 'e2e-test-view';"

# Update text
echo "✏️  Updating text to 'E테스트'..."
PGPASSWORD=$DB_PASSWORD psql -h ${DB_HOST:-localhost} -U ${DB_USERNAME:-o4o_user} -d ${DB_NAME:-o4o_db} << EOF
UPDATE cms_views
SET
  schema = jsonb_set(
    schema,
    '{components,0,props,text}',
    '"E테스트"'
  ),
  updatedat = NOW()
WHERE slug = 'e2e-test-view';
EOF

# Verify update
echo "✅ Verification:"
PGPASSWORD=$DB_PASSWORD psql -h ${DB_HOST:-localhost} -U ${DB_USERNAME:-o4o_user} -d ${DB_NAME:-o4o_db} -c "SELECT schema->'components'->0->'props'->>'text' as updated_text FROM cms_views WHERE slug = 'e2e-test-view';"

echo "✅ Done!"
