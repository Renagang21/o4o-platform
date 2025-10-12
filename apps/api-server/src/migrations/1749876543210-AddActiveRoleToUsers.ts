import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddActiveRoleToUsers1749876543210 implements MigrationInterface {
  name = 'AddActiveRoleToUsers1749876543210';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Adding active_role_id column to users table...');

    // Add active_role_id column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'active_role_id',
        type: 'uuid',
        isNullable: true,
        comment: 'Currently active role for users with multiple roles'
      })
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        name: 'FK_users_active_role',
        columnNames: ['active_role_id'],
        referencedTableName: 'roles',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL'
      })
    );

    // Create index for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_users_active_role_id" ON "users" ("active_role_id");
    `);

    console.log('✅ active_role_id column added successfully');

    // Migrate existing user data
    console.log('🔄 Migrating existing user data...');

    // Set active_role_id for users who have roles in user_roles table
    await queryRunner.query(`
      UPDATE users u
      SET active_role_id = (
        SELECT ur.role_id
        FROM user_roles ur
        WHERE ur.user_id = u.id
        ORDER BY ur.role_id
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM user_roles ur2 WHERE ur2.user_id = u.id
      );
    `);

    // Count users with active_role_id set
    const result = await queryRunner.query(`
      SELECT COUNT(*) as count FROM users WHERE active_role_id IS NOT NULL;
    `);

    console.log(`✅ Set active_role_id for ${result[0].count} users`);

    // Count users without active_role_id (should investigate these)
    const nullResult = await queryRunner.query(`
      SELECT COUNT(*) as count FROM users WHERE active_role_id IS NULL;
    `);

    if (parseInt(nullResult[0].count) > 0) {
      console.warn(`⚠️  ${nullResult[0].count} users do not have active_role_id set`);
    }

    console.log('✅ Migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rolling back active_role_id column...');

    // Drop foreign key
    await queryRunner.dropForeignKey('users', 'FK_users_active_role');

    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_active_role_id";`);

    // Drop column
    await queryRunner.dropColumn('users', 'active_role_id');

    console.log('✅ Rollback completed successfully');
  }
}
