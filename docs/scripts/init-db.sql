-- O4O Platform PostgreSQL 초기화 스크립트
-- 개발 환경용 데이터베이스 및 사용자 설정

-- 확장 모듈 설치
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 개발용 추가 데이터베이스 생성 (필요시)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'o4o_platform_test') THEN
        PERFORM dblink_exec('host=localhost dbname=postgres', 'CREATE DATABASE o4o_platform_test');
    END IF;
END $$;

-- 데이터베이스 연결 확인
\echo '🗄️ PostgreSQL 초기화 완료!'
\echo '📊 데이터베이스: o4o_platform_dev'
\echo '👤 사용자: postgres'
\echo '🚀 확장 모듈: uuid-ossp, pg_trgm, unaccent 설치됨'

-- 개발용 샘플 데이터 (TypeORM이 테이블을 생성한 후 필요시 삽입)
-- 실제 테이블은 TypeORM synchronize=true로 자동 생성됨

-- 성능 최적화 설정
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '128MB';
ALTER SYSTEM SET effective_cache_size = '512MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- 설정 적용을 위한 알림
\echo '⚡ PostgreSQL 성능 설정 적용됨'
\echo '🔄 컨테이너 재시작 시 설정이 활성화됩니다'

-- 초기화 완료 로그
\echo '✅ O4O Platform 데이터베이스 초기화 완료!'
