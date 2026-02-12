import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-PLATFORM-PHONE-NORMALIZATION-PHASE7-V1
 * 플랫폼 전체 전화번호 정규화: 숫자만 저장
 * 기존 데이터에서 하이픈, 공백, 괄호 등 비숫자 문자 제거
 *
 * NOTE: Some tables may not exist yet depending on migration order.
 * Each UPDATE is wrapped in a safe helper that skips missing tables.
 */
export class NormalizePhoneNumbers1739700000000 implements MigrationInterface {
  name = 'NormalizePhoneNumbers1739700000000';

  private async safeUpdate(queryRunner: QueryRunner, sql: string): Promise<void> {
    try {
      await queryRunner.query(sql);
    } catch (error: any) {
      // Skip if table or column does not exist (42P01, 42703)
      if (error.code === '42P01' || error.code === '42703') {
        console.log(`[NormalizePhoneNumbers] Skipping (table/column not found): ${error.message}`);
        return;
      }
      throw error;
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // === Core ===
    await this.safeUpdate(queryRunner, `
      UPDATE "users"
      SET phone = regexp_replace(phone, '\\D', '', 'g')
      WHERE phone IS NOT NULL AND phone ~ '\\D'
    `);

    // === KPA ===
    await this.safeUpdate(queryRunner, `
      UPDATE "kpa_organizations"
      SET phone = regexp_replace(phone, '\\D', '', 'g')
      WHERE phone IS NOT NULL AND phone ~ '\\D'
    `);
    await this.safeUpdate(queryRunner, `
      UPDATE "kpa_branch_officers"
      SET phone = regexp_replace(phone, '\\D', '', 'g')
      WHERE phone IS NOT NULL AND phone ~ '\\D'
    `);
    await this.safeUpdate(queryRunner, `
      UPDATE "kpa_branch_settings"
      SET phone = regexp_replace(phone, '\\D', '', 'g')
      WHERE phone IS NOT NULL AND phone ~ '\\D'
    `);
    await this.safeUpdate(queryRunner, `
      UPDATE "kpa_branch_settings"
      SET fax = regexp_replace(fax, '\\D', '', 'g')
      WHERE fax IS NOT NULL AND fax ~ '\\D'
    `);

    // === Neture ===
    await this.safeUpdate(queryRunner, `
      UPDATE "neture_orders"
      SET orderer_phone = regexp_replace(orderer_phone, '\\D', '', 'g')
      WHERE orderer_phone IS NOT NULL AND orderer_phone ~ '\\D'
    `);
    await this.safeUpdate(queryRunner, `
      UPDATE "neture_suppliers"
      SET contact_phone = regexp_replace(contact_phone, '\\D', '', 'g')
      WHERE contact_phone IS NOT NULL AND contact_phone ~ '\\D'
    `);
    await this.safeUpdate(queryRunner, `
      UPDATE "neture_partnership_requests"
      SET contact_phone = regexp_replace(contact_phone, '\\D', '', 'g')
      WHERE contact_phone IS NOT NULL AND contact_phone ~ '\\D'
    `);
    await this.safeUpdate(queryRunner, `
      UPDATE "neture_supplier_requests"
      SET seller_phone = regexp_replace(seller_phone, '\\D', '', 'g')
      WHERE seller_phone IS NOT NULL AND seller_phone ~ '\\D'
    `);

    // === GlycoPharm ===
    await this.safeUpdate(queryRunner, `
      UPDATE "glycopharm_pharmacies"
      SET phone = regexp_replace(phone, '\\D', '', 'g')
      WHERE phone IS NOT NULL AND phone ~ '\\D'
    `);

    // === GlucoseView ===
    await this.safeUpdate(queryRunner, `
      UPDATE "glucoseview_pharmacists"
      SET phone = regexp_replace(phone, '\\D', '', 'g')
      WHERE phone IS NOT NULL AND phone ~ '\\D'
    `);
    await this.safeUpdate(queryRunner, `
      UPDATE "glucoseview_customers"
      SET phone = regexp_replace(phone, '\\D', '', 'g')
      WHERE phone IS NOT NULL AND phone ~ '\\D'
    `);

    // === Supplier (core) ===
    await this.safeUpdate(queryRunner, `
      UPDATE "suppliers"
      SET contact_phone = regexp_replace(contact_phone, '\\D', '', 'g')
      WHERE contact_phone IS NOT NULL AND contact_phone ~ '\\D'
    `);

    // === Cosmetics ===
    await this.safeUpdate(queryRunner, `
      UPDATE "cosmetics_supplier_profiles"
      SET contact_phone = regexp_replace(contact_phone, '\\D', '', 'g')
      WHERE contact_phone IS NOT NULL AND contact_phone ~ '\\D'
    `);
    await this.safeUpdate(queryRunner, `
      UPDATE "cosmetics_sample_supply"
      SET recipient_phone = regexp_replace(recipient_phone, '\\D', '', 'g')
      WHERE recipient_phone IS NOT NULL AND recipient_phone ~ '\\D'
    `);

    // === JSONB phone fields ===
    // Neture orders: shipping->phone
    await this.safeUpdate(queryRunner, `
      UPDATE "neture_orders"
      SET shipping = jsonb_set(shipping, '{phone}',
        to_jsonb(regexp_replace(shipping->>'phone', '\\D', '', 'g')))
      WHERE shipping IS NOT NULL
        AND shipping->>'phone' IS NOT NULL
        AND shipping->>'phone' ~ '\\D'
    `);

    // Neture partners: contact->phone
    await this.safeUpdate(queryRunner, `
      UPDATE "neture_partners"
      SET contact = jsonb_set(contact, '{phone}',
        to_jsonb(regexp_replace(contact->>'phone', '\\D', '', 'g')))
      WHERE contact IS NOT NULL
        AND contact->>'phone' IS NOT NULL
        AND contact->>'phone' ~ '\\D'
    `);

    // E-commerce orders: shipping_address->phone
    await this.safeUpdate(queryRunner, `
      UPDATE "checkout_orders"
      SET shipping_address = jsonb_set(shipping_address, '{phone}',
        to_jsonb(regexp_replace(shipping_address->>'phone', '\\D', '', 'g')))
      WHERE shipping_address IS NOT NULL
        AND shipping_address->>'phone' IS NOT NULL
        AND shipping_address->>'phone' ~ '\\D'
    `);

    // Ecommerce orders: shipping_address->phone
    await this.safeUpdate(queryRunner, `
      UPDATE "ecommerce_orders"
      SET shipping_address = jsonb_set(shipping_address, '{phone}',
        to_jsonb(regexp_replace(shipping_address->>'phone', '\\D', '', 'g')))
      WHERE shipping_address IS NOT NULL
        AND shipping_address->>'phone' IS NOT NULL
        AND shipping_address->>'phone' ~ '\\D'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 비가역 — 원본 포맷 복원 불가
    // 숫자만 남아있는 상태가 정상 기준이므로 down은 no-op
  }
}
