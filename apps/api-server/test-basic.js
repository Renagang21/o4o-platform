console.log('🔥 Test basic start');
console.log('✅ Console.log is working');
console.log('📍 Working directory:', process.cwd());
console.log('🌐 Node version:', process.version);
console.log('💻 Platform:', process.platform);

// Express 로드 테스트
try {
  const express = require('express');
  console.log('✅ Express loaded successfully');
  
  const app = express();
  const port = 4001;
  
  app.get('/test', (req, res) => {
    res.json({ message: 'Basic test working!' });
  });
  
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Test server running on http://localhost:${port}`);
  });
  
  server.on('error', (err) => {
    console.error('❌ Server error:', err);
  });
  
  // 5초 후 자동 종료
  setTimeout(() => {
    console.log('⏰ Shutting down after 5 seconds');
    server.close();
    process.exit(0);
  }, 5000);
  
} catch (error) {
  console.error('❌ Error:', error);
}