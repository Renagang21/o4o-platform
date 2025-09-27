const { DataSource } = require('typeorm');
require('dotenv').config({ path: '../.env' });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'o4o',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'o4o_platform',
  synchronize: false,
  logging: false,
});

async function updateOrderPayments() {
  try {
    await dataSource.initialize();
    console.log('Database connected');

    // Get all orders
    const orders = await dataSource.query(
      "SELECT id, meta_data, created_at FROM custom_posts WHERE cpt_slug = 'ds_order' ORDER BY id"
    );

    console.log(`Found ${orders.length} orders to update`);

    // Update each order with payment information
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const metaData = order.meta_data || {};
      
      // Last 3 orders are unpaid, rest are paid
      const isPaid = i < orders.length - 3;
      
      // 60% card, 40% cash for paid orders
      let paymentMethod = metaData.payment_method || 'card';
      if (isPaid) {
        paymentMethod = Math.random() < 0.6 ? 'card' : 'cash';
      }
      
      // Add payment information
      metaData.payment_status = isPaid ? 'paid' : 'unpaid';
      metaData.payment_method = paymentMethod;
      
      if (isPaid) {
        // Add payment date (30 minutes after order creation)
        const orderDate = new Date(order.created_at);
        const paymentDate = new Date(orderDate.getTime() + 30 * 60 * 1000);
        metaData.payment_date = paymentDate.toISOString();
        
        // Add transaction ID for card payments
        if (paymentMethod === 'card') {
          metaData.transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          metaData.card_last_four = Math.floor(1000 + Math.random() * 9000).toString();
          metaData.card_type = ['Visa', 'MasterCard', 'Amex'][Math.floor(Math.random() * 3)];
        } else {
          metaData.cash_receipt_number = `CASH-${Date.now()}-${i}`;
        }
      }
      
      // Update the order
      await dataSource.query(
        "UPDATE custom_posts SET meta_data = $1 WHERE id = $2",
        [JSON.stringify(metaData), order.id]
      );
    }

    // Show summary
    const summary = await dataSource.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE meta_data->>'payment_status' = 'paid') as paid,
        COUNT(*) FILTER (WHERE meta_data->>'payment_status' = 'unpaid') as unpaid,
        COUNT(*) FILTER (WHERE meta_data->>'payment_method' = 'card') as card,
        COUNT(*) FILTER (WHERE meta_data->>'payment_method' = 'cash') as cash
      FROM custom_posts 
      WHERE cpt_slug = 'ds_order'
    `);

    console.log('\n=== Order Payment Update Summary ===');
    console.log(`Total orders: ${summary[0].total}`);
    console.log(`Paid orders: ${summary[0].paid}`);
    console.log(`Unpaid orders: ${summary[0].unpaid}`);
    console.log(`Card payments: ${summary[0].card}`);
    console.log(`Cash payments: ${summary[0].cash}`);

    // Show sample updated orders
    const samples = await dataSource.query(`
      SELECT 
        id, 
        title,
        meta_data->>'payment_status' as payment_status,
        meta_data->>'payment_method' as payment_method,
        meta_data->>'payment_date' as payment_date,
        meta_data->>'transaction_id' as transaction_id
      FROM custom_posts 
      WHERE cpt_slug = 'ds_order'
      ORDER BY id DESC
      LIMIT 5
    `);

    console.log('\n=== Sample Orders ===');
    samples.forEach(order => {
      console.log(`Order #${order.id}:`);
      console.log(`  Status: ${order.payment_status}`);
      console.log(`  Method: ${order.payment_method}`);
      if (order.payment_date) {
        console.log(`  Paid at: ${order.payment_date}`);
      }
      if (order.transaction_id) {
        console.log(`  Transaction: ${order.transaction_id}`);
      }
      console.log('');
    });

    await dataSource.destroy();
    console.log('✅ Order payments updated successfully!');
  } catch (error) {
    console.error('Error updating order payments:', error);
    process.exit(1);
  }
}

updateOrderPayments();