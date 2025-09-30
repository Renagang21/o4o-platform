-- Create AI Settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_settings (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(255) NOT NULL UNIQUE,
    apiKey TEXT,
    defaultModel VARCHAR(255),
    settings JSON,
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on provider for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_settings_provider ON ai_settings(provider);

-- Add the migration record if it doesn't exist
INSERT INTO typeorm_migrations (name, timestamp) 
SELECT '1706000000000-CreateAISettings', 1706000000000
WHERE NOT EXISTS (
    SELECT 1 FROM typeorm_migrations 
    WHERE name = '1706000000000-CreateAISettings'
);