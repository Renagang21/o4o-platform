import 'reflect-metadata';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'o4o_platform',
  user: 'postgres',
  password: 'postgres',
  ssl: false
});

async function createOrderCPT() {
  try {
    console.log('Creating Order CPT...\n');

    // 1. Custom Post Type 생성
    console.log('=== Creating Order CPT ===');

    const existingCPT = await pool.query(
      `SELECT id FROM custom_post_types WHERE slug = 'order'`
    );

    if (existingCPT.rows.length === 0) {
      const labels = {
        name: '주문',
        singular_name: '주문',
        menu_name: '주문 관리',
        add_new: '새 주문 추가',
        add_new_item: '새 주문 추가',
        edit_item: '주문 수정',
        new_item: '새 주문',
        view_item: '주문 보기',
        search_items: '주문 검색',
        not_found: '주문을 찾을 수 없습니다'
      };

      await pool.query(`
        INSERT INTO custom_post_types (
          id, slug, name, description, icon, active,
          public, has_archive, show_in_menu, supports,
          taxonomies, labels, menu_position, capability_type,
          rewrite, "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), 'order', '주문', '주문 관리를 위한 CPT',
          'shopping-cart', true, false, true, true,
          '["title", "editor", "author", "custom-fields"]'::json,
          '[]'::json, $1::json, 5, 'post',
          '{"slug": "orders", "with_front": false}'::json,
          NOW(), NOW()
        )
      `, [JSON.stringify(labels)]);

      console.log('✅ Order CPT created successfully');
    } else {
      console.log('⚠️ Order CPT already exists');
    }

    // 2. ACF Field Groups 생성
    console.log('\n=== Creating ACF Field Groups ===');

    // 2-1. 주문 기본 정보 Field Group
    const existingGroup = await pool.query(
      `SELECT id FROM acf_field_groups WHERE key = 'field_group_order_basic'`
    );

    let groupId: string;

    if (existingGroup.rows.length === 0) {
      const location = [
        {
          rules: [
            {
              param: 'post_type',
              operator: '==',
              value: 'order'
            }
          ]
        }
      ];

      const groupResult = await pool.query(`
        INSERT INTO acf_field_groups (
          id, title, key, description, location,
          "menuOrder", position, style, "labelPlacement",
          "instructionPlacement", "hideOnScreen", "isActive",
          "created_at", "updated_at"
        ) VALUES (
          gen_random_uuid(), '주문 기본 정보', 'field_group_order_basic',
          '주문의 기본 정보를 관리합니다', $1::json,
          0, 'normal', 'default', 'top',
          false, '[]'::json, true,
          NOW(), NOW()
        ) RETURNING id
      `, [JSON.stringify(location)]);

      groupId = groupResult.rows[0].id;
      console.log('✅ Order Basic Info Field Group created');

      // 3. ACF Fields 생성
      console.log('\n=== Creating ACF Fields ===');

      const fields = [
        {
          label: '주문 번호',
          name: 'order_number',
          key: 'field_order_number',
          type: 'text',
          required: true,
          menuOrder: 1
        },
        {
          label: '구매자 ID',
          name: 'buyer_id',
          key: 'field_buyer_id',
          type: 'text',
          required: true,
          menuOrder: 2
        },
        {
          label: '구매자 이름',
          name: 'buyer_name',
          key: 'field_buyer_name',
          type: 'text',
          required: true,
          menuOrder: 3
        },
        {
          label: '구매자 이메일',
          name: 'buyer_email',
          key: 'field_buyer_email',
          type: 'email',
          required: true,
          menuOrder: 4
        },
        {
          label: '주문 상태',
          name: 'order_status',
          key: 'field_order_status',
          type: 'select',
          choices: {
            pending: '대기중',
            confirmed: '확인됨',
            processing: '처리중',
            shipped: '배송중',
            delivered: '배송완료',
            cancelled: '취소됨',
            returned: '반품됨'
          },
          defaultValue: 'pending',
          required: true,
          menuOrder: 5
        },
        {
          label: '결제 상태',
          name: 'payment_status',
          key: 'field_payment_status',
          type: 'select',
          choices: {
            pending: '대기중',
            completed: '완료',
            failed: '실패',
            refunded: '환불됨'
          },
          defaultValue: 'pending',
          required: true,
          menuOrder: 6
        },
        {
          label: '결제 방법',
          name: 'payment_method',
          key: 'field_payment_method',
          type: 'select',
          choices: {
            card: '신용카드',
            transfer: '계좌이체',
            virtual_account: '가상계좌',
            kakao_pay: '카카오페이',
            naver_pay: '네이버페이'
          },
          menuOrder: 7
        },
        {
          label: '총 결제금액',
          name: 'order_total',
          key: 'field_order_total',
          type: 'number',
          required: true,
          menuOrder: 8
        }
      ];

      for (const field of fields) {
        const validation = {
          required: field.required || false
        };

        await pool.query(`
          INSERT INTO acf_fields (
            id, "fieldGroupId", label, name, key, type,
            required, "defaultValue", choices,
            "created_at", "updated_at"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5,
            $6, $7, $8::json,
            NOW(), NOW()
          )
        `, [
          groupId,
          field.label,
          field.name,
          field.key,
          field.type,
          field.required || false,
          field.defaultValue || null,
          field.choices ? JSON.stringify(field.choices) : null
        ]);
      }

      console.log(`✅ Created ${fields.length} fields`);
    } else {
      console.log('⚠️ Field Group already exists');
    }

    // 4. 기존 주문 데이터를 CPT로 마이그레이션
    console.log('\n=== Migrating Orders to CPT ===');

    const orders = await pool.query(`
      SELECT * FROM orders
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    if (orders.rows.length > 0) {
      const cptResult = await pool.query(
        `SELECT id FROM custom_post_types WHERE slug = 'order'`
      );

      if (cptResult.rows.length > 0) {
        const postTypeId = cptResult.rows[0].id;
        let migratedCount = 0;

        for (const order of orders.rows) {
          // Check if already migrated
          const existingPost = await pool.query(
            `SELECT id FROM custom_posts WHERE slug = $1`,
            [order.orderNumber]
          );

          if (existingPost.rows.length === 0) {
            // Create custom post
            const postResult = await pool.query(`
              INSERT INTO custom_posts (
                id, cpt_slug, title, slug, content,
                status, author_id, fields, published_at,
                created_at, updated_at
              ) VALUES (
                gen_random_uuid(), 'order', $1, $2, $3,
                'publish', $4, $5::jsonb, $6,
                $6, NOW()
              ) RETURNING id
            `, [
              `주문 #${order.orderNumber}`,
              order.orderNumber,
              `주문 번호: ${order.orderNumber}\n구매자: ${order.buyerName}`,
              order.buyerId,
              {
                order_number: order.orderNumber,
                buyer_id: order.buyerId,
                buyer_name: order.buyerName,
                buyer_email: order.buyerEmail,
                order_status: order.status,
                payment_status: order.paymentStatus,
                payment_method: order.paymentMethod,
                order_total: order.summary?.total || 0,
                order_items: order.items
              },
              order.orderDate || order.createdAt
            ]);

            migratedCount++;
          }
        }

        console.log(`✅ Migrated ${migratedCount} orders to CPT`);
      }
    } else {
      console.log('⚠️ No orders found to migrate');
    }

    // 5. 검증
    console.log('\n=== Verification ===');

    const cptCount = await pool.query(
      `SELECT COUNT(*) FROM custom_post_types WHERE slug = 'order'`
    );
    const fieldGroupCount = await pool.query(
      `SELECT COUNT(*) FROM acf_field_groups WHERE key LIKE 'field_group_order%'`
    );
    const fieldCount = await pool.query(
      `SELECT COUNT(*) FROM acf_fields WHERE key LIKE 'field_order%'`
    );
    const postCount = await pool.query(`
      SELECT COUNT(*) FROM custom_posts
      WHERE cpt_slug = 'order'
    `);

    console.log('\n📊 Summary:');
    console.log(`  - Order CPT: ${cptCount.rows[0].count}`);
    console.log(`  - Field Groups: ${fieldGroupCount.rows[0].count}`);
    console.log(`  - Fields: ${fieldCount.rows[0].count}`);
    console.log(`  - Order Posts: ${postCount.rows[0].count}`);

    console.log('\n✅ Order CPT setup completed successfully!');

  } catch (error) {
    console.error('Error creating Order CPT:', error);
  } finally {
    await pool.end();
  }
}

createOrderCPT();