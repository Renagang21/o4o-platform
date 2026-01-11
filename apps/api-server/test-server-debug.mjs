// Debug wrapper to find exact hanging point in main.ts

console.log('[DEBUG] Starting main.ts import...');

try {
  console.log('[DEBUG] Importing main.ts module...');
  const startTime = Date.now();

  // This will execute all top-level code in main.ts
  await import('./src/main.ts');

  const elapsed = Date.now() - startTime;
  console.log(`[DEBUG] main.ts imported successfully in ${elapsed}ms`);
  console.log('[DEBUG] Server should be starting now...');

  // Wait for server to initialize
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('[DEBUG] Waited 5 seconds for server initialization');

} catch (error) {
  console.error('[DEBUG] Error during import:', error);
  process.exit(1);
}
