const { Client } = require('pg');

async function checkPosts() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'o4o_dev'
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check posts table
    const result = await client.query(`
      SELECT id, title, slug, status, type, created_at 
      FROM posts 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n=== Recent Posts in Database ===');
    console.log('Total posts found:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('\nPost details:');
      result.rows.forEach((post, index) => {
        console.log(`\n${index + 1}. Post ID: ${post.id}`);
        console.log(`   Title: ${post.title || '(no title)'}`);
        console.log(`   Slug: ${post.slug}`);
        console.log(`   Status: ${post.status}`);
        console.log(`   Type: ${post.type}`);
        console.log(`   Created: ${post.created_at}`);
      });
    } else {
      console.log('No posts found in the database');
    }
    
  } catch (err) {
    console.error('Database error:', err.message);
  } finally {
    await client.end();
  }
}

checkPosts();