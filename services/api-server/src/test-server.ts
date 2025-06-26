console.log('🔥 Starting test server...');

import express from 'express';

const app = express();
const port = 4000;

app.get('/test', (req, res) => {
  res.json({ message: 'Test server working!', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`✅ Test server running on http://localhost:${port}`);
  console.log(`🧪 Test endpoint: http://localhost:${port}/test`);
});