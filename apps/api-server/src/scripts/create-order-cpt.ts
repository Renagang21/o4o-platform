import 'reflect-metadata';
import { AppDataSource } from '../database/connection.js';
import { CustomPostType } from '../entities/CustomPostType.js';
import { ACFFieldGroup } from '../entities/ACFFieldGroup.js';
import { ACFField } from '../entities/ACFField.js';

async function createOrderCPT() {
  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();
    console.log('Database connected successfully\n');

    // Transaction으로 CPT와 ACF를 함께 생성
    await AppDataSource.manager.transaction(async (transactionalEntityManager) => {

      // 1. Order CPT 생성
      console.log('=== Creating Order Custom Post Type ===');

      // 기존 CPT 확인
      let orderCPT = await transactionalEntityManager.findOne(CustomPostType, {
        where: { slug: 'order' }
      });

      if (!orderCPT) {
        orderCPT = transactionalEntityManager.create(CustomPostType, {
          slug: 'order',
          name: 'Orders',
          description: '주문 관리를 위한 Custom Post Type',
          icon: 'shopping-cart',
          active: true,
          public: false, // 관리자만 접근 가능
          hasArchive: true,
          showInMenu: true,
          supports: ['title', 'editor', 'author', 'custom-fields'],
          taxonomies: [],
          labels: {
            name: '주문',
            singular_name: '주문',
            menu_name: '주문 관리',
            add_new: '새 주문 추가',
            add_new_item: '새 주문 추가',
            edit_item: '주문 수정',
            new_item: '새 주문',
            view_item: '주문 보기',
            search_items: '주문 검색',
            not_found: '주문을 찾을 수 없습니다',
            not_found_in_trash: '휴지통에 주문이 없습니다'
          },
          menuPosition: 5,
          capabilityType: 'post',
          rewrite: {
            slug: 'orders',
            with_front: false
          }
        });

        orderCPT = await transactionalEntityManager.save(CustomPostType, orderCPT);
        console.log('✅ Order CPT created successfully');
      } else {
        console.log('⚠️ Order CPT already exists');
      }

      // 2. ACF Field Group 생성
      console.log('\n=== Creating ACF Field Groups ===');

      // 2-1. 주문 기본 정보 Field Group
      let orderBasicGroup = await transactionalEntityManager.findOne(ACFFieldGroup, {
        where: { key: 'field_group_order_basic' }
      });

      if (!orderBasicGroup) {
        orderBasicGroup = transactionalEntityManager.create(ACFFieldGroup, {
          title: '주문 기본 정보',
          key: 'field_group_order_basic',
          description: '주문의 기본 정보를 관리합니다',
          isActive: true,
          position: 'normal',
          style: 'default',
          labelPlacement: 'top',
          instructionPlacement: 'label',
          location: [
            {
              rules: [
                {
                  param: 'post_type',
                  operator: '==',
                  value: 'order'
                }
              ]
            }
          ],
          menuOrder: 0,
          hideOnScreen: []
        });
        orderBasicGroup = await transactionalEntityManager.save(ACFFieldGroup, orderBasicGroup);
        console.log('✅ Order Basic Info Field Group created');

        // 기본 정보 필드들 생성
        const basicFields = [
          {
            slug: 'order_number',
            name: '주문 번호',
            fieldType: 'text',
            required: true,
            placeholder: 'ORD-20251111-0001',
            order: 1
          },
          {
            slug: 'buyer_id',
            name: '구매자 ID',
            fieldType: 'text',
            required: true,
            order: 2
          },
          {
            slug: 'buyer_name',
            name: '구매자 이름',
            fieldType: 'text',
            required: true,
            order: 3
          },
          {
            slug: 'buyer_email',
            name: '구매자 이메일',
            fieldType: 'email',
            required: true,
            order: 4
          },
          {
            slug: 'order_status',
            name: '주문 상태',
            fieldType: 'select',
            required: true,
            options: {
              pending: '대기중',
              confirmed: '확인됨',
              processing: '처리중',
              shipped: '배송중',
              delivered: '배송완료',
              cancelled: '취소됨',
              returned: '반품됨'
            },
            defaultValue: 'pending',
            order: 5
          },
          {
            slug: 'payment_status',
            name: '결제 상태',
            fieldType: 'select',
            required: true,
            options: {
              pending: '대기중',
              completed: '완료',
              failed: '실패',
              refunded: '환불됨'
            },
            defaultValue: 'pending',
            order: 6
          },
          {
            slug: 'payment_method',
            name: '결제 방법',
            fieldType: 'select',
            options: {
              card: '신용카드',
              transfer: '계좌이체',
              virtual_account: '가상계좌',
              kakao_pay: '카카오페이',
              naver_pay: '네이버페이',
              cash_on_delivery: '착불'
            },
            order: 7
          }
        ];

        for (const fieldData of basicFields) {
          const field = transactionalEntityManager.create(ACFField, {
            ...fieldData,
            fieldGroupId: orderBasicGroup.id
          });
          await transactionalEntityManager.save(ACFField, field);
        }
        console.log(`  - Created ${basicFields.length} basic fields`);
      }

      // 2-2. 주문 상품 정보 Field Group
      let orderItemsGroup = await transactionalEntityManager.findOne(ACFFieldGroup, {
        where: { slug: 'order-items-info' }
      });

      if (!orderItemsGroup) {
        orderItemsGroup = transactionalEntityManager.create(ACFFieldGroup, {
          slug: 'order-items-info',
          name: '주문 상품 정보',
          description: '주문한 상품들의 정보를 관리합니다',
          active: true,
          position: 'normal',
          style: 'default',
          location: [
            {
              param: 'post_type',
              operator: '==',
              value: 'order'
            }
          ]
        });
        orderItemsGroup = await transactionalEntityManager.save(ACFFieldGroup, orderItemsGroup);
        console.log('✅ Order Items Field Group created');

        // 상품 정보 필드들 생성
        const itemFields = [
          {
            slug: 'order_items',
            name: '주문 상품',
            fieldType: 'repeater',
            subFields: [
              { name: 'product_id', label: '상품 ID', type: 'text' },
              { name: 'product_name', label: '상품명', type: 'text' },
              { name: 'product_sku', label: 'SKU', type: 'text' },
              { name: 'quantity', label: '수량', type: 'number' },
              { name: 'unit_price', label: '단가', type: 'number' },
              { name: 'total_price', label: '총액', type: 'number' }
            ],
            order: 1
          },
          {
            slug: 'order_subtotal',
            name: '소계',
            fieldType: 'number',
            required: true,
            order: 2
          },
          {
            slug: 'order_discount',
            name: '할인액',
            fieldType: 'number',
            defaultValue: '0',
            order: 3
          },
          {
            slug: 'order_shipping',
            name: '배송비',
            fieldType: 'number',
            defaultValue: '0',
            order: 4
          },
          {
            slug: 'order_tax',
            name: '세금',
            fieldType: 'number',
            defaultValue: '0',
            order: 5
          },
          {
            slug: 'order_total',
            name: '총 결제금액',
            fieldType: 'number',
            required: true,
            order: 6
          }
        ];

        for (const fieldData of itemFields) {
          const field = transactionalEntityManager.create(ACFField, {
            ...fieldData,
            fieldGroupId: orderItemsGroup.id
          });
          await transactionalEntityManager.save(ACFField, field);
        }
        console.log(`  - Created ${itemFields.length} item fields`);
      }

      // 2-3. 배송 정보 Field Group
      let shippingGroup = await transactionalEntityManager.findOne(ACFFieldGroup, {
        where: { slug: 'order-shipping-info' }
      });

      if (!shippingGroup) {
        shippingGroup = transactionalEntityManager.create(ACFFieldGroup, {
          slug: 'order-shipping-info',
          name: '배송 정보',
          description: '주문의 배송 정보를 관리합니다',
          active: true,
          position: 'normal',
          style: 'default',
          location: [
            {
              param: 'post_type',
              operator: '==',
              value: 'order'
            }
          ]
        });
        shippingGroup = await transactionalEntityManager.save(ACFFieldGroup, shippingGroup);
        console.log('✅ Shipping Info Field Group created');

        // 배송 정보 필드들 생성
        const shippingFields = [
          {
            slug: 'recipient_name',
            name: '수령인 이름',
            fieldType: 'text',
            required: true,
            order: 1
          },
          {
            slug: 'recipient_phone',
            name: '수령인 전화번호',
            fieldType: 'text',
            required: true,
            order: 2
          },
          {
            slug: 'shipping_zipcode',
            name: '우편번호',
            fieldType: 'text',
            required: true,
            order: 3
          },
          {
            slug: 'shipping_address',
            name: '주소',
            fieldType: 'text',
            required: true,
            order: 4
          },
          {
            slug: 'shipping_detail_address',
            name: '상세주소',
            fieldType: 'text',
            order: 5
          },
          {
            slug: 'delivery_request',
            name: '배송 요청사항',
            fieldType: 'textarea',
            rows: 3,
            order: 6
          },
          {
            slug: 'tracking_number',
            name: '송장번호',
            fieldType: 'text',
            order: 7
          },
          {
            slug: 'shipping_carrier',
            name: '택배사',
            fieldType: 'select',
            options: {
              cj: 'CJ대한통운',
              hanjin: '한진택배',
              lotte: '롯데택배',
              post: '우체국택배',
              logen: '로젠택배'
            },
            order: 8
          }
        ];

        for (const fieldData of shippingFields) {
          const field = transactionalEntityManager.create(ACFField, {
            ...fieldData,
            fieldGroupId: shippingGroup.id
          });
          await transactionalEntityManager.save(ACFField, field);
        }
        console.log(`  - Created ${shippingFields.length} shipping fields`);
      }

      console.log('\n✅ Order CPT and ACF setup completed successfully!');
    });

    // 3. 검증
    console.log('\n=== Verifying Created Structures ===');

    const cptRepo = AppDataSource.getRepository(CustomPostType);
    const fieldGroupRepo = AppDataSource.getRepository(ACFFieldGroup);
    const fieldRepo = AppDataSource.getRepository(ACFField);

    const orderCPT = await cptRepo.findOne({ where: { slug: 'order' } });
    const fieldGroups = await fieldGroupRepo.find({
      where: { location: { param: 'post_type', value: 'order' } as any }
    });
    const fields = await fieldRepo.count();

    console.log(`\n📋 Created Structures:`);
    console.log(`  - CPT: ${orderCPT ? 'Order CPT' : 'None'}`);
    console.log(`  - Field Groups: ${fieldGroups.length}`);
    console.log(`  - Total Fields: ${fields}`);

    await AppDataSource.destroy();

  } catch (error) {
    console.error('Error creating Order CPT:', error);
    process.exit(1);
  }
}

createOrderCPT();