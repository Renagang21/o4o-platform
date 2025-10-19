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

    // post 테이블 존재 확인
    const tables = await AppDataSource.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%post%'");
    console.log('Post 관련 테이블:', tables);

    // post 테이블 카운트
    try {
      const count = await AppDataSource.query('SELECT COUNT(*) FROM post');
      console.log('\npost 테이블 레코드 수:', count[0].count);

      if (parseInt(count[0].count) > 0) {
        const sample = await AppDataSource.query('SELECT id, title, type, status, created_at FROM post LIMIT 5');
        console.log('\n샘플 데이터:', sample);
      }
    } catch (e) {
      console.log('\npost 테이블 조회 에러:', e.message);
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('에러:', error.message);
    process.exit(1);
  }
}

main();
