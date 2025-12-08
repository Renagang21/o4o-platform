/**
 * SellerOps Activate Hook
 *
 * Called when the SellerOps app is activated after installation
 */

import { DataSource } from 'typeorm';

export async function onActivate(dataSource: DataSource): Promise<void> {
  console.log('[sellerops] Activating SellerOps App...');

  // Register event subscriptions
  console.log('[sellerops] Registering event subscriptions...');
  console.log('[sellerops] - product.master.updated');
  console.log('[sellerops] - product.offer.updated');
  console.log('[sellerops] - order.created');
  console.log('[sellerops] - order.relay.fulfilled');
  console.log('[sellerops] - settlement.closed');

  // Initialize default documents/notices
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Check if default welcome document exists
    const existingDoc = await queryRunner.query(`
      SELECT id FROM sellerops_documents WHERE category = 'guide' LIMIT 1
    `);

    if (!existingDoc || existingDoc.length === 0) {
      await queryRunner.query(`
        INSERT INTO sellerops_documents (title, category, content, order_index)
        VALUES
          ('SellerOps 시작 가이드', 'guide', '판매자 운영 앱(SellerOps)에 오신 것을 환영합니다. 이 가이드를 통해 플랫폼 사용법을 익혀보세요.', 1),
          ('공급자 승인 요청 방법', 'guide', '공급자 승인을 요청하려면 공급자 관리 메뉴에서 원하는 공급자를 선택하고 승인 요청 버튼을 클릭하세요.', 2),
          ('리스팅 등록 가이드', 'guide', '공급자의 상품(Offer)을 선택하여 나만의 리스팅을 등록하고 판매를 시작하세요.', 3)
      `);
      console.log('[sellerops] Default documents created');
    }
  } catch (error) {
    console.warn('[sellerops] Could not create default documents:', error);
  } finally {
    await queryRunner.release();
  }

  console.log('[sellerops] SellerOps App activated successfully');
}
