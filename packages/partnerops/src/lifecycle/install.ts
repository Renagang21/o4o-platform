/**
 * PartnerOps Install Hook
 *
 * Called when the app is installed
 */

import { DataSource } from 'typeorm';

export interface InstallContext {
  tenantId: string;
  dataSource: DataSource;
  config?: Record<string, any>;
}

export async function onInstall(context: InstallContext): Promise<void> {
  const { tenantId, dataSource } = context;

  console.log(`[PartnerOps] Installing for tenant: ${tenantId}`);

  // Create partnerops-specific tables
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS partnerops_partners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL,
      user_id UUID NOT NULL,
      partner_code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      sns_accounts JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'pending',
      approved_at TIMESTAMP,
      approved_by UUID,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS partnerops_routines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL,
      partner_id UUID NOT NULL REFERENCES partnerops_partners(id),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      content JSONB DEFAULT '{}',
      products JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS partnerops_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL,
      partner_id UUID NOT NULL REFERENCES partnerops_partners(id),
      short_code VARCHAR(50) UNIQUE NOT NULL,
      target_url TEXT NOT NULL,
      target_type VARCHAR(50) DEFAULT 'listing',
      target_id UUID,
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS partnerops_clicks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL,
      link_id UUID NOT NULL REFERENCES partnerops_links(id),
      partner_id UUID NOT NULL REFERENCES partnerops_partners(id),
      visitor_id VARCHAR(255),
      ip_address VARCHAR(50),
      user_agent TEXT,
      referer TEXT,
      converted BOOLEAN DEFAULT false,
      conversion_id UUID,
      clicked_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS partnerops_conversions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL,
      partner_id UUID NOT NULL REFERENCES partnerops_partners(id),
      link_id UUID REFERENCES partnerops_links(id),
      click_id UUID REFERENCES partnerops_clicks(id),
      order_id UUID,
      order_amount DECIMAL(12, 2),
      commission_rate DECIMAL(5, 2),
      commission_amount DECIMAL(12, 2),
      status VARCHAR(50) DEFAULT 'pending',
      metadata JSONB DEFAULT '{}',
      converted_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS partnerops_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL UNIQUE,
      default_commission_rate DECIMAL(5, 2) DEFAULT 5.00,
      cookie_duration_days INTEGER DEFAULT 30,
      min_payout_amount DECIMAL(12, 2) DEFAULT 50000,
      payout_schedule VARCHAR(50) DEFAULT 'monthly',
      auto_approve_partners BOOLEAN DEFAULT false,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create indexes
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_partnerops_partners_tenant ON partnerops_partners(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_partnerops_partners_user ON partnerops_partners(user_id);
    CREATE INDEX IF NOT EXISTS idx_partnerops_partners_code ON partnerops_partners(partner_code);
    CREATE INDEX IF NOT EXISTS idx_partnerops_routines_partner ON partnerops_routines(partner_id);
    CREATE INDEX IF NOT EXISTS idx_partnerops_links_partner ON partnerops_links(partner_id);
    CREATE INDEX IF NOT EXISTS idx_partnerops_links_code ON partnerops_links(short_code);
    CREATE INDEX IF NOT EXISTS idx_partnerops_clicks_link ON partnerops_clicks(link_id);
    CREATE INDEX IF NOT EXISTS idx_partnerops_conversions_partner ON partnerops_conversions(partner_id);
  `);

  // Insert default settings
  await dataSource.query(`
    INSERT INTO partnerops_settings (tenant_id)
    VALUES ($1)
    ON CONFLICT (tenant_id) DO NOTHING
  `, [tenantId]);

  console.log(`[PartnerOps] Installation completed for tenant: ${tenantId}`);
}

export default onInstall;
