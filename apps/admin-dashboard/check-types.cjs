const { execSync } = require('child_process');
const path = require('path');

const tscPath = path.join(__dirname, '../../node_modules/.bin/tsc');

try {
  execSync(`${tscPath} --noEmit`, {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('✅ TypeScript check passed');
} catch (error) {
  console.error('❌ TypeScript check failed');
  process.exit(1);
}