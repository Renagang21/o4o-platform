const axios = require('axios');

// Admin credentials (adjust if needed)
const LOGIN_URL = 'http://localhost:3001/api/auth/login';
const TEMPLATE_PARTS_URL = 'http://localhost:3001/api/template-parts';

async function debugTemplateParts() {
  try {
    console.log('🔐 Logging in as admin...');

    // Login to get token
    const loginResponse = await axios.post(LOGIN_URL, {
      email: 'admin@example.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');

    // Fetch template parts
    console.log('\n📡 Fetching template parts...');
    const response = await axios.get(TEMPLATE_PARTS_URL, {
      params: {
        area: 'header',
        isActive: 'all'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('\n📋 Template Parts Found:', response.data.length);

    response.data.forEach((part, index) => {
      console.log(`\n--- Template Part ${index + 1} ---`);
      console.log('ID:', part.id);
      console.log('Name:', part.name);
      console.log('Slug:', part.slug);
      console.log('Area:', part.area);
      console.log('Is Default:', part.isDefault);
      console.log('Is Active:', part.isActive);

      // Check logo in content
      if (part.content && Array.isArray(part.content)) {
        const headerContainer = part.content[0];
        if (headerContainer?.innerBlocks) {
          const siteLogo = headerContainer.innerBlocks.find(block => block.type === 'core/site-logo');
          if (siteLogo) {
            console.log('\n🖼️  LOGO FOUND:');
            console.log('  - Logo URL:', siteLogo.data?.logoUrl || 'NOT SET');
            console.log('  - Width:', siteLogo.data?.width);
            console.log('  - Is Link:', siteLogo.data?.isLink);
          } else {
            console.log('\n⚠️  No site-logo block found');
          }
        }
      }

      console.log('\nFull Content:');
      console.log(JSON.stringify(part.content, null, 2));
    });

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

debugTemplateParts();
