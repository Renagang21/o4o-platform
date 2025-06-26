console.log('🔥 Starting simple test...');

const express = require('express');
const app = express();
const port = 4001;

app.get('/test', (req, res) => {
  res.json({ message: 'Simple test working!', timestamp: new Date().toISOString() });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Simple server running on http://localhost:${port}`);
}).on('error', (err) => {
  console.error('❌ Server error:', err);
});