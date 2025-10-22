# Payment 멱등성 UNIQUE 제약조건 추가 매뉴얼

## 📋 배경
결제 시스템의 멱등성 처리를 위해 `confirmIdempotencyKey`, `cancelIdempotencyKey` 컬럼에 UNIQUE 제약조건이 필요합니다.

현재 애플리케이션 레벨에서는 멱등성 처리가 작동하지만, DB 레벨 중복 방지가 없어 완전한 보장이 되지 않습니다.

## 🎯 목표
`payments` 테이블에 UNIQUE 제약조건 추가

---

## 🔧 실행 방법

### 방법 1: psql 직접 실행 (추천)

API 서버(43.202.242.215) 또는 DB 서버에 SSH 접속 후:

```bash
# DB 서버 직접 접속 (DB 서버에서)
sudo -u postgres psql -d o4o_platform

# 또는 원격 접속 (API 서버에서)
PGPASSWORD=postgres psql -h 43.202.242.215 -U postgres -d o4o_platform
```

**실행할 SQL:**
```sql
-- 1. 컬럼명 확인 (실제 케이스 확인)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name LIKE '%idempotency%';

-- 2. 기존 제약조건 확인
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'payments'::regclass
  AND conname LIKE '%idempotency%';

-- 3. UNIQUE 제약조건 추가
-- 주의: 위에서 확인한 실제 컬럼명을 사용하세요
-- 케이스가 다를 수 있습니다 (confirmIdempotencyKey vs confirmidempotencykey)

ALTER TABLE payments
ADD CONSTRAINT uk_payments_confirm_idempotency
UNIQUE ("confirmIdempotencyKey");

ALTER TABLE payments
ADD CONSTRAINT uk_payments_cancel_idempotency
UNIQUE ("cancelIdempotencyKey");

-- 4. 결과 확인
SELECT
  conname as constraint_name,
  contype as type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'payments'::regclass
  AND conname LIKE '%idempotency%';
```

---

### 방법 2: Node.js 스크립트 (DB 접속 가능한 경우)

API 서버에서:

```bash
cd /home/ubuntu/o4o-platform/apps/api-server

# 환경변수 로드 후 실행
source .env

node << 'NODE_SCRIPT'
const { DataSource } = require('typeorm');

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '43.202.242.215',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'o4o_platform'
});

(async () => {
  try {
    console.log('Connecting...');
    await ds.initialize();

    // 컬럼명 확인
    const cols = await ds.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'payments'
        AND column_name LIKE '%idempotency%'
    `);

    console.log('Found columns:', cols.map(c => c.column_name));

    // UNIQUE 제약조건 추가
    for (const col of cols) {
      const colName = col.column_name;
      const constraint = colName.includes('confirm')
        ? 'uk_payments_confirm_idempotency'
        : 'uk_payments_cancel_idempotency';

      try {
        await ds.query(`
          ALTER TABLE payments
          ADD CONSTRAINT ${constraint}
          UNIQUE ("${colName}")
        `);
        console.log('✅ Added:', constraint);
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log('⚠️  Already exists:', constraint);
        } else {
          console.error('❌ Error:', constraint, e.message);
        }
      }
    }

    // 최종 확인
    const constraints = await ds.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'payments'::regclass
        AND conname LIKE '%idempotency%'
    `);

    console.log('\n✅ Final constraints:');
    console.table(constraints);

    await ds.destroy();
    console.log('\n🎉 Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
NODE_SCRIPT
```

---

### 방법 3: 마이그레이션 파일 수정 후 재실행

```bash
cd /home/ubuntu/o4o-platform/apps/api-server

# 1. 기존 실패한 마이그레이션 파일 삭제
rm src/database/migrations/1761095603000-AddPaymentIdempotencyConstraints.ts

# 2. 올바른 마이그레이션 파일 생성
cat > src/database/migrations/$(date +%s)000-AddPaymentIdempotencyConstraints.ts << 'EOF'
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentIdempotencyConstraints$(date +%s)000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 먼저 컬럼 존재 확인
    const columns = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'payments'
        AND column_name LIKE '%idempotency%'
    `);

    if (columns.length === 0) {
      console.log('⚠️  No idempotency columns found, skipping...');
      return;
    }

    for (const col of columns) {
      const colName = col.column_name;
      const constraint = colName.includes('confirm')
        ? 'uk_payments_confirm_idempotency'
        : 'uk_payments_cancel_idempotency';

      try {
        await queryRunner.query(`
          ALTER TABLE payments
          ADD CONSTRAINT ${constraint}
          UNIQUE ("${colName}")
        `);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Constraint ${constraint} already exists`);
        } else {
          throw error;
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payments
      DROP CONSTRAINT IF EXISTS uk_payments_confirm_idempotency
    `);

    await queryRunner.query(`
      ALTER TABLE payments
      DROP CONSTRAINT IF EXISTS uk_payments_cancel_idempotency
    `);
  }
}
EOF

# 3. 서버 재시작하여 마이그레이션 자동 실행
npx pm2 restart o4o-api-server
npx pm2 logs o4o-api-server --lines 50 | grep -i migration
```

---

## ✅ 검증 방법

실행 후 아래 SQL로 제약조건이 올바르게 추가되었는지 확인:

```sql
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'payments'::regclass
  AND conname LIKE '%idempotency%';
```

**기대 결과:**
```
        constraint_name         | constraint_type |                    definition
-------------------------------+-----------------+-------------------------------------------------
 uk_payments_confirm_idempotency | u              | UNIQUE (confirmIdempotencyKey)
 uk_payments_cancel_idempotency  | u              | UNIQUE (cancelIdempotencyKey)
```

---

## 🚨 주의사항

1. **케이스 민감성**: PostgreSQL에서 큰따옴표로 감싼 컬럼명은 대소문자 구분
   - `confirmIdempotencyKey` ✅ (정확한 케이스)
   - `confirmidempotencykey` ❌ (소문자로 변환됨)

2. **중복 데이터 확인**: UNIQUE 제약조건 추가 전 중복 데이터가 있으면 실패
   ```sql
   -- 중복 확인
   SELECT "confirmIdempotencyKey", COUNT(*)
   FROM payments
   WHERE "confirmIdempotencyKey" IS NOT NULL
   GROUP BY "confirmIdempotencyKey"
   HAVING COUNT(*) > 1;
   ```

3. **프로덕션 적용 시**: 트랜잭션 시작 후 적용
   ```sql
   BEGIN;
   ALTER TABLE payments ADD CONSTRAINT uk_payments_confirm_idempotency UNIQUE ("confirmIdempotencyKey");
   ALTER TABLE payments ADD CONSTRAINT uk_payments_cancel_idempotency UNIQUE ("cancelIdempotencyKey");
   COMMIT;
   ```

---

## 📞 문의

- 파일 위치: `/home/ubuntu/o4o-platform/apps/api-server/src/entities/Payment.ts`
- 마이그레이션: `/home/ubuntu/o4o-platform/apps/api-server/src/database/migrations/`
- 관련 코드: `apps/api-server/src/services/PaymentService.ts:143-192, 261-301`
