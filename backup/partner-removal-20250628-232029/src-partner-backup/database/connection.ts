// src/partner/database/connection.ts
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function initializeDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (db) {
    return db;
  }

  try {
    // 데이터베이스 디렉토리 생성
    const dbDir = path.join(__dirname, '../../../data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // SQLite 데이터베이스 연결
    db = await open({
      filename: path.join(dbDir, 'partner.db'),
      driver: sqlite3.Database
    });

    console.log('✅ Partner 데이터베이스 연결 성공');

    // 스키마 초기화
    await initializeSchema();

    return db;
  } catch (error) {
    console.error('❌ Partner 데이터베이스 연결 실패:', error);
    throw error;
  }
}

async function initializeSchema(): Promise<void> {
  if (!db) {
    throw new Error('데이터베이스가 초기화되지 않았습니다.');
  }

  try {
    // 스키마 파일 읽기
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // SQL 문들을 분리하여 실행
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      await db.exec(statement);
    }

    console.log('✅ Partner 데이터베이스 스키마 초기화 완료');
  } catch (error) {
    console.error('❌ 스키마 초기화 실패:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
  if (!db) {
    return await initializeDatabase();
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('✅ Partner 데이터베이스 연결 종료');
  }
}

// 트랜잭션 헬퍼
export async function withTransaction<T>(
  callback: (db: Database<sqlite3.Database, sqlite3.Statement>) => Promise<T>
): Promise<T> {
  const database = await getDatabase();
  
  await database.run('BEGIN TRANSACTION');
  
  try {
    const result = await callback(database);
    await database.run('COMMIT');
    return result;
  } catch (error) {
    await database.run('ROLLBACK');
    throw error;
  }
}

// 데이터베이스 통계
export async function getDatabaseStats(): Promise<{
  totalPartners: number;
  activePartners: number;
  pendingApplications: number;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
}> {
  const database = await getDatabase();

  const [
    partnerCount,
    activePartnerCount,
    pendingApplicationCount,
    clickCount,
    conversionCount,
    earningsSum
  ] = await Promise.all([
    database.get('SELECT COUNT(*) as count FROM partner_profiles'),
    database.get('SELECT COUNT(*) as count FROM partner_profiles WHERE status = "active"'),
    database.get('SELECT COUNT(*) as count FROM partner_applications WHERE status = "pending"'),
    database.get('SELECT SUM(total_clicks) as total FROM partner_profiles'),
    database.get('SELECT SUM(total_conversions) as total FROM partner_profiles'),
    database.get('SELECT SUM(total_earnings) as total FROM partner_profiles')
  ]);

  return {
    totalPartners: partnerCount?.count || 0,
    activePartners: activePartnerCount?.count || 0,
    pendingApplications: pendingApplicationCount?.count || 0,
    totalClicks: clickCount?.total || 0,
    totalConversions: conversionCount?.total || 0,
    totalEarnings: parseFloat(earningsSum?.total) || 0
  };
}
