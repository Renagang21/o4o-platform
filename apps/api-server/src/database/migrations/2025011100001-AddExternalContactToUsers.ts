import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add External Contact Fields to Users
 *
 * Work Order: WO-NETURE-EXTERNAL-CONTACT-V1
 *
 * 사용자가 외부 연락 수단(카카오톡)을 선택적으로 등록할 수 있도록 합니다.
 * - contactEnabled: 외부 연락 허용 여부 (기본값 false)
 * - kakaoOpenChatUrl: 카카오 오픈채팅 URL
 * - kakaoChannelUrl: 카카오 채널 URL
 */
export class AddExternalContactToUsers2025011100001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist
    const table = await queryRunner.getTable('users');

    if (!table?.findColumnByName('contact_enabled')) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "contact_enabled" boolean NOT NULL DEFAULT false
      `);
    }

    if (!table?.findColumnByName('kakao_open_chat_url')) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "kakao_open_chat_url" varchar(500) NULL
      `);
    }

    if (!table?.findColumnByName('kakao_channel_url')) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "kakao_channel_url" varchar(500) NULL
      `);
    }

    console.log('Added external contact fields to users table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "contact_enabled"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "kakao_open_chat_url"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "kakao_channel_url"`);

    console.log('Removed external contact fields from users table');
  }
}
