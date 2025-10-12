import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddActiveRoleToUsers1749876543210 implements MigrationInterface {
  name = 'AddActiveRoleToUsers1749876543210';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

    // Migrate existing user data

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

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('users', 'FK_users_active_role');

    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_active_role_id";`);

    // Drop column
    await queryRunner.dropColumn('users', 'active_role_id');
  }
}
