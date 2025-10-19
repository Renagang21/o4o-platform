const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'o4o_user',
  password: 'o4o_password123',
  database: 'o4o_platform',
});

async function main() {
  try {
    console.log('데이터베이스 연결 중...');
    await AppDataSource.initialize();
    console.log('✅ 연결 성공\n');

    // custom_posts 테이블 카운트
    const count = await AppDataSource.query('SELECT COUNT(*) FROM custom_posts');
    console.log('custom_posts 테이블 총 레코드 수:', count[0].count);

    // cpt_slug별 카운트
    const countBySlug = await AppDataSource.query(`
      SELECT cpt_slug, COUNT(*) as count
      FROM custom_posts
      GROUP BY cpt_slug
      ORDER BY count DESC
    `);
    console.log('\ncpt_slug별 레코드 수:');
    countBySlug.forEach(row => {
      console.log(`  ${row.cpt_slug}: ${row.count}개`);
    });

    // docs CPT 샘플 데이터
    const docsSample = await AppDataSource.query(`
      SELECT id, title, slug, status, created_at
      FROM custom_posts
      WHERE cpt_slug = 'docs'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('\ndocs CPT 최근 5개:');
    docsSample.forEach(post => {
      console.log(`  - ${post.title} (${post.status})`);
    });

    await AppDataSource.destroy();
  } catch (error) {
    console.error('에러:', error.message);
    process.exit(1);
  }
}

main();
