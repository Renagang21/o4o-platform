// Minimal test to find where main.ts hangs
// Tests each import from main.ts sequentially

import 'dotenv/config';

const testImport = async (name, importFn) => {
  console.log(`Loading: ${name}...`);
  const start = Date.now();
  try {
    await importFn();
    console.log(`  ✅ ${name} loaded (${Date.now() - start}ms)`);
    return true;
  } catch (e) {
    console.log(`  ❌ ${name} FAILED: ${e.message}`);
    return false;
  }
};

console.log('=== Testing main.ts imports sequentially ===\n');

// Group 1: Core utilities
await testImport('env-loader', () => import('./dist/env-loader.js'));
await testImport('telemetry', () => import('./dist/utils/telemetry.js'));
await testImport('reflect-metadata', () => import('reflect-metadata'));
await testImport('express', () => import('express'));
await testImport('env-validator', () => import('./dist/utils/env-validator.js'));
await testImport('logger', () => import('./dist/utils/logger.js'));

// Group 2: Middleware
await testImport('performanceMonitor', () => import('./dist/middleware/performanceMonitor.js'));
await testImport('securityMiddleware', () => import('./dist/middleware/securityMiddleware.js'));
await testImport('tenant-context.middleware', () => import('./dist/middleware/tenant-context.middleware.js'));

// Group 3: Services
await testImport('startup.service', () => import('./dist/services/startup.service.js'));
await testImport('sessionSyncService', () => import('./dist/services/sessionSyncService.js'));
await testImport('websocket/sessionSync', () => import('./dist/websocket/sessionSync.js'));

// Group 4: Config
await testImport('swagger-enhanced', () => import('./dist/config/swagger-enhanced.js'));
await testImport('passportDynamic', () => import('./dist/config/passportDynamic.js'));

// Group 5: Module loader and DB
await testImport('module-loader', () => import('./dist/modules/module-loader.js'));
await testImport('database/connection', () => import('./dist/database/connection.js'));

// Group 6: Routes
await testImport('appstore.routes', () => import('./dist/routes/appstore.routes.js'));
await testImport('navigation.routes', () => import('./dist/routes/navigation.routes.js'));
await testImport('routes.routes', () => import('./dist/routes/routes.routes.js'));
await testImport('service-provisioning.routes', () => import('./dist/routes/service-provisioning.routes.js'));
await testImport('service-admin.routes', () => import('./dist/routes/service-admin.routes.js'));
await testImport('public.routes', () => import('./dist/routes/public.routes.js'));
await testImport('user-role.routes', () => import('./dist/routes/user-role.routes.js'));
await testImport('organization.routes', () => import('./dist/routes/organization.routes.js'));
await testImport('linked-accounts', () => import('./dist/routes/linked-accounts.js'));

// Group 7: Registries
await testImport('template-registry', () => import('./dist/service-templates/template-registry.js'));
await testImport('init-pack-registry', () => import('./dist/service-templates/init-pack-registry.js'));

console.log('\n=== All imports tested ===');
process.exit(0);
