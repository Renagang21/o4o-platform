const { AppDataSource } = require('./dist/database/connection');

async function testCPTEndpoints() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    // Check if taxonomies table exists
    const tableExists = await AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'taxonomies'
      );
    `);

    console.log('📊 Taxonomies table exists:', tableExists[0].exists);

    if (!tableExists[0].exists) {
      console.log('🔧 Creating taxonomies table...');

      // Create taxonomies table
      await AppDataSource.query(`
        CREATE TABLE "taxonomies" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "name" character varying(32) NOT NULL,
          "label" character varying(255) NOT NULL,
          "description" text,
          "objectTypes" text,
          "labels" jsonb,
          "settings" jsonb,
          "hierarchical" boolean NOT NULL DEFAULT true,
          "public" boolean NOT NULL DEFAULT true,
          "showUI" boolean NOT NULL DEFAULT true,
          "showInMenu" boolean NOT NULL DEFAULT true,
          "showInNavMenus" boolean NOT NULL DEFAULT true,
          "showTagcloud" boolean NOT NULL DEFAULT true,
          "showInQuickEdit" boolean NOT NULL DEFAULT true,
          "showAdminColumn" boolean NOT NULL DEFAULT false,
          "sortOrder" integer NOT NULL DEFAULT 0,
          "createdBy" character varying NOT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_taxonomies_name" UNIQUE ("name"),
          CONSTRAINT "PK_taxonomies" PRIMARY KEY ("id")
        )
      `);

      // Create terms table
      await AppDataSource.query(`
        CREATE TABLE "terms" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "name" character varying(200) NOT NULL,
          "slug" character varying(200) NOT NULL,
          "description" text,
          "count" integer NOT NULL DEFAULT 0,
          "taxonomyId" uuid NOT NULL,
          "parentId" uuid,
          "mpath" character varying DEFAULT '',
          "meta" jsonb,
          "termOrder" integer NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "UQ_terms_slug" UNIQUE ("slug"),
          CONSTRAINT "PK_terms" PRIMARY KEY ("id")
        )
      `);

      // Create term_relationships table
      await AppDataSource.query(`
        CREATE TABLE "term_relationships" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "objectId" uuid NOT NULL,
          "objectType" character varying(50) NOT NULL,
          "termId" uuid NOT NULL,
          "termOrder" integer NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_term_relationships" PRIMARY KEY ("id")
        )
      `);

      // Add foreign key constraints
      await AppDataSource.query(`
        ALTER TABLE "terms"
        ADD CONSTRAINT "FK_terms_taxonomy"
        FOREIGN KEY ("taxonomyId") REFERENCES "taxonomies"("id") ON DELETE CASCADE;
      `);

      await AppDataSource.query(`
        ALTER TABLE "terms"
        ADD CONSTRAINT "FK_terms_parent"
        FOREIGN KEY ("parentId") REFERENCES "terms"("id") ON DELETE SET NULL;
      `);

      await AppDataSource.query(`
        ALTER TABLE "term_relationships"
        ADD CONSTRAINT "FK_term_relationships_term"
        FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE CASCADE;
      `);

      // Get an admin user
      const adminUser = await AppDataSource.query(`
        SELECT id FROM users WHERE role = 'admin' LIMIT 1
      `);

      const userId = adminUser[0]?.id || (await AppDataSource.query(`SELECT id FROM users LIMIT 1`))[0]?.id;

      if (userId) {
        // Insert default taxonomies
        await AppDataSource.query(`
          INSERT INTO "taxonomies" ("name", "label", "description", "objectTypes", "hierarchical", "createdBy")
          VALUES
            ('category', 'Categories', 'Hierarchical taxonomy for organizing content', 'post,page', true, $1),
            ('post_tag', 'Tags', 'Non-hierarchical taxonomy for tagging content', 'post', false, $1),
            ('product_cat', 'Product Categories', 'Product categories for e-commerce', 'product,ds_product', true, $1),
            ('product_tag', 'Product Tags', 'Product tags for e-commerce', 'product,ds_product', false, $1)
        `, [userId]);

        // Insert default terms
        const categoryTaxonomy = await AppDataSource.query(`
          SELECT id FROM "taxonomies" WHERE name = 'category' LIMIT 1
        `);

        const productCatTaxonomy = await AppDataSource.query(`
          SELECT id FROM "taxonomies" WHERE name = 'product_cat' LIMIT 1
        `);

        if (categoryTaxonomy[0]) {
          await AppDataSource.query(`
            INSERT INTO "terms" ("name", "slug", "description", "taxonomyId")
            VALUES ('Uncategorized', 'uncategorized', 'Default category', $1)
          `, [categoryTaxonomy[0].id]);
        }

        if (productCatTaxonomy[0]) {
          await AppDataSource.query(`
            INSERT INTO "terms" ("name", "slug", "description", "taxonomyId")
            VALUES ('General', 'general', 'General product category', $1)
          `, [productCatTaxonomy[0].id]);
        }

        console.log('✅ CPT Engine tables created successfully');
      }
    }

    // Test queries
    const taxonomies = await AppDataSource.query('SELECT * FROM taxonomies');
    console.log('📋 Taxonomies count:', taxonomies.length);

    const terms = await AppDataSource.query('SELECT * FROM terms');
    console.log('🏷️  Terms count:', terms.length);

    console.log('🎉 CPT Engine setup completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

testCPTEndpoints();