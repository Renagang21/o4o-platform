import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProductCommissionColumns1732422000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add Phase PD-2 commission columns to products table
    // Skip if products table doesn't exist (cosmetics domain uses separate DB)
    const hasTable = await queryRunner.hasTable('products');
    if (!hasTable) {
      console.log('Skipping AddProductCommissionColumns: products table does not exist');
      return;
    }

    // Check if columns exist before adding to handle idempotency
    const table = await queryRunner.getTable('products');

    if (!table?.findColumnByName('commissionType')) {
      await queryRunner.addColumn(
        'products',
        new TableColumn({
          name: 'commissionType',
          type: 'enum',
          enum: ['rate', 'fixed'],
          isNullable: true
        })
      );
    }

    if (!table?.findColumnByName('commissionValue')) {
      await queryRunner.addColumn(
        'products',
        new TableColumn({
          name: 'commissionValue',
          type: 'decimal',
          precision: 10,
          scale: 4,
          isNullable: true
        })
      );
    }

    if (!table?.findColumnByName('sellerCommissionRate')) {
      await queryRunner.addColumn(
        'products',
        new TableColumn({
          name: 'sellerCommissionRate',
          type: 'decimal',
          precision: 5,
          scale: 2,
          isNullable: true
        })
      );
    }

    if (!table?.findColumnByName('platformCommissionRate')) {
      await queryRunner.addColumn(
        'products',
        new TableColumn({
          name: 'platformCommissionRate',
          type: 'decimal',
          precision: 5,
          scale: 2,
          isNullable: true
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('products');
    if (!hasTable) {
      return;
    }

    await queryRunner.dropColumn('products', 'platformCommissionRate');
    await queryRunner.dropColumn('products', 'sellerCommissionRate');
    await queryRunner.dropColumn('products', 'commissionValue');
    await queryRunner.dropColumn('products', 'commissionType');
  }
}
