/**
 * Fix e2e-test-view text in database
 * Changes "Eㅅㄷㄷㅅㄴ" to "E테스트"
 */

import { DataSource } from 'typeorm';

// Environment variables from process.env (loaded by API server)

async function fixViewText() {
  console.log('🔧 Fixing e2e-test-view text...');

  // Create DataSource
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'o4o_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_db',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    // Get current view
    const result = await dataSource.query(
      `SELECT id, slug, schema FROM views WHERE slug = 'e2e-test-view'`
    );

    if (result.length === 0) {
      console.log('❌ View not found');
      return;
    }

    const view = result[0];
    console.log('📄 Current text:', view.schema.components[0]?.props?.text);

    // Update text
    const updatedSchema = {
      ...view.schema,
      components: view.schema.components.map((component: any, index: number) => {
        if (index === 0 && component.type === 'Text') {
          return {
            ...component,
            props: {
              ...component.props,
              text: 'E테스트',
            },
          };
        }
        return component;
      }),
    };

    await dataSource.query(
      `UPDATE views SET schema = $1, "updatedAt" = NOW() WHERE id = $2`,
      [JSON.stringify(updatedSchema), view.id]
    );

    console.log('✅ Text updated to: E테스트');

    // Verify update
    const verifyResult = await dataSource.query(
      `SELECT schema FROM views WHERE id = $1`,
      [view.id]
    );
    console.log('✅ Verified text:', verifyResult[0].schema.components[0].props.text);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

fixViewText()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
