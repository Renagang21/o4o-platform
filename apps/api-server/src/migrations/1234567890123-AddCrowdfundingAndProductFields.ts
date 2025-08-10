import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCrowdfundingAndProductFields1234567890123 implements MigrationInterface {
    name = 'AddCrowdfundingAndProductFields1234567890123';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns to products table
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "salePrice" DECIMAL(10,2)`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reviews" JSON`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "compareAtPrice" DECIMAL(10,2)`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "rating" DECIMAL(3,2) DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "salesCount" INTEGER DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand" VARCHAR(255)`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "metadata" JSON`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "visibility" VARCHAR(255) DEFAULT 'visible'`);
        
        // Add stage and progress fields to funding_updates
        await queryRunner.query(`ALTER TABLE "funding_updates" ADD COLUMN IF NOT EXISTS "stage" VARCHAR(20)`);
        await queryRunner.query(`ALTER TABLE "funding_updates" ADD COLUMN IF NOT EXISTS "progressPercentage" INTEGER`);
        await queryRunner.query(`ALTER TABLE "funding_updates" ADD COLUMN IF NOT EXISTS "images" JSON`);
        
        // Modify backer_rewards totalPrice to be nullable
        await queryRunner.query(`ALTER TABLE "backer_rewards" ALTER COLUMN "totalPrice" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove added columns from products table
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "salePrice"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "reviews"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "compareAtPrice"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "rating"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "reviewCount"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "salesCount"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "brand"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "metadata"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "visibility"`);
        
        // Remove added columns from funding_updates
        await queryRunner.query(`ALTER TABLE "funding_updates" DROP COLUMN IF EXISTS "stage"`);
        await queryRunner.query(`ALTER TABLE "funding_updates" DROP COLUMN IF EXISTS "progressPercentage"`);
        await queryRunner.query(`ALTER TABLE "funding_updates" DROP COLUMN IF EXISTS "images"`);
        
        // Revert backer_rewards totalPrice
        await queryRunner.query(`ALTER TABLE "backer_rewards" ALTER COLUMN "totalPrice" SET NOT NULL`);
    }
}